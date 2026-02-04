import { useState, useRef, useCallback } from 'react';
import {
  GenerationType, STYLES, ENVIRONMENTS, TIME_PERIODS,
  LIGHTING_OPTIONS, EMOTIONS, QUALITY_OPTIONS, USE_CASES,
} from '../types';
import VoiceInput from './VoiceInput';

interface PromptInputProps {
  type: GenerationType;
  onGenerate: (prompt: string, options: GenerationOptions) => void;
  isGenerating: boolean;
}

export interface GenerationOptions {
  style: string;
  environment: string;
  timePeriod: string;
  lighting: string;
  emotion: string;
  quality: string;
  useCase: string;
  negativePrompt?: string;
  videoSpeed?: string;
  referenceImages?: string[];
}

type SectionId = 'style' | 'references' | 'scene' | 'mood' | 'quality' | 'advanced';

export default function PromptInput({ type, onGenerate, isGenerating }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('photorealistic');
  const [environment, setEnvironment] = useState('any');
  const [timePeriod, setTimePeriod] = useState('any');
  const [lighting, setLighting] = useState('any');
  const [emotion, setEmotion] = useState('any');
  const [quality, setQuality] = useState('ultra');
  const [useCase, setUseCase] = useState('any');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [videoSpeed, setVideoSpeed] = useState('fast');
  const [expandedSection, setExpandedSection] = useState<SectionId | null>('style');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), {
      style, environment, timePeriod, lighting, emotion, quality, useCase,
      negativePrompt: negativePrompt.trim() || undefined,
      videoSpeed: type === 'video' ? videoSpeed : undefined,
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
    });
  };

  const toggleSection = (id: SectionId) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    setPrompt((prev) => {
      const trimmed = prev.trim();
      if (trimmed && !trimmed.endsWith('.') && !trimmed.endsWith(',') && !trimmed.endsWith('!') && !trimmed.endsWith('?')) {
        return trimmed + ' ' + text;
      }
      return trimmed ? trimmed + ' ' + text : text;
    });
  }, []);

  // Reference image handling
  const processFile = useCallback((file: File) => {
    if (referenceImages.length >= 5) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) return;
    
    // Max 10MB per file
    if (file.size > 10 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setReferenceImages((prev) => {
          if (prev.length >= 5) return prev;
          return [...prev, result];
        });
      }
    };
    reader.readAsDataURL(file);
  }, [referenceImages.length]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(processFile);
    e.target.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    Array.from(files).forEach(processFile);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeReference = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const placeholders = type === 'image'
    ? 'Describe la imagen que quieres crear... Ej: "Una mujer joven con cabello rojo caminando por un bosque encantado al atardecer, con luciérnagas brillando a su alrededor"'
    : 'Describe el video que quieres crear... Ej: "Un león majestuoso caminando por la sabana africana al amanecer, con la cámara siguiéndolo de cerca"';

  const sections: { id: SectionId; label: string; emoji: string; summary: string }[] = [
    {
      id: 'style',
      label: 'Estilo Visual',
      emoji: '🎨',
      summary: STYLES.find(s => s.value === style)?.label || style,
    },
    {
      id: 'references',
      label: 'Referencias',
      emoji: '📎',
      summary: referenceImages.length > 0 ? `${referenceImages.length} archivo${referenceImages.length > 1 ? 's' : ''}` : 'Sin referencias',
    },
    {
      id: 'scene',
      label: 'Escena y Época',
      emoji: '🌍',
      summary: [
        ENVIRONMENTS.find(e => e.value === environment)?.label,
        TIME_PERIODS.find(t => t.value === timePeriod)?.label,
        LIGHTING_OPTIONS.find(l => l.value === lighting)?.label,
      ].filter(x => x && x !== 'Cualquiera' && x !== 'Automático').join(' · ') || 'Automático',
    },
    {
      id: 'mood',
      label: 'Emoción y Atmósfera',
      emoji: '✨',
      summary: EMOTIONS.find(e => e.value === emotion)?.label || 'Neutral',
    },
    {
      id: 'quality',
      label: 'Calidad y Uso',
      emoji: '🏆',
      summary: [
        QUALITY_OPTIONS.find(q => q.value === quality)?.label,
        USE_CASES.find(u => u.value === useCase)?.label,
      ].filter(x => x && x !== 'General').join(' · ') || 'Ultra HD',
    },
    {
      id: 'advanced',
      label: 'Opciones Avanzadas',
      emoji: '⚙️',
      summary: negativePrompt ? 'Configurado' : 'Sin configurar',
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Main prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {type === 'image' ? '🖼️ Describe tu imagen' : '🎬 Describe tu video'}
        </label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholders}
            rows={4}
            className="w-full px-5 py-4 pr-14 bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 accent-ring-focus focus:border-transparent resize-none text-lg"
          />
          {/* Voice input button - bottom right of textarea */}
          <div className="absolute bottom-3 right-3">
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>
        </div>
      </div>

      {/* Collapsible sections */}
      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{section.emoji}</span>
                <span className="text-white text-sm font-medium">{section.label}</span>
                <span className="text-gray-500 text-xs">— {section.summary}</span>
              </div>
              <span className="text-gray-500 text-sm">
                {expandedSection === section.id ? '▼' : '▶'}
              </span>
            </button>

            {expandedSection === section.id && (
              <div className="px-4 pb-4 pt-1">
                {section.id === 'style' && (
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStyle(s.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          style === s.value
                            ? 'accent-bg text-white shadow-lg accent-shadow'
                            : 'bg-gray-900 text-gray-400 border border-gray-700 accent-border-hover hover:text-white'
                        }`}
                      >
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {section.id === 'references' && (
                  <div className="space-y-3">
                    {/* Drop zone */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => referenceImages.length < 5 && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'accent-border accent-bg/10'
                          : referenceImages.length >= 5
                            ? 'border-gray-700 bg-gray-900/30 cursor-not-allowed opacity-50'
                            : 'border-gray-700 accent-border-hover/50 hover:bg-gray-900/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={referenceImages.length >= 5}
                      />
                      <p className="text-gray-400 text-sm">
                        {referenceImages.length >= 5
                          ? '📎 Máximo 5 referencias alcanzado'
                          : isDragging
                            ? '📎 Suelta aquí...'
                            : '📎 Arrastra imágenes/videos o haz clic para subir'}
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        Máx. 5 archivos · JPG, PNG, GIF, WebP, MP4
                      </p>
                    </div>

                    {/* Thumbnails */}
                    {referenceImages.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {referenceImages.map((ref, index) => (
                          <div key={index} className="relative flex-shrink-0 group">
                            {ref.startsWith('data:video') ? (
                              <video
                                src={ref}
                                className="w-20 h-20 object-cover rounded-xl border border-gray-700"
                                muted
                              />
                            ) : (
                              <img
                                src={ref}
                                alt={`Referencia ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-xl border border-gray-700"
                              />
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeReference(index); }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              ✕
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {referenceImages.length > 0 && (
                      <p className="text-gray-500 text-xs">
                        💡 La primera imagen se usará como referencia principal para la generación
                      </p>
                    )}
                  </div>
                )}

                {section.id === 'scene' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Ambiente</p>
                      <div className="flex flex-wrap gap-2">
                        {ENVIRONMENTS.map((e) => (
                          <button
                            key={e.value} type="button" onClick={() => setEnvironment(e.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              environment === e.value ? 'accent-bg text-white' : 'bg-gray-900 text-gray-400 border border-gray-700 hover:text-white'
                            }`}
                          >
                            {e.emoji} {e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Época</p>
                      <div className="flex flex-wrap gap-2">
                        {TIME_PERIODS.map((t) => (
                          <button
                            key={t.value} type="button" onClick={() => setTimePeriod(t.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              timePeriod === t.value ? 'accent-bg text-white' : 'bg-gray-900 text-gray-400 border border-gray-700 hover:text-white'
                            }`}
                          >
                            {t.emoji} {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Iluminación</p>
                      <div className="flex flex-wrap gap-2">
                        {LIGHTING_OPTIONS.map((l) => (
                          <button
                            key={l.value} type="button" onClick={() => setLighting(l.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              lighting === l.value ? 'accent-bg text-white' : 'bg-gray-900 text-gray-400 border border-gray-700 hover:text-white'
                            }`}
                          >
                            {l.emoji} {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {section.id === 'mood' && (
                  <div className="flex flex-wrap gap-2">
                    {EMOTIONS.map((e) => (
                      <button
                        key={e.value} type="button" onClick={() => setEmotion(e.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          emotion === e.value
                            ? 'accent-bg text-white shadow-lg'
                            : 'bg-gray-900 text-gray-400 border border-gray-700 accent-border-hover hover:text-white'
                        }`}
                      >
                        {e.emoji} {e.label}
                      </button>
                    ))}
                  </div>
                )}

                {section.id === 'quality' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Calidad</p>
                      <div className="flex flex-wrap gap-2">
                        {QUALITY_OPTIONS.map((q) => (
                          <button
                            key={q.value} type="button" onClick={() => setQuality(q.value)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium ${
                              quality === q.value ? 'accent-bg text-white' : 'bg-gray-900 text-gray-400 border border-gray-700 hover:text-white'
                            }`}
                          >
                            {q.emoji} {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Uso final</p>
                      <div className="flex flex-wrap gap-2">
                        {USE_CASES.map((u) => (
                          <button
                            key={u.value} type="button" onClick={() => setUseCase(u.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              useCase === u.value ? 'accent-bg text-white' : 'bg-gray-900 text-gray-400 border border-gray-700 hover:text-white'
                            }`}
                          >
                            {u.emoji} {u.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {section.id === 'advanced' && (
                  <div className="space-y-3">
                    {type === 'video' && (
                      <div>
                        <p className="text-gray-400 text-xs mb-2">⚡ Velocidad de generación</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setVideoSpeed('fast')}
                            className={`flex-1 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                              videoSpeed === 'fast'
                                ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
                                : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-green-500'
                            }`}
                          >
                            ⚡ Rápido (~30-60 seg)
                          </button>
                          <button
                            type="button"
                            onClick={() => setVideoSpeed('quality')}
                            className={`flex-1 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                              videoSpeed === 'quality'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                                : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-purple-500'
                            }`}
                          >
                            🎬 Alta Calidad (~3-5 min)
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Prompt negativo (lo que NO quieres ver)
                      </label>
                      <input
                        type="text"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="Ej: borroso, baja calidad, deformado, texto, marca de agua..."
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 accent-ring-focus text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Generate button */}
      <button
        type="submit"
        disabled={!prompt.trim() || isGenerating}
        className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
          isGenerating
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : type === 'image'
              ? 'bg-gradient-to-r accent-gradient text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-lg accent-shadow'
              : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:from-fuchsia-500 hover:to-pink-500 shadow-lg shadow-fuchsia-600/25'
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
