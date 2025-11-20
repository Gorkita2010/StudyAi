
import React, { useEffect, useState } from 'react';
import { Theme } from '../types';
import { t } from '../utils/translations';

interface GradeDisplayProps {
  score: number;        // Raw score (e.g. 4)
  totalQuestions: number; // Total questions (e.g. 5)
  theme: Theme;
  systemLanguage: string;
  onExit: () => void;
}

const GradeDisplay: React.FC<GradeDisplayProps> = ({ score, totalQuestions, theme, systemLanguage, onExit }) => {
  const [finalGrade, setFinalGrade] = useState(0);
  const [gradeLabel, setGradeLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (totalQuestions === 0) return;
    
    // Calculate grade 0-10
    const calculatedGrade = (score / totalQuestions) * 10;
    // Round to 1 decimal
    const roundedGrade = Math.round(calculatedGrade * 10) / 10;
    setFinalGrade(roundedGrade);

    // Determine label and style
    if (roundedGrade < 5) {
        setGradeLabel(t('gradeFail', systemLanguage));
        setIcon('🌧️'); // Rain
        setColor('text-red-500');
    } else if (roundedGrade < 6) {
        setGradeLabel(t('gradeSufficient', systemLanguage));
        setIcon('☁️'); // Cloud
        setColor('text-orange-400');
    } else if (roundedGrade < 7) {
        setGradeLabel(t('gradeGood', systemLanguage));
        setIcon('🌤️'); // Sun behind cloud
        setColor('text-yellow-400');
    } else if (roundedGrade < 9) {
        setGradeLabel(t('gradeNotable', systemLanguage));
        setIcon('☀️'); // Sun
        setColor('text-blue-400');
    } else {
        setGradeLabel(t('gradeOutstanding', systemLanguage));
        setIcon('🏆'); // Trophy
        setColor('text-purple-400');
    }

  }, [score, totalQuestions, systemLanguage]);

  return (
      <div className={`flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn space-y-8 px-4 text-center`}>
          <div className={`p-8 rounded-2xl ${theme.cardBg} shadow-2xl border ${theme.cardBorder} max-w-md w-full`}>
              <h2 className={`text-3xl font-bold mb-2 ${theme.textMain}`}>{t('finished', systemLanguage)}</h2>
              
              <div className="my-8 transform hover:scale-110 transition-transform duration-500">
                  <div className="text-8xl mb-4 drop-shadow-2xl filter">{icon}</div>
                  <div className={`text-6xl font-black ${color} drop-shadow-md`}>
                      {finalGrade}
                  </div>
              </div>
              
              <div className={`text-xl font-bold uppercase tracking-widest mb-6 border-t border-b py-2 ${theme.cardBorder} ${theme.textMain}`}>
                  {gradeLabel}
              </div>

              <p className={`text-sm mb-6 ${theme.textSecondary}`}>
                  {t('score', systemLanguage)}: {score} / {totalQuestions}
              </p>

              <button 
                onClick={onExit} 
                className={`w-full px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all ${theme.primaryBtn}`}
              >
                {t('endExam', systemLanguage)}
              </button>
          </div>
      </div>
  );
};

export default GradeDisplay;
