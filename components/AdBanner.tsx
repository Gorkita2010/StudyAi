
import React from 'react';
import { Theme } from '../types';
import { t } from '../utils/translations';

interface AdBannerProps {
    theme: Theme;
    systemLanguage: string;
    onRemoveAds: () => void;
}

const AdBanner: React.FC<AdBannerProps> = ({ theme, systemLanguage, onRemoveAds }) => {
    return (
        <div className="w-full bg-slate-800 text-white py-3 px-4 flex items-center justify-between shadow-lg border-t border-slate-700">
            <div className="flex items-center space-x-4">
                <span className="text-xs font-bold bg-yellow-500 text-black px-2 py-0.5 rounded">AD</span>
                <span className="text-sm opacity-80">{t('adSpace', systemLanguage)} - Google AdSense Placeholder</span>
            </div>
            <button 
                onClick={onRemoveAds}
                className="text-xs font-bold underline hover:text-yellow-400"
            >
                {t('removeAds', systemLanguage)}
            </button>
        </div>
    );
};

export default AdBanner;
