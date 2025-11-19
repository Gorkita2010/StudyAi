
import React, { useState, useEffect } from 'react';
import Setup from './components/Setup';
import LiveGame from './components/LiveGame';
import QuizGame from './components/QuizGame';
import Leaderboard from './components/Leaderboard';
import SettingsModal from './components/SettingsModal';
import StudyHub from './components/StudyHub';
import MathTutor from './components/MathTutor';
import Auth from './components/Auth';
import { GameConfig, GameMode, Theme, User } from './types';
import { t, detectBrowserLanguage } from './utils/translations';
import { themes } from './utils/themes';
import { AuthService } from './services/auth';

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>(GameMode.SETUP);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [lastScore, setLastScore] = useState(0);
  
  // Initialize with auto-detected language
  const [systemLanguage, setSystemLanguage] = useState(detectBrowserLanguage());
  const [showSettings, setShowSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes.serious);
  const [voiceName, setVoiceName] = useState('Puck');

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session
    const user = AuthService.getCurrentUser();
    if (user) {
      handleLogin(user); // Reuse login logic to hydrate preferences
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    
    // Load Preferences (Theme & Language)
    const profile = AuthService.getUserProfile(user.id);
    
    // 1. Apply Theme Preference
    if (profile.themePreference && themes[profile.themePreference]) {
      setCurrentTheme(themes[profile.themePreference]);
    }

    // 2. Apply Language Preference (Overrides system default if saved)
    if (profile.lastLanguage) {
      setSystemLanguage(profile.lastLanguage);
    }
  }

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setMode(GameMode.SETUP);
    setConfig(null);
    // Optional: Reset theme to default on logout, or keep it. Keeping it is usually better UX.
  }

  const handleStart = (gameConfig: GameConfig, selectedMode: GameMode) => {
    setConfig(gameConfig);
    setMode(selectedMode);
    if (selectedMode === GameMode.LEADERBOARD) {
      setLastScore(0);
    }
  };

  const handleGameExit = (score: number) => {
    setLastScore(score);
    setMode(GameMode.SETUP); 
    setConfig(null);
  };
  
  const handleCloseLeaderboard = () => {
    setMode(GameMode.SETUP);
    setLastScore(0);
  }

  const handleReset = () => {
    setMode(GameMode.SETUP);
    setConfig(null);
    setLastScore(0);
  }

  const handleSetTheme = (themeId: string) => {
      if (themes[themeId]) {
          setCurrentTheme(themes[themeId]);
          
          // Persist theme if user is logged in
          if (currentUser) {
            const profile = AuthService.getUserProfile(currentUser.id);
            profile.themePreference = themeId;
            AuthService.saveUserProfile(profile);
          }
      }
  }

  // When system language changes, persist it if logged in
  const handleSetLanguage = (lang: string) => {
      setSystemLanguage(lang);
      if (currentUser) {
        const profile = AuthService.getUserProfile(currentUser.id);
        profile.lastLanguage = lang;
        AuthService.saveUserProfile(profile);
      }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${currentTheme.bgApp} ${currentTheme.font} selection:bg-blue-500/30`}>
      <div className="container mx-auto px-4 py-6 min-h-screen flex flex-col">
        
        {/* Header */}
        <header className={`flex items-center justify-between mb-8 pb-4 border-b ${currentTheme.cardBorder}`}>
           <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setMode(GameMode.SETUP)}>
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg transition-colors ${currentTheme.primaryBtn}`}>
               AI
             </div>
             <span className={`text-2xl font-bold tracking-tight ${currentTheme.textMain}`}>{t('appTitle', systemLanguage)}</span>
           </div>
           
           <div className="flex items-center space-x-4">
             <span className={`text-xs hidden md:block ${currentTheme.textSecondary}`}>
               Student Edition | Powered by Gemini 2.5
             </span>
             <button 
               onClick={() => setShowSettings(true)}
               className={`p-2 rounded-full transition-all ${currentTheme.textSecondary} hover:${currentTheme.accentColor} hover:bg-slate-500/10`}
               title="Settings"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
             </button>
           </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center justify-center w-full">
          {!currentUser ? (
             <Auth onLogin={handleLogin} systemLanguage={systemLanguage} theme={currentTheme} />
          ) : (
            <>
                {mode === GameMode.SETUP && (
                    <Setup onStart={handleStart} systemLanguage={systemLanguage} theme={currentTheme} currentUser={currentUser} onLogout={handleLogout} />
                )}
                
                {mode === GameMode.LIVE_VOICE && config && (
                    <LiveGame config={config} onExit={handleGameExit} systemLanguage={systemLanguage} theme={currentTheme} />
                )}

                {mode === GameMode.QUIZ_SEARCH && config && (
                    <QuizGame config={config} onExit={handleGameExit} systemLanguage={systemLanguage} theme={currentTheme} voiceName={voiceName} />
                )}

                {mode === GameMode.STUDY_HUB && config && (
                    <StudyHub config={config} onExit={() => setMode(GameMode.SETUP)} systemLanguage={systemLanguage} theme={currentTheme} />
                )}

                {mode === GameMode.MATH_TUTOR && config && (
                    <MathTutor onExit={() => setMode(GameMode.SETUP)} systemLanguage={systemLanguage} theme={currentTheme} voiceName={voiceName} />
                )}
                
                {mode === GameMode.LEADERBOARD && (
                    <Leaderboard currentScore={lastScore} onClose={handleCloseLeaderboard} />
                )}
            </>
          )}
        </main>

        <SettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)}
          systemLanguage={systemLanguage}
          setSystemLanguage={handleSetLanguage}
          onReset={handleReset}
          currentTheme={currentTheme}
          setTheme={handleSetTheme}
          voiceName={voiceName}
          setVoiceName={setVoiceName}
        />

      </div>
    </div>
  );
};

export default App;
