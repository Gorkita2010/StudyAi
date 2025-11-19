
import React, { useEffect, useRef, useState } from 'react';
import { GameConfig, Theme } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { base64ToUint8Array, createPCM16Blob, decodeAudioData } from '../utils/audio';
import AudioVisualizer from './AudioVisualizer';
import { t } from '../utils/translations';

interface LiveGameProps {
  config: GameConfig;
  onExit: (score: number) => void;
  systemLanguage: string;
  theme: Theme;
}

const scoreTool: FunctionDeclaration = {
  name: 'reportAnswerResult',
  description: 'Call this function after the student answers to grade them.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      isCorrect: {
        type: Type.BOOLEAN,
        description: 'True if the answer demonstrates understanding of the syllabus.',
      },
      feedbackSummary: {
        type: Type.STRING,
        description: 'A very short summary of why it was correct or incorrect.'
      }
    },
    required: ['isCorrect'],
  },
};

const LiveGame: React.FC<LiveGameProps> = ({ config, onExit, systemLanguage, theme }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(t('waitingStart', systemLanguage));
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false); 
  const [score, setScore] = useState(0);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [lastFeedback, setLastFeedback] = useState('');
  
  // Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    try { sessionRef.current?.close(); } catch (e) {}
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    activeSourcesRef.current.forEach(source => source.stop());
    activeSourcesRef.current.clear();
  };

  const handleStart = async () => {
      setIsStarted(true);
      await startSession();
  }

  const startSession = async () => {
    try {
      setStatus(t('accessMic', systemLanguage));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setStatus(t('preparing', systemLanguage));
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 256;
      outputNode.connect(analyser);
      analyserRef.current = analyser;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [scoreTool] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: `
            ROLE: ${config.examinerStyle}
            TASK: Conduct an ORAL EXAM based on the provided syllabus.
            
            SYLLABUS MATERIAL:
            """
            ${config.studyMaterial.substring(0, 100000)}
            """
            
            LANGUAGE: ${config.language} (You MUST speak in this language).
            
            INSTRUCTIONS:
            1. This exam will consist of EXACTLY ${config.totalQuestions} questions.
            2. Start by introducing the exam.
            3. Ask questions in order of IMPORTANCE. The first question should cover the most critical concept. The last question should cover the least critical (but still relevant) concept.
            4. Listen to the student's answer.
            5. Determine if the answer is correct based on the syllabus text.
            6. IMPORTANT: Call the tool 'reportAnswerResult' to log the grade.
            7. Give verbal feedback (correct/incorrect and why).
            8. Ask the NEXT question.
            9. After ${config.totalQuestions} questions, conclude the exam and say goodbye.
          `,
        },
        callbacks: {
          onopen: () => {
            setConnected(true);
            setStatus(t('inProgress', systemLanguage));
            
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPCM16Blob(inputData);
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination); 
          },
          onmessage: async (msg: LiveServerMessage) => {
            const { serverContent, toolCall } = msg;

            if (toolCall) {
                for (const fc of toolCall.functionCalls) {
                    if (fc.name === 'reportAnswerResult') {
                        const isCorrect = fc.args['isCorrect'] === true;
                        const feedback = fc.args['feedbackSummary'] as string;
                        
                        setLastFeedback(feedback || (isCorrect ? t('pass', systemLanguage) : t('review', systemLanguage)));
                        setQuestionsAsked(q => q + 1);
                        if (isCorrect) setScore(s => s + 1);

                        sessionPromise.then(session => {
                            session.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: "Grade logged." } 
                                }
                            });
                        });
                    }
                }
            }

            const audioStr = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioStr) {
              setIsSpeaking(true);
              const ctx = outputAudioContextRef.current;
              if (!ctx) return;

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(base64ToUint8Array(audioStr), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyser); // Connect to analyser for visualizer
              source.connect(ctx.destination); // Connect to speakers
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
              
              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
              };
            }

            if (serverContent?.interrupted) {
              activeSourcesRef.current.forEach(src => src.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            setConnected(false);
            setStatus(t('finished', systemLanguage));
          },
          onerror: (err) => {
            console.error(err);
            setError("Connection Lost. Please restart.");
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      console.error("Setup failed", e);
      setError("Failed to start exam session.");
    }
  };

  if (!isStarted) {
      return (
        <div className={`flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn space-y-8 text-center px-4`}>
             <div className={`p-6 rounded-full ${theme.cardBg} ${theme.textMain} shadow-2xl`}>
                <span className="text-6xl">🎙️</span>
             </div>
             <h2 className={`text-3xl font-bold ${theme.textMain}`}>{t('readyTitle', systemLanguage)}</h2>
             <p className={`${theme.textSecondary} max-w-md`}>
                 {t('readyDesc', systemLanguage)}
             </p>
             <p className={`text-sm ${theme.accentColor} font-bold`}>
                 Questions: {config.totalQuestions}
             </p>
             <button 
                onClick={handleStart}
                className={`px-10 py-4 rounded-full text-xl font-bold shadow-xl transition-transform hover:scale-105 ${theme.primaryBtn}`}
             >
                {t('startBtn', systemLanguage)}
             </button>
        </div>
      )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 w-full max-w-3xl mx-auto animate-fadeIn px-4">
      
      {/* Header Status */}
      <div className={`w-full flex justify-between items-center p-4 rounded-xl transition-colors duration-300 ${theme.cardBg} ${theme.cardBorder}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}></div>
            <div>
                <h2 className={`font-bold text-lg ${theme.textMain}`}>{t('oralTitle', systemLanguage)}</h2>
                <p className={`text-xs uppercase tracking-wide ${theme.textSecondary}`}>{status}</p>
            </div>
          </div>
          <div className="text-right">
              <p className={`text-xs uppercase ${theme.textSecondary}`}>{t('score', systemLanguage)}</p>
              <p className={`text-2xl font-black ${theme.accentColor}`}>{score} <span className={`text-lg opacity-50 ${theme.textMain}`}>/ {questionsAsked}</span></p>
          </div>
      </div>

      {/* Visualizer / Avatar */}
      <div className={`w-full relative rounded-2xl overflow-hidden h-64 flex items-center justify-center transition-all duration-300 border-2 ${theme.cardBorder} bg-black/90`}>
        <AudioVisualizer analyser={analyserRef.current} isPlaying={isSpeaking} barColor={theme.visualizerColor} />
        {!connected && !error && (
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
                <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${theme.accentColor.replace('text-', 'border-')}`}></div>
            </div>
        )}
        <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className={`${theme.textSecondary} text-sm font-mono`}>
                {isSpeaking ? t('speaking', systemLanguage) : t('listening', systemLanguage)}
            </p>
        </div>
      </div>

      {/* Feedback Area */}
      <div className={`p-6 rounded-xl border w-full text-center min-h-[100px] flex items-center justify-center flex-col transition-colors ${theme.cardBg} ${theme.cardBorder}`}>
        <p className={`text-xs uppercase mb-2 font-bold ${theme.textSecondary}`}>{t('feedbackLabel', systemLanguage)}</p>
        <p className={`font-medium text-lg ${theme.textMain}`}>
            {lastFeedback || "Waiting for first question..."}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-500 w-full text-center">
            {error}
        </div>
      )}

      <div className="flex space-x-4">
        <button
            onClick={() => onExit(score)}
            className={`px-8 py-3 rounded-lg font-bold transition-colors ${theme.secondaryBtn}`}
        >
            {t('endExam', systemLanguage)}
        </button>
        
        <button
            onClick={() => alert("Reported for review.")}
            className={`px-8 py-3 border rounded-lg font-bold transition-colors ${theme.cardBg} ${theme.cardBorder} ${theme.textSecondary} hover:opacity-80`}
        >
            {t('flagIssue', systemLanguage)}
        </button>
      </div>
    </div>
  );
};

export default LiveGame;
