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
import { GenerationType, GenerationResult, VoiceGender } from './types';
import api from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<GenerationType>('image');
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
      });

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

  const handleVoiceGenerate = useCallback(async (text: string, language: string, gender: VoiceGender) => {
    const tempId = crypto.randomUUID();
    const placeholderResult: GenerationResult = {
      id: tempId,
      prompt: text,
      type: 'voice',
      style: 'realistic',
      url: '',
      createdAt: new Date().toISOString(),
      status: 'generating',
    };

    setResults((prev) => [placeholderResult, ...prev]);
    setIsGenerating(true);

    try {
      const result = await api.post<GenerationResult>('/generation/voice', {
        text,
        language,
        gender,
      });

      setResults((prev) =>
        prev.map((r) => (r.id === tempId ? { ...result, type: 'voice' as const, status: 'completed' as const } : r))
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
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <StatusBanner />
        <section className={activeTab === 'projects' ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>
          {activeTab === 'projects' ? (
            <ProjectManager />
          ) : activeTab === 'recipe' ? (
            <RecipeGenerator isGenerating={isGenerating} setIsGenerating={setIsGenerating} />
          ) : activeTab === 'voice' ? (
            <VoiceGenerator onGenerate={handleVoiceGenerate} isGenerating={isGenerating} />
          ) : (
            <PromptInput type={activeTab} onGenerate={handleGenerate} isGenerating={isGenerating} />
          )}
        </section>

        {activeTab !== 'recipe' && (
          <section>
            <Gallery
              results={results}
              onEditVideo={(r) => setEditingVideo(r)}
              onEditImage={(r) => setEditingImage(r)}
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

      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Imagen AI — Crea imágenes, videos y voces con inteligencia artificial
          </p>
        </div>
      </footer>
    </div>
  );
}
