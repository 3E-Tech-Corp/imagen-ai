import { useState, useEffect } from 'react';

const THEMES = [
  { name: 'Violeta', h: 271, s: 81, l: 56, preview: 'from-violet-500 to-purple-500' },
  { name: 'Rosa', h: 330, s: 80, l: 60, preview: 'from-pink-500 to-rose-500' },
  { name: 'Lavanda', h: 260, s: 60, l: 65, preview: 'from-purple-400 to-indigo-400' },
  { name: 'Coral', h: 10, s: 80, l: 60, preview: 'from-orange-400 to-red-400' },
  { name: 'Turquesa', h: 175, s: 70, l: 45, preview: 'from-teal-500 to-cyan-500' },
  { name: 'Dorado', h: 40, s: 80, l: 55, preview: 'from-amber-500 to-yellow-500' },
  { name: 'Esmeralda', h: 155, s: 70, l: 45, preview: 'from-emerald-500 to-green-500' },
  { name: 'Azul', h: 220, s: 80, l: 55, preview: 'from-blue-500 to-indigo-500' },
];

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('imagen-ai-theme');
    if (saved) {
      const idx = parseInt(saved);
      if (!isNaN(idx) && THEMES[idx]) {
        setCurrent(idx);
        applyTheme(idx);
      }
    }
  }, []);

  const applyTheme = (idx: number) => {
    const t = THEMES[idx];
    document.documentElement.style.setProperty('--accent-h', String(t.h));
    document.documentElement.style.setProperty('--accent-s', `${t.s}%`);
    document.documentElement.style.setProperty('--accent-l', `${t.l}%`);
  };

  const select = (idx: number) => {
    setCurrent(idx);
    applyTheme(idx);
    localStorage.setItem('imagen-ai-theme', String(idx));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 border border-gray-700 hover:border-gray-500 transition-all"
        title="Cambiar color"
      >
        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${THEMES[current].preview}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl w-64 animate-fade-in">
            <p className="text-white text-sm font-medium mb-3">🎨 Color de la app</p>
            <div className="grid grid-cols-4 gap-3">
              {THEMES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => select(i)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                    current === i ? 'bg-gray-800 ring-2 ring-white/20' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.preview} shadow-lg ${
                    current === i ? 'scale-110' : ''
                  }`} />
                  <span className="text-[10px] text-gray-400">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
