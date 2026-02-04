import { GenerationType } from '../types';

interface HeaderProps {
  activeTab: GenerationType;
  onTabChange: (tab: GenerationType) => void;
}

const TABS: { id: GenerationType; label: string; emoji: string; activeColor: string; activeBg: string }[] = [
  { id: 'image', label: 'Imágenes', emoji: '✿', activeColor: 'text-rose-400', activeBg: 'bg-rose-50 border-rose-200' },
  { id: 'video', label: 'Videos', emoji: '♡', activeColor: 'text-purple-400', activeBg: 'bg-purple-50 border-purple-200' },
  { id: 'tools', label: 'Herramientas', emoji: '✦', activeColor: 'text-amber-400', activeBg: 'bg-amber-50 border-amber-200' },
  { id: 'transform', label: 'Glow Up', emoji: '◇', activeColor: 'text-pink-400', activeBg: 'bg-pink-50 border-pink-200' },
  { id: 'mirror', label: 'Mi Espejo', emoji: '❋', activeColor: 'text-rose-400', activeBg: 'bg-rose-50 border-rose-200' },
  { id: 'voice', label: 'Voces', emoji: '♪', activeColor: 'text-teal-400', activeBg: 'bg-teal-50 border-teal-200' },
  { id: 'recipe', label: 'Recetas', emoji: '❀', activeColor: 'text-orange-400', activeBg: 'bg-orange-50 border-orange-200' },
  { id: 'projects', label: 'Proyectos', emoji: '✧', activeColor: 'text-indigo-400', activeBg: 'bg-indigo-50 border-indigo-200' },
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50">
      <div className="glass-soft">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            {/* Elegant Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-rose-200 via-pink-200 to-purple-200 flex items-center justify-center shadow-sm">
                <span className="font-elegant text-lg sm:text-xl font-bold text-rose-500 italic">IA</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-elegant text-xl font-semibold text-[#3d3037] tracking-tight italic">
                  Imagen <span className="text-rose-400">AI</span>
                </h1>
                <p className="text-[10px] text-[#a8969e] tracking-[0.15em] uppercase font-medium">studio creativo</p>
              </div>
            </div>

            {/* Elegant tab navigation */}
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <nav className="flex gap-1 w-max py-1">
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap border ${
                        isActive
                          ? `${tab.activeBg} ${tab.activeColor} shadow-sm`
                          : 'text-[#a8969e] border-transparent hover:text-[#6b5e66] hover:bg-white/60'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`text-sm transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                          {tab.emoji}
                        </span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
