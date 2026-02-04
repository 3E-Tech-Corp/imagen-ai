import { useState, useEffect } from 'react';
import Header from './components/Header';
import StatusBanner from './components/StatusBanner';
import VoiceGenerator from './components/VoiceGenerator';
import RecipeGenerator from './components/RecipeGenerator';
import ProjectManager from './components/ProjectManager';
import AiTools from './components/AiTools';
import TransformSection from './components/TransformSection';
import CreativeChat from './components/CreativeChat';
import MirrorChat from './components/MirrorChat';
import LiveSection from './components/LiveSection';
import { GenerationType } from './types';
import { AppLang, getTranslations } from './i18n/translations';

export default function App() {
  const [activeTab, setActiveTab] = useState<GenerationType>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lang, setLang] = useState<AppLang>(() => {
    return (localStorage.getItem('imagen-ai-lang') as AppLang) || 'es';
  });

  const t = getTranslations(lang);

  // Apply saved font on mount
  useEffect(() => {
    const savedFont = localStorage.getItem('imagen-ai-font');
    if (savedFont) {
      const FONTS = [
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '"Inter", sans-serif',
        '"Poppins", sans-serif',
        '"Playfair Display", serif',
        '"Montserrat", sans-serif',
        '"Raleway", sans-serif',
        '"Lato", sans-serif',
        '"Nunito", sans-serif',
        '"Quicksand", sans-serif',
        '"Dancing Script", cursive',
        '"Cormorant Garamond", serif',
        '"Space Grotesk", sans-serif',
      ];
      const idx = parseInt(savedFont);
      if (!isNaN(idx) && FONTS[idx]) {
        document.body.style.fontFamily = FONTS[idx];
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} lang={lang} onLangChange={setLang} t={t} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-6 lg:px-8 py-2 sm:py-6">
        {activeTab !== 'image' && activeTab !== 'video' && activeTab !== 'mirror' && <StatusBanner />}

        {activeTab === 'image' ? (
          <CreativeChat mode="image" t={t} />
        ) : activeTab === 'video' ? (
          <CreativeChat mode="video" t={t} />
        ) : activeTab === 'mirror' ? (
          <MirrorChat />
        ) : (
          <section className={activeTab === 'projects' || activeTab === 'tools' || activeTab === 'transform' || activeTab === 'live' ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>
            {activeTab === 'live' ? (
              <LiveSection />
            ) : activeTab === 'projects' ? (
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
            {t.footerText}
          </p>
        </div>
      </footer>
    </div>
  );
}
