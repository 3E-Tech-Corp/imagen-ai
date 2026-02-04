import { GenerationType } from '../types';

interface HeaderProps {
  activeTab: GenerationType;
  onTabChange: (tab: GenerationType) => void;
}

const TABS: { id: GenerationType; label: string; emoji: string; gradient: string; activeGlow: string }[] = [
  { id: 'image', label: 'Imágenes', emoji: '🖼️', gradient: 'from-violet-500 to-indigo-500', activeGlow: 'shadow-violet-500/30' },
  { id: 'video', label: 'Videos', emoji: '🎬', gradient: 'from-fuchsia-500 to-purple-500', activeGlow: 'shadow-fuchsia-500/30' },
  { id: 'tools', label: 'Herramientas IA', emoji: '✨', gradient: 'from-amber-500 to-orange-500', activeGlow: 'shadow-amber-500/30' },
  { id: 'transform', label: 'Transformación', emoji: '💎', gradient: 'from-pink-500 to-rose-500', activeGlow: 'shadow-pink-500/30' },
  { id: 'mirror', label: 'Mi Espejo', emoji: '🪞', gradient: 'from-rose-400 to-pink-500', activeGlow: 'shadow-rose-500/30' },
  { id: 'voice', label: 'Voces', emoji: '🎙️', gradient: 'from-emerald-500 to-teal-500', activeGlow: 'shadow-emerald-500/30' },
  { id: 'recipe', label: 'Recetas IA', emoji: '🍳', gradient: 'from-orange-500 to-red-500', activeGlow: 'shadow-orange-500/30' },
  { id: 'projects', label: 'Mis Proyectos', emoji: '📂', gradient: 'from-blue-500 to-cyan-500', activeGlow: 'shadow-blue-500/30' },
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50">
      {/* Premium glass header */}
      <div className="bg-black/70 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            {/* Premium Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="relative">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <span className="text-white font-black text-sm sm:text-base tracking-tight">IA</span>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-white font-bold text-lg leading-tight tracking-tight">
                  Imagen <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">AI</span>
                </h1>
                <p className="text-gray-500 text-[10px] font-medium tracking-wide uppercase">Studio Profesional</p>
              </div>
            </div>

            {/* Tab navigation — premium scrollable */}
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <nav className="flex gap-1 w-max py-1">
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap group ${
                        isActive
                          ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg ${tab.activeGlow}`
                          : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span className={`text-base sm:text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {tab.emoji}
                        </span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </span>
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-20 blur-sm"
                          style={{ background: 'inherit' }} />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Pro badge */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full text-amber-400 text-[10px] font-bold tracking-wider uppercase">
                ✦ PRO
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </header>
  );
}
