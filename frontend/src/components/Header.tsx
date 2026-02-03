import { useState } from 'react';
import { GenerationType } from '../types';

interface HeaderProps {
  activeTab: GenerationType;
  onTabChange: (tab: GenerationType) => void;
}

interface TabDef {
  id: GenerationType;
  label: string;
  emoji: string;
  color: string;
  shadow: string;
}

const TABS: TabDef[] = [
  { id: 'chat', label: 'Crear', emoji: '💬', color: 'bg-gradient-to-r from-violet-600 to-fuchsia-600', shadow: 'shadow-violet-600/25' },
  { id: 'image', label: 'Imágenes', emoji: '🖼️', color: 'bg-violet-600', shadow: 'shadow-violet-600/25' },
  { id: 'video', label: 'Videos', emoji: '🎬', color: 'bg-fuchsia-600', shadow: 'shadow-fuchsia-600/25' },
  { id: 'tools', label: 'Herramientas', emoji: '🛠️', color: 'bg-amber-600', shadow: 'shadow-amber-600/25' },
  { id: 'voice', label: 'Voces', emoji: '🎙️', color: 'bg-emerald-600', shadow: 'shadow-emerald-600/25' },
  { id: 'recipe', label: 'Recetas', emoji: '🍳', color: 'bg-orange-600', shadow: 'shadow-orange-600/25' },
  { id: 'projects', label: 'Proyectos', emoji: '📁', color: 'bg-blue-600', shadow: 'shadow-blue-600/25' },
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeTabDef = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm sm:text-lg">IA</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-xl">Imagen AI</h1>
              <p className="text-gray-400 text-xs">Crea con inteligencia artificial</p>
            </div>
            <h1 className="sm:hidden text-white font-bold text-lg">Imagen AI</h1>
          </div>

          {/* Desktop tabs - scrollable */}
          <div className="hidden md:flex bg-gray-800/50 rounded-xl p-1 gap-0.5 overflow-x-auto max-w-[calc(100%-200px)]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? `${tab.color} text-white shadow-lg ${tab.shadow}`
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile: current tab button + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${activeTabDef.color} text-white`}
            >
              <span>{activeTabDef.emoji} {activeTabDef.label}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-800/50 bg-gray-900/95 backdrop-blur-md">
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? `${tab.color} text-white shadow-lg ${tab.shadow}`
                    : 'text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50'
                }`}
              >
                <span className="text-base">{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
