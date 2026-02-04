import { useState, useRef, useEffect } from 'react';
import { LANGUAGES, VoiceGender } from '../types';
import api from '../services/api';

interface VideoEditorProps {
  videoUrl: string;
  videoId: string;
  onClose: () => void;
  onSaved: (newUrl: string) => void;
}

type FilterType = 'none' | 'grayscale' | 'sepia' | 'contrast' | 'brightness' | 'blur' | 'saturate' | 'vintage';

interface TextOverlay {
  text: string;
  position: 'top' | 'center' | 'bottom';
  fontSize: number;
  color: string;
}

const FILTERS: { value: FilterType; label: string; css: string }[] = [
  { value: 'none', label: '🚫 Sin filtro', css: 'none' },
  { value: 'grayscale', label: '⬛ Blanco y Negro', css: 'grayscale(100%)' },
  { value: 'sepia', label: '🟤 Sepia', css: 'sepia(80%)' },
  { value: 'contrast', label: '🔲 Alto Contraste', css: 'contrast(150%)' },
  { value: 'brightness', label: '☀️ Brillante', css: 'brightness(130%)' },
  { value: 'blur', label: '🌫️ Desenfoque', css: 'blur(2px)' },
  { value: 'saturate', label: '🌈 Saturado', css: 'saturate(200%)' },
  { value: 'vintage', label: '📷 Vintage', css: 'sepia(40%) contrast(120%) brightness(90%)' },
];

