
import React, { useState, useRef, useEffect } from 'react';
import { GameConfig, GameMode, Theme, User } from '../types';
import { extractTextFromMedia, analyzeSyllabus } from '../services/genai';
import { AuthService } from '../services/auth';
import { t } from '../utils/translations';

interface SetupProps {
  onStart: (config: GameConfig, mode: GameMode) => void;
  systemLanguage: string;
  theme: Theme;
  currentUser: User;
  onLogout: () => void;
}

const examinerStyles = [
  { id: 'strict', labelKey: 'styleStrict', prompt: 'You are a strict, formal academic professor. You demand precise answers and do not tolerate vague guessing.' },
  { id: 'socratic', labelKey: 'styleSocratic', prompt: 'You are a helpful tutor who uses the Socratic method. If the user answers wrongly, guide them with a hint question.' },
  { id: 'encouraging', labelKey: 'styleEncouraging', prompt: 'You are a high-energy study coach. Keep the user motivated even if they fail.' },
];

const difficultyLevels = [
  { id: 'Easy', labelKey: 'diffEasy' },
  { id: 'Medium', labelKey: 'diffMedium' },
  { id: 'Hard', labelKey: 'diffHard' },
  { id: 'Expert', labelKey: 'diffExpert' },
];

const languages = [
  { code: 'English', name: 'English' },
  { code: 'Spanish', name: 'Español' },
  { code: 'Basque', name: 'Euskera' },
  { code: 'Catalan', name: 'Català' },
  { code: 'Valencian', name: 'Valencià' },
  { code: 'Galician', name: 'Galego' },
  { code: 'French', name: 'Français' },
  { code: 'German', name: 'Deutsch' },
];

