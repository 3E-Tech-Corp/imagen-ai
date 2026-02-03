import { GenerationResult } from '../types';
import ResultCard from './ResultCard';

interface GalleryProps {
  results: GenerationResult[];
}

export default function Gallery({ results }: GalleryProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-6xl mb-4">🎨</p>
        <h3 className="text-xl font-medium text-white mb-2">
          ¡Crea algo increíble!
        </h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Escribe una descripción detallada de lo que quieres generar. 
          Mientras más detalles incluyas, mejor será el resultado.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-sm text-gray-300">💡 <strong>Tip:</strong> Incluye detalles como iluminación, ángulo de cámara y estilo artístico.</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-sm text-gray-300">🎯 <strong>Tip:</strong> Usa el prompt negativo para excluir elementos que no quieres.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-white">
          Tus creaciones ({results.length})
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}