export default function VideoEditor({ videoUrl, videoId, onClose, onSaved }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [filter, setFilter] = useState<FilterType>('none');
  const [textOverlay, setTextOverlay] = useState<TextOverlay>({
    text: '',
    position: 'bottom',
    fontSize: 24,
    color: '#ffffff',
  });
  const [showVoiceover, setShowVoiceover] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceLang, setVoiceLang] = useState('es');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<'trim' | 'text' | 'voice' | 'filter' | 'speed'>('trim');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);

    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const filterCss = FILTERS.find(f => f.value === filter)?.css || 'none';

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const result = await api.post<{ url: string }>('/generation/edit-video', {
        videoUrl,
        videoId,
        trimStart,
        trimEnd,
        speed,
        filter,
        textOverlay: textOverlay.text ? textOverlay : null,
        voiceover: showVoiceover && voiceText ? {
          text: voiceText,
          language: voiceLang,
          gender: voiceGender,
        } : null,
      });
      onSaved(result.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al procesar video');
    } finally {
      setIsProcessing(false);
    }
  };

  const sections = [
    { id: 'trim' as const, label: '✂️ Cortar', icon: '✂️' },
    { id: 'text' as const, label: '📝 Texto', icon: '📝' },
    { id: 'voice' as const, label: '🎙️ Voz', icon: '🎙️' },
    { id: 'filter' as const, label: '🎨 Filtro', icon: '🎨' },
    { id: 'speed' as const, label: '⏩ Velocidad', icon: '⏩' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <h2 className="text-white text-lg font-bold">🎬 Editor de Video</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              isProcessing
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r accent-gradient text-white hover:from-violet-500 hover:to-fuchsia-500'
            }`}
          >
            {isProcessing ? '⏳ Procesando...' : '💾 Exportar Video'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl text-sm hover:text-white hover:bg-gray-700 transition-colors"
          >
            ✕ Cerrar
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video Preview */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="relative max-w-2xl w-full">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-2xl"
              style={{ filter: filterCss }}
            />
            {/* Text overlay preview */}
            {textOverlay.text && (
              <div
                className={`absolute left-0 right-0 text-center px-4 pointer-events-none ${
                  textOverlay.position === 'top' ? 'top-4' :
                  textOverlay.position === 'center' ? 'top-1/2 -translate-y-1/2' :
                  'bottom-12'
                }`}
              >
                <span
                  style={{
                    fontSize: `${textOverlay.fontSize}px`,
                    color: textOverlay.color,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontWeight: 'bold',
                  }}
                >
                  {textOverlay.text}
                </span>
              </div>
            )}
          </div>
          {/* Timeline */}
          <div className="mt-4 w-full max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-1.5 relative">
                <div
                  className="absolute h-full accent-bg rounded-full"
                  style={{ left: `${(trimStart / duration) * 100}%`, width: `${((trimEnd - trimStart) / duration) * 100}%` }}
                />
                <div
                  className="absolute h-full w-1 bg-white rounded-full"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Editor Panel */}
        <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
          {/* Section Tabs */}
          <div className="flex border-b border-gray-800 overflow-x-auto">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 px-3 py-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeSection === s.id
                    ? 'bg-gray-800 text-white border-b-2 accent-border'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeSection === 'trim' && (
              <>
                <h3 className="text-white font-medium">✂️ Cortar Video</h3>
                <div>
                  <label className="text-gray-400 text-sm">Inicio: {formatTime(trimStart)}</label>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTrimStart(Math.min(v, trimEnd - 0.5));
                    }}
                    className="w-full accent-violet-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Fin: {formatTime(trimEnd)}</label>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTrimEnd(Math.max(v, trimStart + 0.5));
                    }}
                    className="w-full accent-violet-500"
                  />
                </div>
                <p className="text-gray-500 text-xs">
                  Duración: {formatTime(trimEnd - trimStart)}
                </p>
              </>
            )}

            {activeSection === 'text' && (
              <>
                <h3 className="text-white font-medium">📝 Texto sobre el video</h3>
                <input
                  type="text"
                  value={textOverlay.text}
                  onChange={(e) => setTextOverlay({ ...textOverlay, text: e.target.value })}
                  placeholder="Escribe el texto..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 accent-ring-focus"
                />
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Posición</label>
                  <div className="flex gap-2">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setTextOverlay({ ...textOverlay, position: pos })}
                        className={`flex-1 py-2 rounded-lg text-sm ${
                          textOverlay.position === pos
                            ? 'accent-bg text-white'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        {pos === 'top' ? '⬆️ Arriba' : pos === 'center' ? '⬅️ Centro' : '⬇️ Abajo'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">
                    Tamaño: {textOverlay.fontSize}px
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={72}
                    value={textOverlay.fontSize}
                    onChange={(e) => setTextOverlay({ ...textOverlay, fontSize: parseInt(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Color</label>
                  <div className="flex gap-2">
                    {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setTextOverlay({ ...textOverlay, color: c })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          textOverlay.color === c ? 'accent-border scale-110' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeSection === 'voice' && (
              <>
                <h3 className="text-white font-medium">🎙️ Agregar Voz al Video</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVoiceover}
                    onChange={(e) => setShowVoiceover(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span className="text-gray-300 text-sm">Agregar narración</span>
                </label>
                {showVoiceover && (
                  <div className="space-y-4">
                    <textarea
                      value={voiceText}
                      onChange={(e) => setVoiceText(e.target.value)}
                      placeholder="Escribe lo que quieres que diga la voz..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setVoiceGender('female')}
                        className={`flex-1 py-2 rounded-lg text-sm ${
                          voiceGender === 'female' ? 'accent-bg text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        👩 Mujer
                      </button>
                      <button
                        onClick={() => setVoiceGender('male')}
                        className={`flex-1 py-2 rounded-lg text-sm ${
                          voiceGender === 'male' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        👨 Hombre
                      </button>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Idioma</label>
                      <select
                        value={voiceLang}
                        onChange={(e) => setVoiceLang(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeSection === 'filter' && (
              <>
                <h3 className="text-white font-medium">🎨 Filtros</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value)}
                      className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        filter === f.value
                          ? 'accent-bg text-white shadow-lg'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 accent-border-hover'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSection === 'speed' && (
              <>
                <h3 className="text-white font-medium">⏩ Velocidad</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        speed === s
                          ? 'accent-bg text-white shadow-lg'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 accent-border-hover'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 text-xs">
                  {speed < 1 ? '🐌 Cámara lenta' : speed > 1 ? '🏃 Cámara rápida' : '▶️ Normal'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
