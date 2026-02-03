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
              <p className="text-gray-400 text-xs">Crea imágenes y videos con IA</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => onTabChange('image')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'image'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              🖼️ Imágenes
            </button>
            <button
              onClick={() => onTabChange('video')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'video'
                  ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              🎬 Videos
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
