
import React, { useState, useEffect, useRef } from 'react';
import { Theme, MathStep } from '../types';
import { solveMathProblem, generateSpeech } from '../services/genai';
import { t } from '../utils/translations';
import VoiceInput from './VoiceInput';

interface MathTutorProps {
    systemLanguage: string;
    theme: Theme;
    voiceName: string;
    onExit: () => void;
}

const MathTutor: React.FC<MathTutorProps> = ({ systemLanguage, theme, voiceName, onExit }) => {
    const [input, setInput] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [steps, setSteps] = useState<MathStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    
    const audioCtxRef = useRef<AudioContext | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => { if(audioCtxRef.current) audioCtxRef.current.close(); }
    }, []);

    // KaTeX renderer helper
    const renderLatex = (latex: string) => {
        const html = (window as any).katex ? (window as any).katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true
        }) : latex;
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    };

    const handleSolve = async () => {
        if (!input && !image) return;
        setLoading(true);
        setSteps([]);
        setCurrentStepIndex(-1);
        
        const solution = await solveMathProblem(input, systemLanguage, image || undefined);
        setSteps(solution);
        setLoading(false);
        
        // Start step 1 automatically
        if (solution.length > 0) {
            playStep(0, solution);
        }
    };

    const playStep = async (index: number, stepList: MathStep[]) => {
        if (index >= stepList.length) return;
        
        setCurrentStepIndex(index);
        const step = stepList[index];

        // 1. Generate Audio
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const buffer = await generateSpeech(step.explanation, voiceName);
        
        if (buffer && audioCtxRef.current) {
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);
            
            // 2. Play Audio
            source.start(0);
            
            // 3. Wait for end + small pause, then next step
            source.onended = () => {
                setTimeout(() => {
                    playStep(index + 1, stepList);
                }, 1000);
            };
        } else {
            // If audio fails, just wait 3 seconds
            setTimeout(() => {
                 playStep(index + 1, stepList);
            }, 3000);
        }
    };

    const handleVoiceInput = (text: string) => {
        setInput(prev => prev + (prev ? ' ' : '') + text);
    }

    return (
        <div className={`w-full max-w-4xl mx-auto p-4 animate-fadeIn`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-3xl font-bold ${theme.textMain}`}>{t('mathTutorTitle', systemLanguage)}</h2>
                <button onClick={onExit} className={`${theme.secondaryBtn} px-4 py-2 rounded-lg text-sm font-bold`}>
                    {t('backToSetup', systemLanguage)}
                </button>
            </div>

            {/* Input Area */}
            <div className={`p-6 rounded-xl border mb-8 ${theme.cardBg} ${theme.cardBorder}`}>
                <div className="flex gap-4">
                    <div className="flex-grow relative">
                        <label className={`block text-sm font-bold mb-2 ${theme.textMain}`}>{t('mathInputLabel', systemLanguage)}</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('mathInputPlaceholder', systemLanguage)}
                                className={`w-full pl-4 pr-10 py-3 rounded-lg border outline-none ${theme.inputBg}`}
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10">
                                <VoiceInput 
                                    onResult={handleVoiceInput} 
                                    language={systemLanguage}
                                    systemLanguage={systemLanguage}
                                    className={`p-1.5 rounded-full hover:bg-slate-500/20 ${theme.textSecondary}`}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-end">
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={`h-[50px] px-4 rounded-lg border flex items-center justify-center ${theme.cardBorder} ${theme.textSecondary} hover:bg-slate-500/10`}
                            title={t('uploadImageAnswer', systemLanguage)}
                         >
                            📷
                         </button>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => setImage(e.target.files?.[0] || null)} />
                    </div>
                </div>
                {image && <p className={`text-xs mt-2 ${theme.accentColor}`}>{image.name}</p>}
                
                <button 
                    onClick={handleSolve} 
                    disabled={loading || (!input && !image)}
                    className={`w-full mt-4 py-3 rounded-lg font-bold ${theme.primaryBtn} disabled:opacity-50`}
                >
                    {loading ? t('generating', systemLanguage) : t('solveBtn', systemLanguage)}
                </button>
            </div>

            {/* Blackboard */}
            <div className="relative w-full bg-slate-900 border-8 border-amber-900/50 rounded-lg shadow-2xl min-h-[400px] p-8 overflow-y-auto flex flex-col items-center">
                 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                 
                 {steps.length === 0 && !loading && (
                     <div className="text-slate-600 text-6xl font-serif italic opacity-20 mt-20">f(x) = ...</div>
                 )}

                 <div className="w-full max-w-2xl space-y-8">
                     {steps.map((step, idx) => (
                         <div 
                            key={idx} 
                            className={`transition-all duration-700 ${idx <= currentStepIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                         >
                             <div className="text-slate-500 text-xs font-bold uppercase mb-2 border-b border-slate-800 pb-1">
                                 {t('step', systemLanguage)} {idx + 1}
                             </div>
                             <div className="text-white text-2xl md:text-3xl text-center font-serif mb-4">
                                 {renderLatex(step.latex)}
                             </div>
                             <div className={`text-center text-green-300 font-mono text-sm ${idx === currentStepIndex ? 'bg-green-900/20 p-2 rounded border border-green-900/50' : ''}`}>
                                 {step.explanation}
                             </div>
                         </div>
                     ))}
                 </div>

                 {currentStepIndex === steps.length - 1 && steps.length > 0 && (
                     <div className="mt-12 text-amber-400 font-bold text-xl animate-pulse border-t-2 border-amber-400 pt-4">
                         ✨ {t('mathFinished', systemLanguage)}
                     </div>
                 )}
            </div>
        </div>
    );
};

export default MathTutor;
