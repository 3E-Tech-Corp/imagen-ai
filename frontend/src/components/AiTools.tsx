import { useState, useRef, useCallback, DragEvent } from 'react';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────
type ToolId = 'remove-bg' | 'upscale' | 'reimagine' | 'sketch' | 'retouch';

interface ToolCard {
  id: ToolId;
  icon: string;
  title: string;
  description: string;
  gradient: string;
  shadow: string;
}

interface AiToolResult {
  url: string;
  type: string;
}

// ── Tool definitions ───────────────────────────────────────────────────
const TOOLS: ToolCard[] = [
  {
    id: 'remove-bg',
    icon: '🗑️',
    title: 'Quitar Fondo',
    description: 'Elimina el fondo de cualquier imagen al instante con IA',
    gradient: 'from-rose-500 to-pink-600',
    shadow: 'shadow-rose-500/20',
  },
  {
    id: 'upscale',
    icon: '🔍',
    title: 'Mejorar Imagen',
    description: 'Aumenta la resolución y calidad de tus imágenes (2x o 4x)',
    gradient: 'from-cyan-500 to-blue-600',
    shadow: 'shadow-cyan-500/20',
  },
  {
    id: 'reimagine',
    icon: '🎨',
    title: 'Reimaginar',
    description: 'Transforma tu imagen con una nueva visión usando un prompt',
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/20',
  },
  {
    id: 'sketch',
    icon: '✏️',
    title: 'Boceto a Imagen',
    description: 'Convierte un boceto o dibujo en una imagen realista',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/20',
  },
  {
    id: 'retouch',
    icon: '🧹',
    title: 'Retoque IA',
    description: 'Retoca y mejora detalles de tu imagen con instrucciones de texto',
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
  },
];

const SKETCH_STYLES = [
  { value: 'photorealistic', label: 'Fotorrealista' },
  { value: 'anime', label: 'Anime' },
  { value: 'digital-art', label: 'Arte Digital' },
  { value: 'oil-painting', label: 'Pintura al Óleo' },
  { value: 'watercolor', label: 'Acuarela' },
];

// ── Image Dropzone ─────────────────────────────────────────────────────
function ImageDropzone({
  imagePreview,
  onImageSelect,
  label,
}: {
  imagePreview: string | null;
  onImageSelect: (dataUrl: string) => void;
  label?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => onImageSelect(reader.result as string);
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden ${
        isDragging
          ? 'border-violet-400 bg-violet-500/10'
          : imagePreview
          ? 'border-gray-700 bg-gray-800/50'
          : 'border-gray-700 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {imagePreview ? (
        <div className="p-4">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-64 mx-auto rounded-xl object-contain"
          />
          <p className="text-center text-gray-400 text-sm mt-3">
            Haz clic para cambiar la imagen
          </p>
        </div>
      ) : (
        <div className="p-10 text-center">
          <div className="text-5xl mb-4">📁</div>
          <p className="text-gray-300 font-medium mb-1">
            {label || 'Arrastra tu imagen aquí'}
          </p>
          <p className="text-gray-500 text-sm">
            o haz clic para seleccionar un archivo
          </p>
          <p className="text-gray-600 text-xs mt-2">PNG, JPG, WEBP</p>
        </div>
      )}
    </div>
  );
}

