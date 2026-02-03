import { useState } from 'react';
import { GenerationType, ImageStyle } from '../types';

interface PromptInputProps {
  type: GenerationType;
  onGenerate: (prompt: string, style: ImageStyle, negativePrompt?: string) => void;
  isGenerating: boolean;
}

const styles: { value: ImageStyle; label: string; emoji: string }[] = [
  { value: 'photographic', label: 'Fotográfico', emoji: '📷' },
  { value: 'realistic', label: 'Realista', emoji: '🎯' },
  { value: 'artistic', label: 'Artístico', emoji: '🎨' },
  { value: 'anime', label: 'Anime', emoji: '✨' },
  { value: '3d-render', label: '3D Render', emoji: '🧊' },
];

export default function PromptInput({ type, onGenerate, isGenerating }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<ImageStyle>('photographic');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), style, negativePrompt.trim() || undefined);
  };

  const placeholders = type === 'image'
    ? 'Describe la imagen que quieres crear... Ej: "Un gato astronauta flotando en el espacio con la tierra de fondo, estilo fotorealista"'
    : 'Describe el video que quieres crear... Ej: "Un caballo galopando por la playa al atardecer, cámara siguiendo al caballo"';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Main prompt */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholders}
          rows={3}
          className="w-full px-5 py-4 bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-lg"
        />
      </div>

      {/* Style selector */}
      <div className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStyle(s.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              style === s.value
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-violet-500 hover:text-white'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Advanced options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-gray-400 text-sm hover:text-white transition-colors"
        >
          {showAdvanced ? '▼' : '▶'} Opciones avanzadas
        </button>
        {showAdvanced && (
          <div className="mt-3">
            <label className="block text-sm text-gray-400 mb-1">
              Prompt negativo (lo que NO quieres ver)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Ej: borroso, baja calidad, deformado, texto..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
            />
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        type="submit"
        disabled={!prompt.trim() || isGenerating}
        className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
          isGenerating
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : type === 'image'
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40'
              : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:from-fuchsia-500 hover:to-pink-500 shadow-lg shadow-fuchsia-600/25 hover:shadow-fuchsia-500/40'
        }`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {type === 'image' ? 'Generando imagen...' : 'Generando video...'}
          </span>
        ) : (
          type === 'image' ? '✨ Generar Imagen' : '🎬 Generar Video'
        )}
      </button>
    </form>
  );
}