const Setup: React.FC<SetupProps> = ({ onStart, systemLanguage, theme, currentUser, onLogout }) => {
  const [studyMaterial, setStudyMaterial] = useState('');
  const [difficulty, setDifficulty] = useState('Hard');
  const [examinerId, setExaminerId] = useState(examinerStyles[0].id);
  // Initialize Exam Language with the System Language passed from App
  const [language, setLanguage] = useState(systemLanguage);
  const [examFormat, setExamFormat] = useState<'open' | 'test'>('open');
  
  // Analysis State
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendedCount, setRecommendedCount] = useState(5);
  const [minCount, setMinCount] = useState(3);
  const [userQuestionCount, setUserQuestionCount] = useState(5);
  const [examPlan, setExamPlan] = useState<string[]>([]);
  
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stats State
  const [stats, setStats] = useState<Record<string, {correct: number, total: number}>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Profile & Stats
  useEffect(() => {
      const profile = AuthService.getUserProfile(currentUser.id);
      if (profile.savedSyllabus) setStudyMaterial(profile.savedSyllabus);
      
      // Update exam language: Use saved profile language OR system language
      if (profile.lastLanguage && languages.find(l => l.code === profile.lastLanguage)) {
          setLanguage(profile.lastLanguage);
      } else {
          // Ensure it matches the current system language if no specific override saved
          setLanguage(systemLanguage);
      }

      if (profile.topicStats) setStats(profile.topicStats);
  }, [currentUser.id, systemLanguage]);

  // Autosave
  useEffect(() => {
      if (studyMaterial.length > 10) {
          const profile = AuthService.getUserProfile(currentUser.id);
          AuthService.saveUserProfile({ ...profile, savedSyllabus: studyMaterial, lastLanguage: language });
      }
  }, [studyMaterial, language, currentUser.id]);

  const handleStart = (mode: GameMode) => {
    // Allow math tutor without syllabus text
    if (mode !== GameMode.MATH_TUTOR && studyMaterial.length < 50) {
        alert("Please enter more study material (at least 50 characters).");
        return;
    }
    const p = examinerStyles.find(p => p.id === examinerId);
    const finalPlan = examPlan.length > 0 ? examPlan.slice(0, userQuestionCount) : [];

    onStart({
      studyMaterial,
      difficulty,
      examinerStyle: p ? p.prompt : examinerStyles[0].prompt,
      language,
      examFormat,
      totalQuestions: userQuestionCount,
      examPlan: finalPlan,
      minQuestions: minCount
    }, mode);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessing(true);
    const files = Array.from(e.target.files);
    let extractedText = "";
    try {
        for (const file of files) {
            const text = await extractTextFromMedia(file);
            extractedText += `\n\n--- SOURCE: ${file.name} ---\n${text}`;
        }
        setStudyMaterial(prev => prev + extractedText);
    } catch (error) {
        alert("Error processing files.");
        console.error(error);
    } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  const handleAnalyze = async () => {
      if (studyMaterial.length < 50) return;
      setIsAnalyzing(true);
      try {
        const result = await analyzeSyllabus(studyMaterial);
        setRecommendedCount(result.recommendedQuestions);
        setMinCount(result.minQuestions);
        setExamPlan(result.topics);
        setUserQuestionCount(result.recommendedQuestions);
        setIsAnalyzed(true);
      } catch(e) { console.error(e); } finally { setIsAnalyzing(false); }
  }

  const handleClearData = () => {
      if (window.confirm(t('clearDataConfirm', systemLanguage))) {
          AuthService.clearUserStudyData(currentUser.id);
          setStudyMaterial('');
          setStats({});
          setIsAnalyzed(false);
          setExamPlan([]);
          setRecommendedCount(5);
          setMinCount(3);
      }
  }

  const renderAnalytics = () => {
      const topics = Object.keys(stats);
      if (topics.length === 0) return (
          <div className="p-4 text-center opacity-50 border rounded border-dashed">{t('noStats', systemLanguage)}</div>
      );

      // Sort by weakness (lowest percentage correct)
      const sorted = topics.sort((a, b) => {
          const rateA = stats[a].correct / stats[a].total;
          const rateB = stats[b].correct / stats[b].total;
          return rateA - rateB;
      }).slice(0, 5); // Show top 5 interesting stats

      return (
          <div className="space-y-3">
              {sorted.map(topic => {
                  const s = stats[topic];
                  const percent = Math.round((s.correct / s.total) * 100);
                  const isWeak = percent < 60;
                  return (
                      <div key={topic} className="flex items-center justify-between text-sm">
                          <span className={`truncate max-w-[150px] ${theme.textMain}`}>{topic}</span>
                          <div className="flex items-center space-x-2 flex-1 mx-2">
                              <div className="h-2 bg-slate-700 rounded-full flex-1 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isWeak ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${percent}%` }} 
                                  />
                              </div>
                          </div>
                          <span className={`font-bold ${isWeak ? 'text-red-400' : 'text-green-400'}`}>{percent}%</span>
                      </div>
                  )
              })}
          </div>
      )
  }

  return (
    <div className={`max-w-5xl mx-auto p-6 md:p-8 rounded-xl ${theme.cardBg} ${theme.cardBorder} text-center space-y-6 relative animate-fadeIn transition-colors duration-300`}>
      {/* Header */}
      <div className={`flex justify-between items-center pb-4 border-b ${theme.cardBorder}`}>
         <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-slate-700/50 border border-slate-600">
                {currentUser.avatar && currentUser.avatar.startsWith('http') ? (
                    <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-2xl">{currentUser.avatar || '👤'}</span>
                )}
            </div>
            <div className="text-left">
                <p className={`text-xs font-bold uppercase ${theme.textSecondary}`}>{t('welcomeUser', systemLanguage)}</p>
                <p className={`font-bold ${theme.textMain}`}>{currentUser.name}</p>
            </div>
         </div>
         <button 
            onClick={onLogout}
            className={`text-xs font-bold px-3 py-1 rounded border hover:bg-red-500/10 hover:text-red-500 transition-colors ${theme.cardBorder} ${theme.textSecondary}`}
         >
            {t('logout', systemLanguage)}
         </button>
      </div>

      <div className={`space-y-2 pb-2`}>
        <h1 className={`text-4xl font-extrabold ${theme.textMain}`}>{t('appTitle', systemLanguage)}</h1>
        <p className={`text-lg ${theme.textSecondary}`}>{t('subtitle', systemLanguage)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left">
        
        {/* Left: Inputs */}
        <div className="lg:col-span-3 space-y-4 flex flex-col">
            <div className="flex justify-between items-end">
                <label className={`block text-sm font-bold ${theme.textMain}`}>{t('syllabusLabel', systemLanguage)}</label>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className={`text-xs font-bold py-1 px-3 rounded transition-colors flex items-center ${theme.secondaryBtn}`}
                >
                    {isProcessing ? <span className="animate-pulse">{t('processing', systemLanguage)}</span> : t('uploadBtn', systemLanguage)}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple accept=".txt,.pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileUpload} />
            </div>
            
            <textarea
                value={studyMaterial}
                onChange={(e) => setStudyMaterial(e.target.value)}
                disabled={isProcessing}
                className={`w-full flex-grow min-h-[300px] px-4 py-3 rounded-lg outline-none transition-all resize-none text-sm border-2 ${theme.inputBg} ${isProcessing ? 'opacity-50' : ''}`}
                placeholder={isProcessing ? t('processing', systemLanguage) : t('pastePlaceholder', systemLanguage)}
            />
            <div className="flex justify-between items-center">
                <div className={`text-xs ${theme.textSecondary}`}>{studyMaterial.length} {t('chars', systemLanguage)}</div>
                <button
                    onClick={handleAnalyze}
                    disabled={studyMaterial.length < 50 || isAnalyzing}
                    className={`text-xs font-bold py-1 px-3 rounded transition-colors flex items-center ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'} ${theme.primaryBtn}`}
                >
                    {isAnalyzing ? t('analyzing', systemLanguage) : t('analyzeBtn', systemLanguage)}
                </button>
            </div>

            {isAnalyzed && (
                <div className={`p-4 rounded-lg border ${theme.cardBorder} bg-slate-500/5 animate-fadeIn space-y-3`}>
                    <p className={`text-sm ${theme.textSecondary}`}>
                        {t('analysisResult', systemLanguage)} <strong className={theme.textMain}>{recommendedCount}</strong> {t('questionsToCover', systemLanguage)}
                    </p>
                    <div className="flex items-center justify-between bg-slate-500/10 p-3 rounded-lg">
                        <label className={`text-sm font-bold ${theme.textMain}`}>{t('howManyQuestions', systemLanguage)}</label>
                        <input 
                            type="number" min="1" max="100" value={userQuestionCount}
                            onChange={(e) => setUserQuestionCount(parseInt(e.target.value) || 1)}
                            className={`w-20 px-2 py-1 rounded border ${theme.inputBg} font-bold text-center`}
                        />
                    </div>
                    {userQuestionCount < minCount && (
                        <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/30">
                            {t('minQuestionsWarning', systemLanguage).replace('{min}', minCount.toString())}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Right: Analytics & Settings */}
        <div className="space-y-6">
             {/* Analytics Widget */}
             <div className={`p-4 rounded-xl border ${theme.cardBorder} bg-slate-500/5`}>
                 <h3 className={`text-xs font-bold uppercase mb-3 ${theme.textSecondary}`}>{t('analyticsTitle', systemLanguage)}</h3>
                 {renderAnalytics()}
             </div>
             
             <button 
                onClick={handleClearData}
                className={`w-full py-2 rounded border text-xs font-bold text-red-400 border-red-900/30 hover:bg-red-500/10 transition-colors`}
             >
                {t('clearData', systemLanguage)}
             </button>

             {/* Quick Settings */}
             <div className="pt-4 border-t border-slate-700/50">
                <label className={`block text-sm font-bold mb-2 ${theme.textMain}`}>{t('examLangLabel', systemLanguage)}</label>
                <select
                    value={language} onChange={(e) => setLanguage(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg outline-none border-2 ${theme.inputBg}`}
                >
                {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
            </div>

            <div>
                <label className={`block text-sm font-bold mb-2 ${theme.textMain}`}>{t('formatLabel', systemLanguage)}</label>
                <div className="flex space-x-2">
                    <button onClick={() => setExamFormat('open')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${examFormat === 'open' ? theme.primaryBtn : `${theme.cardBorder} ${theme.textSecondary}`}`}>{t('formatWritten', systemLanguage)}</button>
                    <button onClick={() => setExamFormat('test')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${examFormat === 'test' ? theme.primaryBtn : `${theme.cardBorder} ${theme.textSecondary}`}`}>{t('formatTest', systemLanguage)}</button>
                </div>
            </div>
            
            <div>
                <label className={`block text-sm font-bold mb-2 ${theme.textMain}`}>{t('difficultyLabel', systemLanguage)}</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`w-full px-4 py-2 rounded-lg outline-none border-2 ${theme.inputBg}`}>
                    {difficultyLevels.map(d => <option key={d.id} value={d.id}>{t(d.labelKey, systemLanguage)}</option>)}
                </select>
            </div>
            
            <div>
                <label className={`block text-sm font-bold mb-2 ${theme.textMain}`}>{t('styleLabel', systemLanguage)}</label>
                <select value={examinerId} onChange={(e) => setExaminerId(e.target.value)} className={`w-full px-4 py-2 rounded-lg outline-none border-2 ${theme.inputBg}`}>
                    {examinerStyles.map(p => <option key={p.id} value={p.id}>{t(p.labelKey, systemLanguage)}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <button onClick={() => handleStart(GameMode.STUDY_HUB)} disabled={isProcessing} className={`group p-6 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white shadow-lg disabled:opacity-50`}>
           <div className="text-3xl mb-2">🧠</div>
           <span className="text-lg font-bold block">{t('startStudy', systemLanguage)}</span>
           <span className="text-xs opacity-80">{t('startStudyDesc', systemLanguage)}</span>
        </button>

        <button onClick={() => handleStart(GameMode.LIVE_VOICE)} disabled={isProcessing} className={`group p-6 rounded-xl ${theme.primaryBtn} disabled:opacity-50`}>
           <div className="text-3xl mb-2">🎙️</div>
           <span className="text-lg font-bold block">{t('startOral', systemLanguage)}</span>
           <span className="text-xs opacity-80">{t('startOralDesc', systemLanguage)}</span>
        </button>

        <button onClick={() => handleStart(GameMode.QUIZ_SEARCH)} disabled={isProcessing} className={`group p-6 rounded-xl ${theme.secondaryBtn} disabled:opacity-50`}>
           <div className="text-3xl mb-2">✍️</div>
           <span className="text-lg font-bold block">{t('startWritten', systemLanguage)}</span>
           <span className="text-xs opacity-80">{t('startWrittenDesc', systemLanguage)}</span>
        </button>

        <button onClick={() => handleStart(GameMode.MATH_TUTOR)} disabled={isProcessing} className={`group p-6 rounded-xl bg-amber-700 hover:bg-amber-600 text-white shadow-lg disabled:opacity-50`}>
           <div className="text-3xl mb-2">📐</div>
           <span className="text-lg font-bold block">{t('startMathTutor', systemLanguage)}</span>
           <span className="text-xs opacity-80">{t('startMathDesc', systemLanguage)}</span>
        </button>
      </div>
      
      <div className={`pt-4 border-t ${theme.cardBorder} space-y-3`}>
         <button onClick={() => setShowPrivacy(true)} className={`text-xs ${theme.textSecondary} hover:underline`}>{t('privacy', systemLanguage)}</button>
      </div>

      {showPrivacy && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-xl z-50 flex flex-col items-center justify-center p-8 text-left animate-fadeIn">
           <div className={`${theme.cardBg} p-6 rounded-xl shadow-2xl max-w-md ${theme.textMain}`}>
              <h3 className="text-xl font-bold mb-4">{t('privacyTitle', systemLanguage)}</h3>
              <p className={`text-sm ${theme.textSecondary}`}>{t('privacyContent', systemLanguage)}</p>
              <button onClick={() => setShowPrivacy(false)} className={`mt-6 w-full py-2 rounded font-bold ${theme.secondaryBtn}`}>{t('close', systemLanguage)}</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Setup;
