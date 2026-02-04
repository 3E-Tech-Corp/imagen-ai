import { useState } from 'react';
import Header from './components/Header';
import StatusBanner from './components/StatusBanner';
import VoiceGenerator from './components/VoiceGenerator';
import RecipeGenerator from './components/RecipeGenerator';
import ProjectManager from './components/ProjectManager';
import AiTools from './components/AiTools';
import TransformSection from './components/TransformSection';
import CreativeChat from './components/CreativeChat';
import { GenerationType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<GenerationType>('image');
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-6 lg:px-8 py-2 sm:py-6">
        {activeTab !== 'image' && activeTab !== 'video' && <StatusBanner />}

        {activeTab === 'image' ? (
          <CreativeChat mode="image" />
        ) : activeTab === 'video' ? (
          <CreativeChat mode="video" />
        ) : (
          <section className={activeTab === 'projects' || activeTab === 'tools' || activeTab === 'transform' ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>
            {activeTab === 'projects' ? (
              <ProjectManager />
            ) : activeTab === 'tools' ? (
              <AiTools />
            ) : activeTab === 'transform' ? (
              <TransformSection />
            ) : activeTab === 'recipe' ? (
              <RecipeGenerator isGenerating={isGenerating} setIsGenerating={setIsGenerating} />
            ) : activeTab === 'voice' ? (
              <VoiceGenerator />
            ) : null}
          </section>
        )}
      </main>

      <footer className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-gray-500 text-sm">
            Imagen AI — Crea imágenes, videos y voces con inteligencia artificial
          </p>
        </div>
      </footer>
    </div>
  );
}
