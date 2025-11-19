
import React from 'react';
import { t } from '../utils/translations';
import { themes } from '../utils/themes';
import { Theme } from '../types';

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
}

const languages = [
  'English', 'Spanish', 'Basque', 'Catalan', 'Valencian', 'Galician', 'French', 'German'
];

const voices = [
  { id: 'Puck', labelKey: 'voiceMale1' },
  { id: 'Fenrir', labelKey: 'voiceMale2' },
  { id: 'Kore', labelKey: 'voiceFemale1' },
  { id: 'Aoede', labelKey: 'voiceFemale2' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, systemLanguage, setSystemLanguage, currentTheme, setTheme, onReset, voiceName, setVoiceName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} ${currentTheme.textMain} rounded-xl w-full max-w-sm p-6 transition-colors duration-300`}>
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold">{t('settingsTitle', systemLanguage)}</h2>
           <button onClick={onClose} className={`${currentTheme.textSecondary} hover:text-red-500`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="space-y-6">
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
