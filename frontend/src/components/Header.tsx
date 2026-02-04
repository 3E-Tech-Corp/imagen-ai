import { GenerationType } from '../types';
import ThemePicker from './ThemePicker';

interface HeaderProps {
  activeTab: GenerationType;
  onTabChange: (tab: GenerationType) => void;
}

const TABS: { id: GenerationType; label: string; emoji: string; color: string }[] = [
  { id: 'image', label: 'Imágenes', emoji: '🖼️', color: 'bg-violet-600 shadow-violet-600/25' },
  { id: 'video', label: 'Videos', emoji: '🎬', color: 'bg-fuchsia-600 shadow-fuchsia-600/25' },
  { id: 'tools', label: 'Herramientas', emoji: '✨', color: 'bg-amber-600 shadow-amber-600/25' },
  { id: 'transform', label: 'Glow Up', emoji: '💎', color: 'bg-pink-600 shadow-pink-600/25' },
  { id: 'mirror', label: 'Mi Espejo', emoji: '🪞', color: 'bg-rose-600 shadow-rose-600/25' },
  { id: 'voice', label: 'Voces', emoji: '🎙️', color: 'bg-emerald-600 shadow-emerald-600/25' },
  { id: 'recipe', label: 'Recetas', emoji: '🍳', color: 'bg-orange-600 shadow-orange-600/25' },
  { id: 'projects', label: 'Proyectos', emoji: '📂', color: 'bg-blue-600 shadow-blue-600/25' },
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-black/70 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <span className="text-white font-bold text-sm sm:text-base">IA</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-white font-bold text-lg leading-tight">
                  Imagen <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">AI</span>
                </h1>
                <p className="text-gray-500 text-[10px] font-medium tracking-wide uppercase">Studio Creativo</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <div className="flex bg-gray-800/80 rounded-xl p-0.5 gap-0.5 w-max">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => onTabChange(tab.id)}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? `${tab.color} text-white shadow-lg`
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}>
                    <span>{tab.emoji}</span>
                    <span className="hidden sm:inline ml-1">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme picker */}
            <ThemePicker />
          </div>
        </div>
      </div>
    </header>
  );
}
