
import React, { useEffect, useState, useRef } from 'react';
import { GameConfig, ExamQuestion, Theme } from '../types';
import { generateExamQuestion, validateExamAnswer, generateSpeech } from '../services/genai';
import { AuthService } from '../services/auth';
import { t } from '../utils/translations';
import VoiceInput from './VoiceInput';
import GradeDisplay from './GradeDisplay';

interface QuizGameProps {
  config: GameConfig;
  onExit: (score: number) => void;
  systemLanguage: string;
  theme: Theme;
  voiceName: string;
}

const MATH_SYMBOLS = [
    { char: '√', tooltip: 'Square Root' },
    { char: '²', tooltip: 'Squared' },
    { char: '³', tooltip: 'Cubed' },
    { char: '½', tooltip: 'Half' },
    { char: '/', tooltip: 'Fraction' },
    { char: 'π', tooltip: 'Pi' },
    { char: '∞', tooltip: 'Infinity' },
    { char: '∫', tooltip: 'Integral' },
    { char: '∑', tooltip: 'Sum' },
    { char: '≠', tooltip: 'Not Equal' },
    { char: '≈', tooltip: 'Approx' },
    { char: '≤', tooltip: 'Less/Equal' },
    { char: '≥', tooltip: 'Greater/Equal' }
];

