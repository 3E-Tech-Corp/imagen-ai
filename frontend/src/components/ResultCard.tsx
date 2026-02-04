import { useState, useEffect } from 'react';
import api from '../services/api';
import { GenerationResult } from '../types';

interface SimpleProject {
  id: string;
  name: string;
}

interface ResultCardProps {
  result: GenerationResult;
  onEdit?: (result: GenerationResult) => void;
  onCreateVideo?: (imageUrl: string) => void;
}

export default function ResultCard({ result, onEdit, onCreateVideo }: ResultCardProps) {
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [saved, setSaved] = useState(false);

  const loadProjects = async () => {
    try {
      const data = await api.get<SimpleProject[]>('/project');
      setProjects(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (showSaveMenu && projects.length === 0) loadProjects();
  }, [showSaveMenu]);

  const saveToProject = async (projectId: string) => {
    try {
      await api.post(`/project/${projectId}/items`, {
        type: result.type,
        prompt: result.prompt,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        style: result.style,
      });
      setSaved(true);
      setShowSaveMenu(false);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
  };

  const handleDownload = () => {
    const ext = result.type === 'image' ? 'png' : result.type === 'video' ? 'mp4' : 'mp3';
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `imagen-ai-${result.id}.${ext}`;
    link.click();
  };

  if (result.status === 'generating') {
    const isVideo = result.type === 'video';
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className={`${result.type === 'voice' ? 'aspect-[2/1]' : 'aspect-square'} bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center`}>
          <div className="text-center p-6">
            <div className="relative mx-auto mb-4 w-16 h-16">
              <svg className="animate-spin h-16 w-16 accent-text" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                <path className="opacity-80" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M4 12a8 8 0 018-8" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl">
                {result.type === 'voice' ? '🎙️' : isVideo ? '🎬' : '🖼️'}
              </span>
            </div>
            <p className="text-white font-medium text-sm mb-1">
              {result.type === 'voice' ? 'Generando voz...' : isVideo ? 'Generando video...' : 'Generando imagen...'}
            </p>
            <p className="text-gray-500 text-xs">
              {isVideo
                ? 'Los videos pueden tardar 2-5 minutos. No cierres esta página.'
                : result.type === 'voice'
                  ? 'Esto tomará unos segundos...'
                  : 'Esto tomará unos segundos...'}
            </p>
            {isVideo && (
              <div className="mt-3 w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r accent-gradient h-full rounded-full animate-pulse" style={{ width: '60%', animation: 'pulse 2s ease-in-out infinite' }} />
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
          <p className="text-gray-400 text-sm truncate">{result.prompt}</p>
        </div>
      </div>
    );
  }

  if (result.status === 'failed') {
    const isConfigError = result.error?.includes('configurado') || result.error?.includes('configurar') || result.error?.includes('API key');
    const isTimeout = result.error?.includes('tardó') || result.error?.includes('timeout') || result.error?.includes('Failed to fetch');
    const isNetworkError = result.error?.includes('fetch') || result.error?.includes('network') || result.error?.includes('Network');

    let emoji = '❌';
    let title = 'No se pudo generar';
    let description = result.error || 'Algo salió mal. Intenta de nuevo.';

    if (isConfigError) {
      emoji = '🔧';
      title = 'Configuración pendiente';
      description = 'El servicio necesita ser configurado por el administrador.';
    } else if (isTimeout) {
      emoji = '⏱️';
      title = 'Tardó demasiado';
      description = result.type === 'video'
        ? 'La generación del video tardó más de lo esperado. Intenta con una descripción más simple.'
        : 'La generación tardó demasiado. Intenta de nuevo.';
    } else if (isNetworkError) {
      emoji = '🌐';
      title = 'Error de conexión';
      description = 'Hubo un problema con la conexión. Verifica tu internet e intenta de nuevo.';
    }

    return (
      <div className="bg-gray-800 rounded-2xl border border-red-900/30 overflow-hidden">
        <div className={`${result.type === 'voice' ? 'aspect-[2/1]' : 'aspect-square'} bg-gradient-to-br from-red-900/10 to-gray-900 flex items-center justify-center`}>
          <div className="text-center p-6">
            <p className="text-5xl mb-4">{emoji}</p>
            <p className="text-white font-medium text-sm mb-2">{title}</p>
            <p className="text-gray-400 text-xs leading-relaxed max-w-[250px] mx-auto">{description}</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-gray-400 text-sm truncate">{result.prompt}</p>
        </div>
      </div>
    );
  }

  // Voice result
  if (result.type === 'voice') {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden group hover:border-emerald-500/50 transition-all">
        <div className="p-6 bg-gradient-to-br from-emerald-900/30 to-teal-900/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-600/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎙️</span>
            </div>
            <div>
              <span className="text-emerald-400 text-sm font-medium">Audio generado</span>
              <p className="text-gray-400 text-xs">
                {new Date(result.createdAt).toLocaleString('es')}
              </p>
            </div>
          </div>
          <audio controls className="w-full mb-3" style={{ height: '40px' }}>
            <source src={result.url} type="audio/mpeg" />
            Tu navegador no soporta audio.
          </audio>
          <button
            onClick={handleDownload}
            className="w-full py-2 bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-600/30 transition-colors"
          >
            ⬇️ Descargar audio
          </button>
        </div>
        <div className="p-4 border-t border-gray-700">
          <p className="text-white text-sm line-clamp-3">{result.prompt}</p>
        </div>
      </div>
    );
  }

  // Image / Video result
  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden group accent-border-hover/50 transition-all">
      {/* Media */}
      <div className="aspect-square relative overflow-hidden">
        {result.type === 'image' ? (
          <img
            src={result.url}
            alt={result.prompt}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={result.url}
            poster={result.thumbnailUrl}
            controls
            className="w-full h-full object-cover"
          />
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap p-4">
          {onEdit && (
            <button
              onClick={() => onEdit(result)}
              className="px-3 py-2 accent-bg text-white rounded-xl text-xs font-medium hover:bg-fuchsia-500 transition-colors"
            >
              ✏️ Editar
            </button>
          )}
          {onCreateVideo && (
            <button
              onClick={() => onCreateVideo(result.url)}
              className="px-3 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl text-xs font-medium hover:from-pink-500 hover:to-rose-500 transition-colors shadow-lg shadow-pink-600/25"
            >
              🎬 Crear Video
            </button>
          )}
          <button
            onClick={handleDownload}
            className="px-3 py-2 accent-bg text-white rounded-xl text-xs font-medium hover:accent-bg transition-colors"
          >
            ⬇️ Descargar
          </button>
          <button
            onClick={() => window.open(result.url, '_blank')}
            className="px-3 py-2 bg-gray-700 text-white rounded-xl text-xs font-medium hover:bg-gray-600 transition-colors"
          >
            🔍 Ver
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSaveMenu(!showSaveMenu); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {saved ? '✅ Guardado' : '📁 Guardar'}
            </button>
            {showSaveMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-2 min-w-[180px] z-50">
                {projects.length === 0 ? (
                  <p className="text-gray-400 text-xs p-2">No hay proyectos. Crea uno primero.</p>
                ) : (
                  projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); saveToProject(p.id); }}
                      className="w-full text-left px-3 py-2 text-gray-300 text-xs hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      📁 {p.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
            result.type === 'image'
              ? 'accent-bg/80 text-white'
              : 'accent-bg/80 text-white'
          }`}>
            {result.type === 'image' ? '🖼️ Imagen' : '🎬 Video'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-white text-sm line-clamp-2 mb-2">{result.prompt}</p>
        <p className="text-gray-500 text-xs">
          {new Date(result.createdAt).toLocaleString('es')}
        </p>
      </div>
    </div>
  );
}
