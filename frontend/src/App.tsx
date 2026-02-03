import { useState, useCallback } from 'react';
import Header from './components/Header';
import StatusBanner from './components/StatusBanner';
import PromptInput, { GenerationOptions } from './components/PromptInput';
import VoiceGenerator from './components/VoiceGenerator';
import VideoEditor from './components/VideoEditor';
import ImageEditor from './components/ImageEditor';
import Gallery from './components/Gallery';
import RecipeGenerator from './components/RecipeGenerator';
import ProjectManager from './components/ProjectManager';
import AiTools from './components/AiTools';
import CreativeChat from './components/CreativeChat';
import { GenerationType, GenerationResult } from './types';
import api from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<GenerationType>('chat');
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingVideo, setEditingVideo] = useState<GenerationResult | null>(null);
  const [editingImage, setEditingImage] = useState<GenerationResult | null>(null);

  const handleGenerate = useCallback(async (prompt: string, options: GenerationOptions) => {
    const tempId = crypto.randomUUID();
    const placeholderResult: GenerationResult = {
      id: tempId,
      prompt,
      type: activeTab,
      style: options.style,
      url: '',
      createdAt: new Date().toISOString(),
      status: 'generating',
    };

    setResults((prev) => [placeholderResult, ...prev]);
    setIsGenerating(true);

    try {
      const timeoutMs = activeTab === 'video' ? 30_000 : undefined;
      const result = await api.post<GenerationResult>('/generation/create', {
        prompt,
        type: activeTab,
        style: options.style,
        environment: options.environment,
        timePeriod: options.timePeriod,
        lighting: options.lighting,
        emotion: options.emotion,
        quality: options.quality,
        useCase: options.useCase,
        negativePrompt: options.negativePrompt,
        videoSpeed: options.videoSpeed || 'fast',
        referenceImages: options.referenceImages,
      }, timeoutMs);

      if (activeTab === 'video' && result.status === 'generating') {
        const jobId = result.id;
        setResults((prev) =>
          prev.map((r) => (r.id === tempId ? { ...result, id: tempId, status: 'generating' as const } : r))
        );
        setIsGenerating(false);

        const pollInterval = setInterval(async () => {
          try {
            const statusResult = await api.get<GenerationResult>(`/generation/job/${jobId}`);
            if (statusResult.status === 'completed') {
              clearInterval(pollInterval);
              setResults((prev) =>
                prev.map((r) =>
                  r.id === tempId
                    ? { ...statusResult, id: statusResult.id, status: 'completed' as const }
                    : r
                )
              );
            } else if (statusResult.status === 'failed') {
              clearInterval(pollInterval);
              setResults((prev) =>
                prev.map((r) =>
                  r.id === tempId
                    ? { ...r, status: 'failed' as const, error: statusResult.error || 'Error al generar el video' }
                    : r
                )
              );
            }
          } catch {
            // Network error — keep polling
          }
        }, 5000);

        setTimeout(() => {
          clearInterval(pollInterval);
          setResults((prev) =>
            prev.map((r) =>
              r.id === tempId && r.status === 'generating'
                ? { ...r, status: 'failed' as const, error: 'La generación del video tardó demasiado. Intenta de nuevo.' }
                : r
            )
          );
        }, 600_000);

        return;
      }

      setResults((prev) =>
        prev.map((r) => (r.id === tempId ? { ...result, status: 'completed' as const } : r))
      );
    } catch (err) {
      setResults((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? { ...r, status: 'failed' as const, error: err instanceof Error ? err.message : 'Error desconocido' }
            : r
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }, [activeTab]);

  const handleCreateVideoFromImage = useCallback(async (imageUrl: string) => {
    const tempId = crypto.randomUUID();
    const placeholderResult: GenerationResult = {
      id: tempId,
      prompt: '🎬 Video desde imagen generada',
      type: 'video',
      style: 'cinematic',
      url: '',
      createdAt: new Date().toISOString(),
      status: 'generating',
    };

    setResults((prev) => [placeholderResult, ...prev]);

    try {
      const result = await api.post<GenerationResult>('/generation/create', {
        prompt: 'Animate this image with smooth natural motion, cinematic quality',
        type: 'video',
        style: 'cinematic',
        videoSpeed: 'fast',
        referenceImages: [imageUrl],
      }, 30_000);

      if (result.status === 'generating') {
        const jobId = result.id;
        setResults((prev) =>
          prev.map((r) => (r.id === tempId ? { ...result, id: tempId, status: 'generating' as const } : r))
        );

        const pollInterval = setInterval(async () => {
          try {
            const statusResult = await api.get<GenerationResult>(`/generation/job/${jobId}`);
            if (statusResult.status === 'completed') {
              clearInterval(pollInterval);
              setResults((prev) =>
                prev.map((r) =>
                  r.id === tempId ? { ...statusResult, id: statusResult.id, status: 'completed' as const } : r
                )
              );
            } else if (statusResult.status === 'failed') {
              clearInterval(pollInterval);
              setResults((prev) =>
                prev.map((r) =>
                  r.id === tempId ? { ...r, status: 'failed' as const, error: statusResult.error || 'Error al generar el video' } : r
                )
              );
            }
          } catch {
            // Keep polling on network errors
          }
        }, 5000);

        setTimeout(() => {
          clearInterval(pollInterval);
          setResults((prev) =>
            prev.map((r) =>
              r.id === tempId && r.status === 'generating'
                ? { ...r, status: 'failed' as const, error: 'La generación del video tardó demasiado.' }
                : r
            )
          );
        }, 600_000);
        return;
      }

      setResults((prev) =>
        prev.map((r) => (r.id === tempId ? { ...result, status: 'completed' as const } : r))
      );
    } catch (err) {
      setResults((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? { ...r, status: 'failed' as const, error: err instanceof Error ? err.message : 'Error desconocido' }
            : r
        )
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className={`mx-auto ${activeTab === 'chat' ? '' : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8'}`}>
        {activeTab !== 'chat' && <StatusBanner />}
        
        {activeTab === 'chat' ? (
          <CreativeChat />
        ) : (
          <section className={activeTab === 'projects' || activeTab === 'tools' ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>
            {activeTab === 'projects' ? (
              <ProjectManager />
            ) : activeTab === 'tools' ? (
              <AiTools />
            ) : activeTab === 'recipe' ? (
              <RecipeGenerator isGenerating={isGenerating} setIsGenerating={setIsGenerating} />
            ) : activeTab === 'voice' ? (
              <VoiceGenerator isGenerating={isGenerating} />
            ) : (
              <PromptInput type={activeTab} onGenerate={handleGenerate} isGenerating={isGenerating} />
            )}
          </section>
        )}

        {activeTab !== 'recipe' && activeTab !== 'tools' && activeTab !== 'chat' && (
          <section>
            <Gallery
              results={results}
              onEditVideo={(r) => setEditingVideo(r)}
              onEditImage={(r) => setEditingImage(r)}
              onCreateVideo={handleCreateVideoFromImage}
            />
          </section>
        )}
      </main>

      {editingVideo && (
        <VideoEditor
          videoUrl={editingVideo.url}
          videoId={editingVideo.id}
          onClose={() => setEditingVideo(null)}
          onSaved={(newUrl) => {
            setResults((prev) => [{
              id: crypto.randomUUID(),
              prompt: `✏️ Editado: ${editingVideo.prompt}`,
              type: 'video', style: editingVideo.style,
              url: newUrl, createdAt: new Date().toISOString(), status: 'completed',
            }, ...prev]);
            setEditingVideo(null);
          }}
        />
      )}

      {editingImage && (
        <ImageEditor
          imageUrl={editingImage.url}
          imageId={editingImage.id}
          onClose={() => setEditingImage(null)}
          onSaved={() => setEditingImage(null)}
        />
      )}

      {activeTab !== 'chat' && (
        <footer className="border-t border-gray-800 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-gray-500 text-sm">
              Imagen AI — Crea imágenes, videos y voces con inteligencia artificial
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
