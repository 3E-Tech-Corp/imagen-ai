import { useState, useCallback } from 'react';
import Header from './components/Header';
import PromptInput from './components/PromptInput';
import Gallery from './components/Gallery';
import { GenerationType, GenerationResult, ImageStyle } from './types';
import api from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<GenerationType>('image');
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async (prompt: string, style: ImageStyle, negativePrompt?: string) => {
    const tempId = crypto.randomUUID();
    const placeholderResult: GenerationResult = {
      id: tempId,
      prompt,
      type: activeTab,
      style,
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
        style,
        negativePrompt,
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

  return (
    <div className="min-h-screen bg-gray-950">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Prompt section */}
        <section className="max-w-3xl mx-auto">
          <PromptInput
            type={activeTab}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </section>

        {/* Results gallery */}
        <section>
          <Gallery results={results} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Imagen AI — Generación de imágenes y videos con inteligencia artificial
          </p>
        </div>
      </footer>
    </div>
  );
}