// ── Result Display ─────────────────────────────────────────────────────
function ResultDisplay({
  originalPreview,
  resultUrl,
  showSideBySide,
}: {
  originalPreview: string | null;
  resultUrl: string;
  showSideBySide?: boolean;
}) {
  const handleDownload = async () => {
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultado-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(resultUrl, '_blank');
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold text-lg">✨ Resultado</h4>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center gap-2"
        >
          💾 Descargar
        </button>
      </div>

      {showSideBySide && originalPreview ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-2xl p-3">
            <p className="text-gray-400 text-xs text-center mb-2 font-medium uppercase tracking-wider">
              Original
            </p>
            <img
              src={originalPreview}
              alt="Original"
              className="w-full rounded-xl object-contain max-h-80"
            />
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-3">
            <p className="text-violet-400 text-xs text-center mb-2 font-medium uppercase tracking-wider">
              Resultado
            </p>
            <img
              src={resultUrl}
              alt="Result"
              className="w-full rounded-xl object-contain max-h-80"
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-2xl p-4 flex justify-center"
          style={resultUrl.includes('birefnet') || resultUrl.includes('rembg') ? { backgroundImage: 'url("data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23333%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23333%22%2F%3E%3Crect%20x%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23444%22%2F%3E%3Crect%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23444%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'repeat' } : {}}
        >
          <img
            src={resultUrl}
            alt="Result"
            className="max-h-96 rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

// ── Tool-specific interfaces ───────────────────────────────────────────

function RemoveBackgroundTool() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (dataUrl: string) => {
    setImagePreview(dataUrl);
    setImageData(dataUrl);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<AiToolResult>('/ai-tools/remove-background', {
        imageUrl: imageData,
      });
      setResult(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone imagePreview={imagePreview} onImageSelect={handleImageSelect} />
      <button
        onClick={handleProcess}
        disabled={!imageData || loading}
        className="w-full py-3 px-6 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-rose-400 hover:to-pink-500 transition-all flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Procesando...
          </>
        ) : (
          '🗑️ Quitar Fondo'
        )}
      </button>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
      {result && (
        <ResultDisplay originalPreview={imagePreview} resultUrl={result} showSideBySide />
      )}
    </div>
  );
}

function UpscaleTool() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [scale, setScale] = useState(2);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (dataUrl: string) => {
    setImagePreview(dataUrl);
    setImageData(dataUrl);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<AiToolResult>('/ai-tools/upscale', {
        imageUrl: imageData,
        scale,
      });
      setResult(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone imagePreview={imagePreview} onImageSelect={handleImageSelect} />

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Factor de escala</label>
        <div className="flex gap-3">
          {[2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`flex-1 py-3 rounded-xl font-semibold text-lg transition-all ${
                scale === s
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={!imageData || loading}
        className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Procesando...
          </>
        ) : (
          '🔍 Mejorar Imagen'
        )}
      </button>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
      {result && (
        <ResultDisplay originalPreview={imagePreview} resultUrl={result} showSideBySide />
      )}
    </div>
  );
}

function ReimagineTool() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [strength, setStrength] = useState(0.75);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (dataUrl: string) => {
    setImagePreview(dataUrl);
    setImageData(dataUrl);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!imageData || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<AiToolResult>('/ai-tools/reimagine', {
        imageUrl: imageData,
        prompt: prompt.trim(),
        strength,
      });
      setResult(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone imagePreview={imagePreview} onImageSelect={handleImageSelect} />

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Describe la transformación
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: Transforma en un paisaje de fantasía con dragones volando..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Intensidad de transformación: {Math.round(strength * 100)}%
        </label>
        <input
          type="range"
          min={0.1}
          max={0.95}
          step={0.05}
          value={strength}
          onChange={(e) => setStrength(parseFloat(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-gray-500 text-xs mt-1">
          <span>Sutil</span>
          <span>Extrema</span>
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={!imageData || !prompt.trim() || loading}
        className="w-full py-3 px-6 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-400 hover:to-purple-500 transition-all flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Procesando...
          </>
        ) : (
          '🎨 Reimaginar'
        )}
      </button>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
      {result && (
        <ResultDisplay originalPreview={imagePreview} resultUrl={result} showSideBySide />
      )}
    </div>
  );
}

function SketchToImageTool() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('photorealistic');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (dataUrl: string) => {
    setImagePreview(dataUrl);
    setImageData(dataUrl);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!imageData || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<AiToolResult>('/ai-tools/sketch-to-image', {
        imageUrl: imageData,
        prompt: prompt.trim(),
        style,
      });
      setResult(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone
        imagePreview={imagePreview}
        onImageSelect={handleImageSelect}
        label="Arrastra tu boceto o dibujo aquí"
      />

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Describe lo que quieres generar
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: Un castillo medieval en la montaña al atardecer..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Estilo</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {SKETCH_STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                style === s.value
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={!imageData || !prompt.trim() || loading}
        className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-400 hover:to-teal-500 transition-all flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Procesando...
          </>
        ) : (
          '✏️ Convertir Boceto'
        )}
      </button>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
      {result && (
        <ResultDisplay originalPreview={imagePreview} resultUrl={result} showSideBySide />
      )}
    </div>
  );
}

function RetouchTool() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (dataUrl: string) => {
    setImagePreview(dataUrl);
    setImageData(dataUrl);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!imageData || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<AiToolResult>('/ai-tools/retouch', {
        imageUrl: imageData,
        prompt: prompt.trim(),
      });
      setResult(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone imagePreview={imagePreview} onImageSelect={handleImageSelect} />

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Describe los cambios que deseas
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: Mejorar la iluminación, suavizar la piel, hacer el cielo más azul..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      <button
        onClick={handleProcess}
        disabled={!imageData || !prompt.trim() || loading}
        className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Procesando...
          </>
        ) : (
          '🧹 Retocar Imagen'
        )}
      </button>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
      {result && (
        <ResultDisplay originalPreview={imagePreview} resultUrl={result} showSideBySide />
      )}
    </div>
  );
}

// ── Main AiTools Component ─────────────────────────────────────────────
export default function AiTools() {
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);

  const renderToolInterface = () => {
    switch (selectedTool) {
      case 'remove-bg':
        return <RemoveBackgroundTool />;
      case 'upscale':
        return <UpscaleTool />;
      case 'reimagine':
        return <ReimagineTool />;
      case 'sketch':
        return <SketchToImageTool />;
      case 'retouch':
        return <RetouchTool />;
      default:
        return null;
    }
  };

  const selectedToolData = TOOLS.find((t) => t.id === selectedTool);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          🛠️ Herramientas de IA
        </h2>
        <p className="text-gray-400 text-lg">
          Suite completa de herramientas para editar y transformar imágenes con inteligencia artificial
        </p>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
            className={`group relative p-6 rounded-2xl border transition-all text-left ${
              selectedTool === tool.id
                ? `bg-gradient-to-br ${tool.gradient} border-transparent shadow-2xl ${tool.shadow} scale-[1.02]`
                : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800 hover:shadow-xl hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`text-4xl flex-shrink-0 ${
                  selectedTool === tool.id ? '' : 'grayscale-[30%] group-hover:grayscale-0'
                } transition-all`}
              >
                {tool.icon}
              </div>
              <div className="min-w-0">
                <h3
                  className={`font-bold text-lg mb-1 ${
                    selectedTool === tool.id ? 'text-white' : 'text-gray-200'
                  }`}
                >
                  {tool.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    selectedTool === tool.id ? 'text-white/80' : 'text-gray-400'
                  }`}
                >
                  {tool.description}
                </p>
              </div>
            </div>

            {selectedTool === tool.id && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-gray-900 border-r border-b border-gray-700" />
            )}
          </button>
        ))}
      </div>

      {/* Selected Tool Interface */}
      {selectedTool && selectedToolData && (
        <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{selectedToolData.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{selectedToolData.title}</h3>
              <p className="text-gray-400 text-sm">{selectedToolData.description}</p>
            </div>
            <button
              onClick={() => setSelectedTool(null)}
              className="ml-auto text-gray-500 hover:text-white transition-colors text-2xl"
              title="Cerrar"
            >
              ×
            </button>
          </div>
          {renderToolInterface()}
        </div>
      )}
    </div>
  );
}
