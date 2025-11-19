
import React, { useState, useRef, useEffect } from 'react';
import { generatePodcast } from '../services/genai';
import { GoogleDriveService } from '../services/googleDrive';
import { Theme } from '../types';
import { t } from '../utils/translations';
import AudioVisualizer from './AudioVisualizer';
import { audioBufferToWav } from '../utils/audio';

interface PodcastPlayerProps {
    studyMaterial: string;
    language: string;
    systemLanguage: string;
    theme: Theme;
}

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ studyMaterial, language, systemLanguage, theme }) => {
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

    useEffect(() => {
        // Cleanup blob URLs to avoid memory leaks
        return () => {
            if (audioSrc) URL.revokeObjectURL(audioSrc);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
        setAudioSrc(null);
        const buffer = await generatePodcast(studyMaterial, language);
        
        if (buffer) {
            setAudioBuffer(buffer);
            const wavData = audioBufferToWav(buffer);
            const byteCharacters = atob(wavData.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            setAudioSrc(url);
        }
        setLoading(false);
    };

    const handleSaveToDrive = async () => {
        if (!audioBuffer) return;
        setSaving(true);
        try {
            const wavData = audioBufferToWav(audioBuffer);
            const byteCharacters = atob(wavData.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/wav' });
            
            await GoogleDriveService.uploadFile(blob, `StudyAi_Podcast_${Date.now()}.wav`, 'audio/wav');
            alert(t('saved', systemLanguage));
        } catch (e) {
            console.error(e);
            alert(t('driveError', systemLanguage) + ". " + t('driveLogin', systemLanguage));
        } finally {
            setSaving(false);
        }
    };

    // Initialize Audio Context for Visualizer when audio src is ready
    useEffect(() => {
        if (audioSrc && audioRef.current && !audioContextRef.current) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyserRef.current = analyser;

            // Connect audio element to analyser
            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            sourceNodeRef.current = source;
        }
    }, [audioSrc]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (audioRef.current.paused) {
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            audioRef.current.play();
            setIsPlaying(true);
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const changeSpeed = (speed: number) => {
        setPlaybackSpeed(speed);
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!audioSrc && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-6 animate-fadeIn text-center max-w-md mx-auto">
                <div className="text-6xl">🎧</div>
                <p className={theme.textSecondary}>{t('podcastDesc', systemLanguage)}</p>
                <button 
                    onClick={handleGenerate}
                    className={`px-8 py-3 rounded-xl font-bold shadow-lg ${theme.primaryBtn}`}
                >
                    {t('genPodcast', systemLanguage)}
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-fadeIn">
                 <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${theme.accentColor.replace('text-', 'border-')}`}></div>
                 <p className={theme.textSecondary}>Analyzing syllabus & recording podcast...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto animate-fadeIn space-y-6">
            <audio 
                ref={audioRef} 
                src={audioSrc!} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            {/* Visualizer Area */}
            <div className={`relative w-full h-48 rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-2xl flex items-center justify-center`}>
                <AudioVisualizer analyser={analyserRef.current} isPlaying={isPlaying} barColor={theme.visualizerColor} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     {!isPlaying && <div className="text-6xl opacity-50">▶️</div>}
                </div>
                
                {/* Time Overlay */}
                <div className="absolute bottom-2 right-4 text-xs font-mono text-slate-400 bg-black/50 px-2 py-1 rounded">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full flex items-center space-x-3">
                <span className="text-xs font-mono text-slate-400">{formatTime(currentTime)}</span>
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 0} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="flex-grow h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-xs font-mono text-slate-400">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full">
                 <div className="flex items-center space-x-2">
                     <span className={`text-xs font-bold ${theme.textSecondary}`}>{t('speedLabel', systemLanguage)}</span>
                     <select 
                        value={playbackSpeed}
                        onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                        className={`px-2 py-1 rounded bg-slate-800 text-white text-xs border border-slate-700 outline-none`}
                     >
                         <option value="0.5">0.5x</option>
                         <option value="1.0">1.0x</option>
                         <option value="1.5">1.5x</option>
                         <option value="2.0">2.0x</option>
                     </select>
                 </div>

                 <button 
                    onClick={togglePlay}
                    className={`px-8 py-4 rounded-full font-bold text-xl shadow-lg transition-transform hover:scale-105 ${theme.primaryBtn}`}
                 >
                     {isPlaying ? "Pause" : "Play"}
                 </button>

                 <button 
                    onClick={handleSaveToDrive}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg font-bold border text-sm transition-colors flex items-center ${theme.cardBorder} ${theme.textSecondary} hover:bg-slate-800`}
                 >
                     <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                     {saving ? t('saving', systemLanguage) : t('saveToDrive', systemLanguage)}
                 </button>
            </div>
        </div>
    );
};

export default PodcastPlayer;
