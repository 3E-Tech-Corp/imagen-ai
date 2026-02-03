import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  className?: string;
}

type VoiceState = 'idle' | 'listening' | 'processing';

// Extend Window for webkit prefix
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export default function VoiceInput({ onTranscript, language = 'es-ES', className = '' }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState('idle');
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }

    setError(null);
    finalTranscriptRef.current = '';

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current += final;
        onTranscript(final);
      }

      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      switch (event.error) {
        case 'not-allowed':
          setError('Permiso de micrófono denegado. Habilita el micrófono en tu navegador.');
          break;
        case 'no-speech':
          setError('No se detectó voz. Intenta de nuevo.');
          break;
        case 'network':
          setError('Error de red. Verifica tu conexión.');
          break;
        case 'aborted':
          // User stopped — not an error
          break;
        default:
          setError('Error de reconocimiento de voz. Intenta de nuevo.');
      }
      stopListening();
    };

    recognition.onend = () => {
      setState('idle');
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language, onTranscript, stopListening]);

  const toggleListening = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Mic button */}
      <button
        type="button"
        onClick={toggleListening}
        title={state === 'listening' ? 'Detener grabación' : 'Grabar nota de voz'}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          state === 'listening'
            ? 'bg-red-600 text-white shadow-lg shadow-red-600/40'
            : 'bg-gray-700 text-gray-400 hover:bg-violet-600 hover:text-white hover:shadow-lg hover:shadow-violet-600/25'
        }`}
      >
        {/* Pulsing ring when recording */}
        {state === 'listening' && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-red-500 animate-pulse opacity-50" />
          </>
        )}
        
        {/* Mic icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 relative z-10"
        >
          {state === 'listening' ? (
            // Stop icon when recording
            <rect x="6" y="6" width="12" height="12" rx="2" />
          ) : (
            // Mic icon when idle
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          )}
        </svg>
      </button>

      {/* Interim text indicator */}
      {state === 'listening' && interimText && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-[250px] z-20">
          <p className="text-gray-300 text-xs truncate">
            <span className="text-red-400 mr-1">●</span>
            {interimText}
          </p>
        </div>
      )}

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-red-900/90 border border-red-700 rounded-lg shadow-xl max-w-[280px] z-20">
          <p className="text-red-200 text-xs">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 text-xs mt-1 underline"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
