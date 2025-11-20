
import React, { useState, useEffect } from 'react';
import { t } from '../utils/translations';

interface VoiceInputProps {
  onResult: (text: string) => void;
  language: string;
  systemLanguage: string;
  className?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onResult, language, systemLanguage, className }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recon = new SpeechRecognition();
      recon.continuous = false;
      recon.interimResults = true; // We enable this to handle logic correctly, but filtered below
      
      // Basic mapping for supported languages
      const langMap: Record<string, string> = {
          'English': 'en-US',
          'Spanish': 'es-ES',
          'Basque': 'eu-ES',
          'Catalan': 'ca-ES',
          'Galician': 'gl-ES',
          'French': 'fr-FR',
          'German': 'de-DE'
      };
      recon.lang = langMap[language] || 'en-US';
      
      recon.onresult = (event: any) => {
        // CRITICAL FIX: Only process the result if it is marked as "isFinal"
        // This prevents the "stuttering" effect where partial results are appended repeatedly.
        const result = event.results[0];
        if (result.isFinal) {
            const transcript = result[0].transcript;
            onResult(transcript);
            setIsListening(false);
            recon.stop();
        }
      };

      recon.onend = () => setIsListening(false);
      recon.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      setRecognition(recon);
    }
  }, [language]);

  const toggleListen = () => {
    if (!recognition) {
      alert("Speech recognition not supported in this browser. Try Chrome/Edge.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  if (!recognition) return null;

  return (
    <button 
      type="button"
      onClick={toggleListen}
      title={isListening ? t('stopDictation', systemLanguage) : t('startDictation', systemLanguage)}
      className={`${className} flex items-center justify-center transition-all duration-300 ${
        isListening ? 'animate-pulse bg-red-500 text-white shadow-lg shadow-red-500/50 scale-110' : ''
      }`}
    >
      <span className="text-xl">{isListening ? '⏹' : '🎙️'}</span>
    </button>
  );
};

export default VoiceInput;
