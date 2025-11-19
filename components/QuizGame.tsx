
import React, { useEffect, useState, useRef } from 'react';
import { GameConfig, ExamQuestion, Theme } from '../types';
import { generateExamQuestion, validateExamAnswer, generateSpeech } from '../services/genai';
import { AuthService } from '../services/auth';
import { t } from '../utils/translations';

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
    
    // Ensure topic is set even if not from plan
    if (specificTopic) q.topic = specificTopic;
    else if (!q.topic) q.topic = "General";

    setCurrentQ(q);
    setLoading(false);

    if (q.question && audioContextRef.current) {
        generateSpeech(q.question, voiceName).then(buffer => {
             if (buffer && audioContextRef.current) {
                 const src = audioContextRef.current.createBufferSource();
                 src.buffer = buffer;
                 src.connect(audioContextRef.current.destination);
                 src.start(0);
             }
        });
    }
  };

  const insertSymbol = (char: string) => {
      setUserAnswer(prev => prev + char);
  };

  const handleSubmit = async (valOverride?: string) => {
    const answerToCheck = valOverride || userAnswer;
    // Allow submission if text is empty BUT image is present
    if ((!answerToCheck.trim() && !imageFile) || !currentQ) return;

    setValidating(true);
    
    let res = { correct: false, score: 0, feedback: "" };

    // If Test Mode (Multiple Choice)
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
        // If Open Mode (Essay + optional Image)
        res = await validateExamAnswer(currentQ.question, answerToCheck, config.studyMaterial, config.language, imageFile || undefined);
    }

    setResult(res);
    setTotalScore(s => s + res.score);
    setQuestionCount(c => c + 1);
    
    // Analytics
    const user = AuthService.getCurrentUser();
    if (user && currentQ.topic) {
        AuthService.updateUserStats(user.id, currentQ.topic, res.correct);
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
          <div className={`flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn space-y-8 px-4 text-center`}>
              <div className={`p-8 rounded-2xl ${theme.cardBg} shadow-2xl border ${theme.cardBorder}`}>
                  <h2 className={`text-4xl font-bold mb-4 ${theme.textMain}`}>{t('finished', systemLanguage)}</h2>
                  <div className="text-6xl mb-6">🎉</div>
                  <p className={`text-lg mb-2 ${theme.textSecondary}`}>{t('score', systemLanguage)}</p>
                  <p className={`text-5xl font-black mb-6 ${theme.accentColor}`}>
                      {Math.round(totalScore / config.totalQuestions)}%
                  </p>
                  <button 
                    onClick={() => onExit(totalScore)} 
                    className={`px-8 py-3 rounded-lg font-bold ${theme.primaryBtn}`}
                  >
                    {t('endExam', systemLanguage)}
                  </button>
              </div>
          </div>
      )
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-6 p-4 animate-fadeIn">
      {/* Exam Header */}
      <div className={`w-full flex justify-between items-center border-b pb-4 ${theme.cardBorder}`}>
          <div>
             <h2 className={`text-xl font-bold ${theme.textMain}`}>
                 {t('question', systemLanguage)} {questionCount + 1} <span className="text-sm opacity-50">/ {config.totalQuestions}</span>
             </h2>
             {currentQ?.topic && <span className={`text-xs px-2 py-1 rounded ${theme.secondaryBtn}`}>{currentQ.topic}</span>}
          </div>
          <div className="text-right">
             <div className={`text-sm uppercase tracking-wider ${theme.textSecondary}`}>{t('avgScore', systemLanguage)}</div>
             <div className={`text-2xl font-bold ${theme.accentColor}`}>
                 {questionCount > 0 ? Math.round(totalScore / questionCount) : 0}%
             </div>
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
                      <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${theme.textSecondary} bg-slate-500/10`}>{t('question', systemLanguage)}</span>
                      <h3 className={`text-2xl ${theme.textMain} leading-relaxed`}>
                          {currentQ.question}
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
                           <p className={`text-xs uppercase tracking-wider ${theme.textSecondary}`}>{t('yourAnswer', systemLanguage)}</p>
                           <div className="flex space-x-1 overflow-x-auto pb-1">
                               {MATH_SYMBOLS.map(s => (
                                   <button key={s.char} onClick={() => insertSymbol(s.char)} title={s.tooltip} className={`px-2 py-1 rounded text-sm min-w-[28px] ${theme.secondaryBtn}`}>{s.char}</button>
                               ))}
                           </div>
                        </div>
                        {!result ? (
                            <>
                                <textarea 
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    placeholder={t('typeAnswer', systemLanguage)}
                                    className={`w-full h-32 p-4 border rounded-lg outline-none resize-none text-lg mb-2 ${theme.inputBg} ${theme.textMain}`}
                                />
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`px-3 py-2 rounded text-xs font-bold border flex items-center ${theme.cardBorder} ${theme.textSecondary} hover:bg-slate-500/10`}
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {t('uploadImageAnswer', systemLanguage)}
                                    </button>
                                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                    {imageFile && <span className={`text-xs ${theme.accentColor}`}>{t('imageUploaded', systemLanguage)}: {imageFile.name}</span>}
                                </div>
                            </>
                        ) : (
                            <div className={`p-4 rounded-lg border italic ${theme.cardBg} ${theme.cardBorder} ${theme.textSecondary}`}>
                                {userAnswer || "(Image Answer Provided)"}
                            </div>
                        )}
                    </div>
                  )}
              </div>

              {/* Right: Grading / Action */}
              <div className="flex flex-col space-y-6">
                  {!result ? (
                      <div className={`${theme.cardBg} p-8 rounded-xl border ${theme.cardBorder} h-full flex flex-col justify-center items-center text-center space-y-4`}>
                          {config.examFormat === 'open' ? (
                              <>
                                <p className={theme.textSecondary}>Take your time. Accuracy is more important than speed.</p>
                                <button 
                                    onClick={() => handleSubmit()}
                                    disabled={validating || (!userAnswer.trim() && !imageFile)}
                                    className={`w-full py-4 rounded-lg shadow-lg transition-all ${theme.primaryBtn} disabled:opacity-50`}
                                >
                                    {validating ? t('grading', systemLanguage) : t('submitAnswer', systemLanguage)}
                                </button>
                              </>
                          ) : (
                              <p className={theme.textSecondary}>Select an option on the left to submit.</p>
                          )}
                      </div>
                  ) : (
                      <div className={`${theme.cardBg} p-8 rounded-xl shadow-lg border ${theme.cardBorder} h-full flex flex-col animate-fadeIn`}>
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <p className={`text-sm uppercase ${theme.textSecondary}`}>{t('score', systemLanguage)}</p>
                                  <p className={`text-4xl font-bold ${result.score >= 70 ? 'text-green-500' : 'text-red-500'}`}>
                                      {result.score}/100
                                  </p>
                              </div>
                              <div className={`px-3 py-1 rounded text-sm font-bold uppercase ${result.correct ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                                  {result.correct ? t('pass', systemLanguage) : t('review', systemLanguage)}
                              </div>
                          </div>
                          
                          <div className="flex-grow space-y-4 overflow-y-auto max-h-[300px]">
                              <h4 className={`font-bold ${theme.textMain}`}>{t('feedbackLabel', systemLanguage)}</h4>
                              <p className={`${theme.textSecondary} leading-relaxed`}>
                                  {result.feedback}
                              </p>
                          </div>

                          <button onClick={loadQuestion} className={`mt-6 w-full py-4 rounded-lg font-bold ${theme.secondaryBtn}`}>
                              {questionCount >= config.totalQuestions ? t('endExam', systemLanguage) : t('nextQuestion', systemLanguage)}
                          </button>
                      </div>
                  )}
                  <button onClick={() => onExit(totalScore)} className={`${theme.textSecondary} hover:underline text-sm`}>
                      {t('endExam', systemLanguage)}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default QuizGame;
