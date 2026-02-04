import { useState } from 'react';
import Header from './components/Header';
import StatusBanner from './components/StatusBanner';
import VoiceGenerator from './components/VoiceGenerator';
import RecipeGenerator from './components/RecipeGenerator';
import ProjectManager from './components/ProjectManager';
import AiTools from './components/AiTools';
import TransformSection from './components/TransformSection';
import CreativeChat from './components/CreativeChat';
import MirrorChat from './components/MirrorChat';
import { GenerationType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<GenerationType>('image');
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-main)' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-6 lg:px-8 py-2 sm:py-4">
        {activeTab !== 'image' && activeTab !== 'video' && activeTab !== 'mirror' && <StatusBanner />}

        {activeTab === 'image' ? (
          <CreativeChat mode="image" />
        ) : activeTab === 'video' ? (
          <CreativeChat mode="video" />
        ) : activeTab === 'mirror' ? (
          <MirrorChat />
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

      <footer className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
            ✿ Imagen AI — Tu estudio creativo con inteligencia artificial ✿
          </p>
        </div>
      </footer>
    </div>
  );
}
