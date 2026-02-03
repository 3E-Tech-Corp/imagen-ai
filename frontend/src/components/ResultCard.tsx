import { GenerationResult } from '../types';

interface ResultCardProps {
  result: GenerationResult;
  onEdit?: (result: GenerationResult) => void;
}

export default function ResultCard({ result, onEdit }: ResultCardProps) {
  const handleDownload = () => {
    const ext = result.type === 'image' ? 'png' : result.type === 'video' ? 'mp4' : 'mp3';
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `imagen-ai-${result.id}.${ext}`;
    link.click();
  };

  if (result.status === 'generating') {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden animate-pulse">
        <div className={`${result.type === 'voice' ? 'aspect-[2/1]' : 'aspect-square'} bg-gray-700 flex items-center justify-center`}>
          <div className="text-center p-6">
            <svg className="animate-spin h-10 w-10 text-violet-400 mx-auto mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-400 text-sm">
              {result.type === 'voice' ? 'Generando voz...' : result.type === 'video' ? 'Generando video...' : 'Generando imagen...'}
            </p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-gray-400 text-sm truncate">{result.prompt}</p>
        </div>
      </div>
    );
  }

  if (result.status === 'failed') {
    return (
      <div className="bg-gray-800 rounded-2xl border border-red-900/50 overflow-hidden">
        <div className={`${result.type === 'voice' ? 'aspect-[2/1]' : 'aspect-square'} bg-red-900/20 flex items-center justify-center`}>
          <div className="text-center p-6">
            <p className="text-4xl mb-3">❌</p>
            <p className="text-red-400 text-sm">{result.error || 'Error al generar'}</p>
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
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden group hover:border-violet-500/50 transition-all">
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
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          {onEdit && (
            <button
              onClick={() => onEdit(result)}
              className="px-4 py-2 bg-fuchsia-600 text-white rounded-xl text-sm font-medium hover:bg-fuchsia-500 transition-colors"
            >
              ✏️ Editar
            </button>
          )}
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-500 transition-colors"
          >
            ⬇️ Descargar
          </button>
          <button
            onClick={() => window.open(result.url, '_blank')}
            className="px-4 py-2 bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors"
          >
            🔍 Ver completo
          </button>
        </div>

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
            result.type === 'image'
              ? 'bg-violet-600/80 text-white'
              : 'bg-fuchsia-600/80 text-white'
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
