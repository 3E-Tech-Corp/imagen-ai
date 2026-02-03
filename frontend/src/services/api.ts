const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  // Default timeout: 30s for GET, 10 minutes for POST (video generation is slow)
  const timeoutMs = options.timeoutMs ?? (options.method === 'POST' ? 600_000 : 30_000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
      throw new ApiError(
        error.message || 'Error en la solicitud',
        response.status
      );
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) throw err;

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        'La generación tardó demasiado. Intenta de nuevo con una descripción más simple.',
        408
      );
    }

    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
      throw new ApiError(
        'Error de conexión. Verifica tu internet e intenta de nuevo.',
        0
      );
    }

    throw new ApiError(
      err instanceof Error ? err.message : 'Error desconocido. Intenta de nuevo.',
      500
    );
  }
}

const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown, timeoutMs?: number) =>
    request<T>(endpoint, { method: 'POST', body, timeoutMs }),
};

export { ApiError };
export default api;
