import { GenerationType } from '../types';

interface HeaderProps {
  activeTab: GenerationType;
  onTabChange: (tab: GenerationType) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">IA</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Imagen AI</h1>
              <p className="text-gray-400 text-xs">Imágenes, videos, voces y recetas con IA</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => onTabChange('image')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'image'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              🖼️ Imágenes
            </button>
            <button
              onClick={() => onTabChange('video')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'video'
                  ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              🎬 Videos
            </button>
            <button
              onClick={() => onTabChange('voice')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'voice'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              🎙️ Voces
            </button>
            <button
              onClick={() => onTabChange('recipe')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'recipe'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              🍳 Recetas
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
