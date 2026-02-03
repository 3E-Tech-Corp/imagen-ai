import { useState } from 'react';
import { VoiceGender, LANGUAGES } from '../types';

interface VoiceGeneratorProps {
  onGenerate: (text: string, language: string, gender: VoiceGender) => void;
  isGenerating: boolean;
}

export default function VoiceGenerator({ onGenerate, isGenerating }: VoiceGeneratorProps) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('es');
  const [gender, setGender] = useState<VoiceGender>('female');
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isGenerating) return;
    onGenerate(text.trim(), language, gender);
  };

  const popularLanguages = LANGUAGES.slice(0, 10);
  const displayedLanguages = showAllLanguages ? LANGUAGES : popularLanguages;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Text to speak */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          💬 ¿Qué quieres que diga?
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Escribe el texto que quieres convertir en voz... Ej: "Hola, bienvenidos a mi canal. Hoy vamos a explorar el mundo de la inteligencia artificial."'
          rows={4}
          className="w-full px-5 py-4 bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-lg"
        />
        <p className="text-gray-500 text-xs mt-1 text-right">{text.length} caracteres</p>
      </div>

      {/* Gender selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          👤 Tipo de voz
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setGender('female')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
              gender === 'female'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/25'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-pink-500'
            }`}
          >
            👩 Voz Femenina
          </button>
          <button
            type="button"
            onClick={() => setGender('male')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
              gender === 'male'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-blue-500'
            }`}
          >
            👨 Voz Masculina
          </button>
        </div>
      </div>

      {/* Language selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          🌍 Idioma
        </label>
        <div className="flex flex-wrap gap-2">
          {displayedLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                language === lang.code
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-emerald-500 hover:text-white'
              }`}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
        {!showAllLanguages && LANGUAGES.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAllLanguages(true)}
            className="mt-2 text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
          >
            + Ver {LANGUAGES.length - 10} idiomas más...
          </button>
        )}
        {showAllLanguages && (
          <button
            type="button"
            onClick={() => setShowAllLanguages(false)}
            className="mt-2 text-gray-400 text-sm hover:text-gray-300 transition-colors"
          >
            ▲ Mostrar menos
          </button>
        )}
      </div>

      {/* Generate button */}
      <button
        type="submit"
        disabled={!text.trim() || isGenerating}
        className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
          isGenerating
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/40'
        }`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generando voz...
          </span>
        ) : (
          '🎙️ Generar Voz'
        )}
      </button>
    </form>
  );
}
