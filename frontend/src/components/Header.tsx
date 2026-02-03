import { GenerationType } from '../types';

interface HeaderProps {
  activeTab: GenerationType;
  onTabChange: (tab: GenerationType) => void;
}

const TABS: { id: GenerationType; label: string; emoji: string; color: string }[] = [
  { id: 'image', label: 'Imágenes', emoji: '🖼️', color: 'bg-violet-600 shadow-violet-600/25' },
  { id: 'video', label: 'Videos', emoji: '🎬', color: 'bg-fuchsia-600 shadow-fuchsia-600/25' },
  { id: 'tools', label: 'Herramientas', emoji: '🛠️', color: 'bg-amber-600 shadow-amber-600/25' },
  { id: 'voice', label: 'Voces', emoji: '🎙️', color: 'bg-emerald-600 shadow-emerald-600/25' },
  { id: 'recipe', label: 'Recetas', emoji: '🍳', color: 'bg-orange-600 shadow-orange-600/25' },
  { id: 'projects', label: 'Proyectos', emoji: '📁', color: 'bg-blue-600 shadow-blue-600/25' },
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm sm:text-lg">IA</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-lg leading-tight">Imagen AI</h1>
              <p className="text-gray-400 text-[10px]">Crea con inteligencia artificial</p>
            </div>
          </div>

          {/* Tabs — scrollable on mobile */}
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
        </div>
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </header>
  );
}
