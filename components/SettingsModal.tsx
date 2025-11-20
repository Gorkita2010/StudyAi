
import React, { useState, useEffect } from 'react';
import { t } from '../utils/translations';
import { themes } from '../utils/themes';
import { Theme } from '../types';
import { AuthService } from '../services/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemLanguage: string;
  setSystemLanguage: (lang: string) => void;
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  onReset: () => void;
  voiceName: string;
  setVoiceName: (name: string) => void;
  isPro: boolean;
  onTogglePro: () => void;
}

const languages = [
  'English', 'Spanish', 'Basque', 'Catalan', 'Valencian', 'Galician', 'French', 'German'
];

const voices = [
  { id: 'Puck', labelKey: 'voiceMale1' },
  { id: 'Fenrir', labelKey: 'voiceMale2' },
  { id: 'Kore', labelKey: 'voiceFemale1' },
  { id: 'Aoede', labelKey: 'voiceFemale2' },
  { id: 'Charon', labelKey: 'voiceMaleSpain' },
  { id: 'Zephyr', labelKey: 'voiceFemaleSpain' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, systemLanguage, setSystemLanguage, currentTheme, setTheme, onReset, voiceName, setVoiceName, isPro, onTogglePro
}) => {
  const [customKey, setCustomKey] = useState('');
  const [keyStatus, setKeyStatus] = useState('');

  useEffect(() => {
      if (isOpen) {
          const user = AuthService.getCurrentUser();
          if (user) {
              const profile = AuthService.getUserProfile(user.id);
              setCustomKey(profile.customApiKey || '');
          }
      }
  }, [isOpen]);

  const handleSaveKey = () => {
      const user = AuthService.getCurrentUser();
      if (!user) return;
      
      const profile = AuthService.getUserProfile(user.id);
      
      if (customKey.trim()) {
          profile.customApiKey = customKey.trim();
          // Grant Pro status automatically if they provide their own key
          profile.isPro = true; 
          AuthService.saveUserProfile(profile);
          setKeyStatus(t('apiKeySaved', systemLanguage));
      } else {
          delete profile.customApiKey;
          AuthService.saveUserProfile(profile);
          setKeyStatus(t('apiKeyRemoved', systemLanguage));
      }
      
      // Force refresh of pro status
      onTogglePro(); // Re-trigger checks in parent
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} ${currentTheme.textMain} rounded-xl w-full max-w-sm p-6 transition-colors duration-300 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold">{t('settingsTitle', systemLanguage)}</h2>
           <button onClick={onClose} className={`${currentTheme.textSecondary} hover:text-red-500`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="space-y-6">
           {/* Subscription Section */}
           <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-4 rounded-lg border border-blue-500/30">
                <h3 className="font-bold text-sm mb-2 uppercase tracking-wider">{t('subscriptionTitle', systemLanguage)}</h3>
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm">{t('currentPlan', systemLanguage)}:</span>
                    <span className={`font-bold px-2 py-1 rounded text-xs ${isPro ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-500/20 text-slate-400'}`}>
                        {isPro ? 'PRO 👑' : 'FREE'}
                    </span>
                </div>
                {!isPro ? (
                    <button 
                        onClick={onTogglePro}
                        className="w-full py-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white rounded font-bold shadow-lg text-sm"
                    >
                        {t('upgradeToPro', systemLanguage)}
                    </button>
                ) : (
                    <p className="text-xs text-green-400 text-center">{t('proBenefits', systemLanguage)}</p>
                )}
           </div>
           
           {/* BYOK Section */}
           <div className="p-4 rounded-lg border border-dashed border-slate-500/50 bg-slate-500/5">
               <h3 className="font-bold text-sm mb-1 uppercase tracking-wider">{t('byokTitle', systemLanguage)}</h3>
               <p className="text-xs text-slate-400 mb-3">{t('byokDesc', systemLanguage)}</p>
               <input 
                  type="password" 
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder={t('byokPlaceholder', systemLanguage)}
                  className={`w-full px-3 py-2 text-xs rounded border mb-2 ${currentTheme.inputBg}`}
               />
               <div className="flex justify-between items-center">
                   <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">
                       {t('getKeyLink', systemLanguage)}
                   </a>
                   <button 
                       onClick={handleSaveKey}
                       className={`text-xs px-3 py-1 rounded font-bold ${currentTheme.primaryBtn}`}
                   >
                       {customKey ? t('saveKey', systemLanguage) : t('removeKey', systemLanguage)}
                   </button>
               </div>
               {keyStatus && <p className="text-xs text-green-400 mt-2 text-center">{keyStatus}</p>}
           </div>

           <div>
             <label className={`block text-sm font-bold mb-2 ${currentTheme.textSecondary}`}>
               {t('systemLang', systemLanguage)}
             </label>
             <select 
               value={systemLanguage}
               onChange={(e) => setSystemLanguage(e.target.value)}
               className={`w-full px-4 py-2 rounded-lg outline-none border-2 ${currentTheme.inputBg}`}
             >
               {languages.map(lang => (
                 <option key={lang} value={lang}>{lang}</option>
               ))}
             </select>
           </div>

           <div>
             <label className={`block text-sm font-bold mb-2 ${currentTheme.textSecondary}`}>
               {t('themeLabel', systemLanguage)}
             </label>
             <div className="grid grid-cols-2 gap-2">
                {Object.values(themes).map((th) => (
                    <button
                        key={th.id}
                        onClick={() => setTheme(th.id)}
                        className={`px-3 py-2 text-sm rounded border transition-all ${
                            currentTheme.id === th.id 
                            ? `${currentTheme.primaryBtn} border-transparent`
                            : `${currentTheme.cardBorder} ${currentTheme.textSecondary} hover:bg-slate-500/10`
                        }`}
                    >
                        {t(th.nameKey, systemLanguage)}
                    </button>
                ))}
             </div>
           </div>

           <div>
             <label className={`block text-sm font-bold mb-2 ${currentTheme.textSecondary}`}>
               {t('voiceLabel', systemLanguage)}
             </label>
             <select 
               value={voiceName}
               onChange={(e) => setVoiceName(e.target.value)}
               className={`w-full px-4 py-2 rounded-lg outline-none border-2 ${currentTheme.inputBg}`}
             >
               {voices.map(v => (
                 <option key={v.id} value={v.id}>{t(v.labelKey, systemLanguage)}</option>
               ))}
             </select>
           </div>

           <div className={`pt-4 border-t ${currentTheme.cardBorder}`}>
             <button 
               onClick={() => {
                 if(window.confirm('Are you sure? This will clear your current progress.')) {
                   onReset();
                   onClose();
                 }
               }}
               className="w-full py-2 text-red-500 font-bold hover:bg-red-500/10 rounded transition-colors"
             >
               {t('resetApp', systemLanguage)}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
