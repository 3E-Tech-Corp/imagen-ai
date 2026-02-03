import { useState, useEffect } from 'react';
import api from '../services/api';

interface ServiceStatus {
  imageGeneration: boolean;
  videoGeneration: boolean;
  voiceGeneration: boolean;
  message: string;
}

export default function StatusBanner() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.get<ServiceStatus>('/generation/status')
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (dismissed || !status) return null;
  if (status.imageGeneration && status.videoGeneration && status.voiceGeneration) return null;

  const missing: string[] = [];
  if (!status.imageGeneration) missing.push('Imágenes');
  if (!status.videoGeneration) missing.push('Videos');
  if (!status.voiceGeneration) missing.push('Voces');

  return (
    <div className="bg-amber-900/30 border border-amber-600/40 rounded-2xl p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-amber-200 font-medium text-sm">Configuración pendiente</p>
            <p className="text-amber-300/70 text-xs mt-1">
              Los servicios de <strong>{missing.join(', ')}</strong> necesitan API keys configuradas en el servidor.
              La interfaz funciona pero la generación no estará disponible hasta que se configuren.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-200 text-sm ml-4"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
