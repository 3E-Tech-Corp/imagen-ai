import { GenerationType } from '../types';
import ThemePicker from './ThemePicker';
import { AppLang, Translations } from '../i18n/translations';

interface HeaderProps {
  activeTab: GenerationType;
  onTabChange: (tab: GenerationType) => void;
  lang: AppLang;
  onLangChange: (lang: AppLang) => void;
  t: Translations;
}

export default function Header({ activeTab, onTabChange, lang, onLangChange, t }: HeaderProps) {
  const TABS: { id: GenerationType; label: string; emoji: string }[] = [
    { id: 'image', label: t.imagenes, emoji: '🖼️' },
    { id: 'video', label: t.videos, emoji: '🎬' },
    { id: 'tools', label: t.herramientas, emoji: '✨' },
    { id: 'transform', label: t.glowUp, emoji: '💎' },
    { id: 'mirror', label: t.miEspejo, emoji: '🪞' },
    { id: 'voice', label: t.voces, emoji: '🎙️' },
    { id: 'recipe', label: t.recetas, emoji: '🍳' },
    { id: 'projects', label: t.proyectos, emoji: '📂' },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-black/70 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            {/* Logo — uses accent color */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 accent-gradient rounded-xl flex items-center justify-center accent-shadow">
                <span className="text-white font-bold text-sm sm:text-base">IA</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-white font-bold text-lg leading-tight">
                  Imagen <span className="accent-gradient-text">AI</span>
                </h1>
                <p className="text-gray-500 text-[10px] font-medium tracking-wide uppercase">{t.studioCreativo}</p>
              </div>
            </div>

            {/* Tabs — active tab uses accent color */}
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <div className="flex bg-gray-800/80 rounded-xl p-0.5 gap-0.5 w-max">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => onTabChange(tab.id)}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'accent-bg text-white accent-shadow'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}>
                    <span>{tab.emoji}</span>
                    <span className="hidden sm:inline ml-1">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <ThemePicker lang={lang} onLangChange={onLangChange} />
          </div>
        </div>
      </div>
    </header>
  );
}
