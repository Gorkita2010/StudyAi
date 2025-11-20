
import React, { useState, useEffect } from 'react';
import { Flashcard, Theme } from '../types';
import { generateFlashcards } from '../services/genai';
import { AuthService } from '../services/auth';
import { t } from '../utils/translations';

interface FlashcardGameProps {
    studyMaterial: string;
    language: string;
    systemLanguage: string;
    theme: Theme;
}

const FlashcardGame: React.FC<FlashcardGameProps> = ({ studyMaterial, language, systemLanguage, theme }) => {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        loadCards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadCards = async () => {
        setLoading(true);
        // Get all cards from AI
        const generated = await generateFlashcards(studyMaterial, language);
        
        // Filter out cards user already knows
        const user = AuthService.getCurrentUser();
        let cardsToShow = generated;
        if (user) {
            const learned = AuthService.getLearnedFlashcards(user.id);
            cardsToShow = generated.filter(c => !learned.includes(c.front));
        }

        setCards(cardsToShow);
        setLoading(false);
        setCurrentIndex(0);
        setFinished(false);
        setIsFlipped(false);
    };
    
    const handleResetDeck = () => {
        const user = AuthService.getCurrentUser();
        if (user) {
            AuthService.resetFlashcards(user.id);
            loadCards();
        }
    }

    const handleNext = (knewIt: boolean) => {
        // Save "Learned" status
        if (knewIt) {
            const user = AuthService.getCurrentUser();
            if (user && cards[currentIndex]) {
                AuthService.markFlashcardLearned(user.id, cards[currentIndex].front);
            }
        }

        setIsFlipped(false);
        setTimeout(() => {
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setFinished(true);
            }
        }, 200);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-fadeIn">
                <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${theme.accentColor.replace('text-', 'border-')}`}></div>
                <p className={theme.textSecondary}>{t('generating', systemLanguage)}</p>
            </div>
        );
    }

    if (cards.length === 0 && !loading) {
         return (
            <div className={`flex flex-col items-center justify-center h-80 space-y-6 animate-fadeIn`}>
                <div className="text-6xl">🎉</div>
                <h2 className={`text-2xl font-bold ${theme.textMain}`}>{t('flashcardsDone', systemLanguage)}</h2>
                <p className={theme.textSecondary}>You have mastered all cards for this session.</p>
                <button 
                    onClick={handleResetDeck} 
                    className={`px-6 py-3 rounded-xl font-bold shadow-lg ${theme.primaryBtn}`}
                >
                    {t('restartCards', systemLanguage)}
                </button>
            </div>
        );
    }

    if (finished) {
        return (
            <div className={`flex flex-col items-center justify-center h-80 space-y-6 animate-fadeIn`}>
                <h2 className={`text-2xl font-bold ${theme.textMain}`}>{t('flashcardsDone', systemLanguage)}</h2>
                <button 
                    onClick={loadCards} 
                    className={`px-6 py-3 rounded-xl font-bold shadow-lg ${theme.secondaryBtn}`}
                >
                    Review Remaining
                </button>
                <button 
                    onClick={handleResetDeck} 
                    className={`px-6 py-3 rounded-xl font-bold shadow-lg ${theme.primaryBtn}`}
                >
                    {t('restartCards', systemLanguage)}
                </button>
            </div>
        );
    }

    const currentCard = cards[currentIndex];

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto py-8">
            <div className={`text-sm mb-4 ${theme.textSecondary} font-bold uppercase tracking-widest`}>
                Card {currentIndex + 1} / {cards.length}
            </div>

            {/* Card Area */}
            <div 
                className="relative w-full h-80 perspective-1000 cursor-pointer group"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front */}
                    <div className={`absolute inset-0 backface-hidden rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-center border-2 ${theme.cardBg} ${theme.cardBorder}`}>
                        <p className={`text-xs uppercase mb-4 ${theme.accentColor} font-bold`}>Concept / Question</p>
                        <h3 className={`text-2xl font-bold ${theme.textMain}`}>{currentCard.front}</h3>
                        <p className={`absolute bottom-4 text-xs ${theme.textSecondary} opacity-50`}>{t('flipCard', systemLanguage)}</p>
                    </div>

                    {/* Back */}
                    <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-center border-2 bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/30`}>
                         <p className={`text-xs uppercase mb-4 text-blue-400 font-bold`}>Definition / Answer</p>
                         <h3 className={`text-xl text-white leading-relaxed`}>{currentCard.back}</h3>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className={`flex space-x-4 mt-8 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(false); }}
                    className="px-6 py-3 rounded-xl bg-red-500/20 text-red-500 border border-red-500/50 font-bold hover:bg-red-500/30 transition-colors"
                >
                    {t('iDidntKnow', systemLanguage)}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(true); }}
                    className="px-6 py-3 rounded-xl bg-green-500/20 text-green-500 border border-green-500/50 font-bold hover:bg-green-500/30 transition-colors"
                >
                    {t('iKnewIt', systemLanguage)}
                </button>
            </div>
            
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};

export default FlashcardGame;