const QuizGame: React.FC<QuizGameProps> = ({ config, onExit, systemLanguage, theme, voiceName }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState<ExamQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState<{correct: boolean, feedback: string, score: number} | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [autoRead, setAutoRead] = useState(false); 
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => { if (audioContextRef.current) audioContextRef.current.close(); };
  }, []);

  const handleStartExam = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      setHasStarted(true);
      loadQuestion();
  }

  const handleEarlyExit = () => {
      if (window.confirm(t('exitConfirm', systemLanguage))) {
          setIsFinished(true);
      }
  }

  const playAudio = (text: string) => {
      if (!audioContextRef.current || !text) return;
      
      generateSpeech(text, voiceName).then(buffer => {
         if (buffer && audioContextRef.current) {
             const src = audioContextRef.current.createBufferSource();
             src.buffer = buffer;
             src.connect(audioContextRef.current.destination);
             src.start(0);
         }
      });
  }

  const loadQuestion = async () => {
    if (questionCount >= config.totalQuestions) {
        setIsFinished(true);
        return;
    }

    setLoading(true);
    setResult(null);
    setUserAnswer('');
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // REVIEW MODE: If static questions provided, use them
    if (config.staticQuestions && config.staticQuestions.length > questionCount) {
        const staticQ = config.staticQuestions[questionCount];
        setCurrentQ(staticQ);
        setLoading(false);
        if (staticQ.question && autoRead) {
            playAudio(staticQ.question);
        }
        return;
    }

    const specificTopic = config.examPlan ? config.examPlan[questionCount] : undefined;

    const q = await generateExamQuestion(
        config.studyMaterial, 
        config.difficulty, 
        config.language, 
        config.examFormat,
        questionCount,
        config.totalQuestions,
        specificTopic
    );
    
    if (specificTopic) q.topic = specificTopic;
    else if (!q.topic) q.topic = "General";

    setCurrentQ(q);
    setLoading(false);

    if (q.question && autoRead) {
        playAudio(q.question);
    }
  };

  const insertSymbol = (char: string) => {
      setUserAnswer(prev => prev + char);
  };
  
  const handleVoiceInput = (text: string) => {
      setUserAnswer(prev => prev + (prev ? ' ' : '') + text);
  }

  const renderStyledQuestion = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return (
          <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <span key={i} className={theme.accentColor}>{part.slice(2, -2)}</span>;
                }
                return <span key={i}>{part.replace(/\*/g, '')}</span>;
            })}
          </>
      );
  };

  const handleSubmit = async (valOverride?: string) => {
    const answerToCheck = valOverride || userAnswer;
    if ((!answerToCheck.trim() && !imageFile) || !currentQ) return;

    setValidating(true);
    
    let res = { correct: false, score: 0, feedback: "" };

    if (config.examFormat === 'test' && currentQ.options && currentQ.correctAnswerIndex !== undefined) {
        const selectedIdx = currentQ.options.indexOf(answerToCheck);
        const isCorrect = selectedIdx === currentQ.correctAnswerIndex;
        res = {
            correct: isCorrect,
            score: isCorrect ? 100 : 0,
            feedback: isCorrect 
                ? "Correct!" 
                : `Incorrect. The correct answer was: ${currentQ.options[currentQ.correctAnswerIndex]}`
        };
    } else {
        res = await validateExamAnswer(currentQ.question, answerToCheck, config.studyMaterial, config.language, imageFile || undefined);
    }

    setResult(res);
    setTotalScore(s => s + (res.correct ? 1 : 0));
    setQuestionCount(c => c + 1);
    
    const user = AuthService.getCurrentUser();
    if (user) {
        if (currentQ.topic) {
            AuthService.updateUserStats(user.id, currentQ.topic, res.correct);
        }
        // FAILED QUESTIONS PERSISTENCE
        if (!res.correct) {
            AuthService.saveFailedQuestion(user.id, currentQ);
        }
    }
    
    setValidating(false);
  };

  if (!hasStarted) {
      return (
          <div className={`flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn space-y-6 px-4 text-center`}>
              <div className={`p-6 rounded-full ${theme.cardBg} shadow-xl`}>
                  <svg className={`w-16 h-16 ${theme.accentColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <h2 className={`text-2xl font-bold ${theme.textMain}`}>
                  {config.examFormat === 'test' ? t('formatTest', systemLanguage) : t('formatWritten', systemLanguage)}
              </h2>
              <button 
                  onClick={handleStartExam}
                  className={`px-8 py-4 rounded-lg text-lg shadow-lg transition-all ${theme.primaryBtn}`}
              >
                  {t('startBtn', systemLanguage)}
              </button>
          </div>
      )
  }

  if (isFinished) {
      return (
          <GradeDisplay 
            score={totalScore} 
            totalQuestions={questionCount} 
            theme={theme} 
            systemLanguage={systemLanguage} 
            onExit={() => onExit(totalScore)} 
          />
      );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-6 p-4 animate-fadeIn relative">
      {/* Exit Button */}
      <button 
         onClick={handleEarlyExit}
         className="absolute top-0 right-4 text-slate-500 hover:text-red-500 font-bold text-xl"
         title={t('exitExam', systemLanguage)}
      >
          ✕
      </button>

      {/* Exam Header */}
      <div className={`w-full flex justify-between items-center border-b pb-4 ${theme.cardBorder} mt-8`}>
          <div>
             <h2 className={`text-xl font-bold ${theme.textMain}`}>
                 {t('question', systemLanguage)} {questionCount + 1} <span className="text-sm opacity-50">/ {config.totalQuestions}</span>
             </h2>
             {currentQ?.topic && <span className={`text-xs px-2 py-1 rounded ${theme.secondaryBtn}`}>{currentQ.topic}</span>}
          </div>
      </div>

      {loading && (
          <div className={`flex flex-col items-center justify-center h-64 space-y-4 w-full rounded-xl border shadow-sm ${theme.cardBg} ${theme.cardBorder}`}>
              <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${theme.accentColor.replace('text-', 'border-')}`}></div>
              <p className={`${theme.textSecondary}`}>{t('processing', systemLanguage)}</p>
          </div>
      )}

      {!loading && currentQ && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left: Question */}
              <div className={`${theme.cardBg} p-8 rounded-xl shadow-sm border ${theme.cardBorder} flex flex-col h-full min-h-[400px]`}>
                  <div className="flex-grow space-y-6">
                      <div className="flex justify-between items-center">
                          <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${theme.textSecondary} bg-slate-500/10`}>{t('question', systemLanguage)}</span>
                          <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => currentQ.question && playAudio(currentQ.question)}
                                className={`p-1.5 rounded-full hover:bg-slate-500/20 ${theme.textSecondary}`}
                                title="Read Aloud"
                              >
                                  🔊
                              </button>
                              <label className="flex items-center space-x-2 cursor-pointer text-xs">
                                  <div className="relative">
                                      <input type="checkbox" className="sr-only" checked={autoRead} onChange={() => setAutoRead(!autoRead)} />
                                      <div className={`block w-8 h-5 rounded-full transition-colors ${autoRead ? theme.primaryBtn : 'bg-slate-700'}`}></div>
                                      <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${autoRead ? 'transform translate-x-3' : ''}`}></div>
                                  </div>
                                  <span className={theme.textSecondary}>{t('autoReadQuestion', systemLanguage)}</span>
                              </label>
                          </div>
                      </div>
                      
                      <h3 className={`text-2xl ${theme.textMain} leading-relaxed`}>
                          {renderStyledQuestion(currentQ.question)}
                      </h3>
                      
                      {config.examFormat === 'test' && currentQ.options && (
                          <div className="space-y-3 mt-6">
                              {currentQ.options.map((opt, idx) => (
                                  <button
                                    key={idx}
                                    disabled={!!result}
                                    onClick={() => {
                                        setUserAnswer(opt);
                                        handleSubmit(opt);
                                    }}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                                        result 
                                          ? (result.correct && opt === userAnswer 
                                                ? 'bg-green-500/20 border-green-500 text-green-600' 
                                                : (!result.correct && opt === userAnswer 
                                                    ? 'bg-red-500/20 border-red-500 text-red-600' 
                                                    : `${theme.cardBorder} opacity-60 ${theme.textSecondary}`))
                                          : `${theme.cardBorder} ${theme.inputBg} hover:bg-slate-500/10`
                                    }`}
                                  >
                                      <span className="font-bold mr-2 opacity-70">{String.fromCharCode(65 + idx)}:</span> 
                                      <span className={theme.textMain}>{opt}</span>
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
                  
                  {/* Written Answer Area + Image Upload */}
                  {config.examFormat === 'open' && (
                    <div className={`mt-8 pt-6 border-t ${theme.cardBorder}`}>
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center space-x-2">
                               <p className={`text-xs uppercase tracking-wider ${theme.textSecondary}`}>{t('yourAnswer', systemLanguage)}</p>
                               <VoiceInput 
                                  onResult={handleVoiceInput} 
                                  language={config.language}
                                  systemLanguage={systemLanguage}
                                  className={`p-1.5 rounded border text-xs ${theme.cardBorder} ${theme.textSecondary} hover:bg-slate-500/10`}
                               />
                           </div>
                           <div className="flex items-center space-x-3">
                               <button 
                                    onClick={() => setShowMath(!showMath)} 
                                    className={`text-xs px-2 py-1 rounded border ${theme.cardBorder} ${showMath ? theme.accentColor : theme.textSecondary}`}
                               >
                                   {t('showMathSymbols', systemLanguage)}
                               </button>
                               {showMath && (
                                   <div className="flex space-x-1 overflow-x-auto pb-1 max-w-[200px]">
                                       {MATH_SYMBOLS.map(s => (
                                           <button key={s.char} onClick={() => insertSymbol(s.char)} title={s.tooltip} className={`px-2 py-1 rounded text-sm min-w-[28px] ${theme.secondaryBtn}`}>{s.char}</button>
                                       ))}
                                   </div>
                               )}
                           </div>
                           
                        </div>
                        
                        <textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder={t('typeAnswer', systemLanguage)}
                            disabled={validating}
                            className={`w-full h-40 p-4 rounded-lg outline-none resize-none transition-all ${theme.inputBg} border-2 ${theme.cardBorder} focus:border-blue-500`}
                        />
                        
                        <div className="flex justify-between items-center mt-4">
                             <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-2 rounded border ${theme.cardBorder} ${theme.textSecondary} hover:bg-slate-500/10`}
                                    title={t('uploadImageAnswer', systemLanguage)}
                                >
                                   📷
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                                {imageFile && <span className={`text-xs ${theme.accentColor}`}>{t('imageUploaded', systemLanguage)}</span>}
                             </div>

                             <button 
                                onClick={() => handleSubmit()}
                                disabled={validating || (!userAnswer.trim() && !imageFile)}
                                className={`px-8 py-3 rounded-lg font-bold shadow-lg ${theme.primaryBtn} disabled:opacity-50`}
                            >
                                {validating ? t('grading', systemLanguage) : t('submitAnswer', systemLanguage)}
                            </button>
                        </div>
                    </div>
                  )}
                  
                  {/* Feedback Section */}
                  {result && (
                      <div className={`mt-8 p-6 rounded-lg border-l-4 animate-fadeIn ${result.correct ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                          <h4 className={`font-bold mb-2 ${result.correct ? 'text-green-500' : 'text-red-500'}`}>
                              {result.correct ? t('pass', systemLanguage) : t('review', systemLanguage)} (+{result.score} pts)
                          </h4>
                          <p className={`${theme.textMain} opacity-90`}>{result.feedback}</p>
                      </div>
                  )}
              </div>

              {/* Right: Navigation / Stats (Desktop) */}
              <div className="hidden lg:block space-y-6">
                  <div className={`p-6 rounded-xl ${theme.cardBg} shadow-sm border ${theme.cardBorder}`}>
                      <h3 className={`font-bold mb-4 ${theme.textMain}`}>{t('nextQuestion', systemLanguage)}</h3>
                      <button 
                          onClick={loadQuestion}
                          disabled={loading || !result} 
                          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                              result 
                                ? `${theme.primaryBtn} shadow-lg hover:scale-105` 
                                : `${theme.cardBorder} ${theme.textSecondary} opacity-50 cursor-not-allowed`
                          }`}
                      >
                          {questionCount >= config.totalQuestions - 1 ? t('endExam', systemLanguage) : "Next >"}
                      </button>
                  </div>
              </div>
              
              {/* Mobile Next Button */}
              <div className="lg:hidden w-full mt-4">
                   {result && (
                       <button 
                          onClick={loadQuestion}
                          className={`w-full py-4 rounded-lg font-bold text-lg shadow-lg ${theme.primaryBtn}`}
                       >
                          {questionCount >= config.totalQuestions - 1 ? t('endExam', systemLanguage) : "Next >"}
                       </button>
                   )}
              </div>
          </div>
      )}
    </div>
  );
};

export default QuizGame;
