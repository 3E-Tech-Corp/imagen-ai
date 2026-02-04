import { useState, useEffect, useCallback } from 'react';
import { AppLang, APP_LANGUAGES, getTranslations } from '../i18n/translations';

// ═══════════════════════════════════════════
// COLOR THEMES
// ═══════════════════════════════════════════
const COLORS = [
  // Row 1 — Pastels / Feminine
  { name: 'Rosa', h: 340, s: 75, l: 65, hex: '#e87ea1' },
  { name: 'Lavanda', h: 270, s: 60, l: 70, hex: '#b48ede' },
  { name: 'Lila', h: 290, s: 55, l: 65, hex: '#c07ed4' },
  { name: 'Coral', h: 12, s: 80, l: 65, hex: '#ec8a6a' },
  { name: 'Durazno', h: 25, s: 80, l: 72, hex: '#f0a67a' },
  { name: 'Violeta', h: 271, s: 81, l: 56, hex: '#8b5cf6' },
  { name: 'Fucsia', h: 322, s: 80, l: 55, hex: '#db2e8e' },
  // Row 2 — Cool tones
  { name: 'Turquesa', h: 175, s: 70, l: 45, hex: '#22b8a0' },
  { name: 'Menta', h: 160, s: 55, l: 60, hex: '#6cc4a1' },
  { name: 'Azul Cielo', h: 200, s: 70, l: 60, hex: '#5aa8d4' },
  { name: 'Azul', h: 220, s: 80, l: 55, hex: '#3b7dd8' },
  { name: 'Índigo', h: 240, s: 65, l: 55, hex: '#5555c8' },
  { name: 'Esmeralda', h: 155, s: 70, l: 42, hex: '#20a06b' },
  { name: 'Verde', h: 140, s: 60, l: 45, hex: '#2ea55e' },
  // Row 3 — Warm/Neutral
  { name: 'Dorado', h: 40, s: 80, l: 55, hex: '#d4a020' },
  { name: 'Ámbar', h: 30, s: 85, l: 55, hex: '#d48a16' },
  { name: 'Rojo', h: 0, s: 75, l: 55, hex: '#d44040' },
  { name: 'Cereza', h: 350, s: 75, l: 50, hex: '#d42060' },
  { name: 'Marrón', h: 25, s: 50, l: 40, hex: '#996633' },
  { name: 'Gris', h: 220, s: 15, l: 55, hex: '#7a8090' },
  { name: 'Negro', h: 0, s: 0, l: 30, hex: '#4d4d4d' },
];

// ═══════════════════════════════════════════
// FONT FAMILIES
// ═══════════════════════════════════════════
const FONTS = [
  { name: 'System', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', style: 'Moderna', google: '' },
  { name: 'Inter', family: '"Inter", sans-serif', style: 'Limpia', google: 'Inter:wght@300;400;500;600;700' },
  { name: 'Poppins', family: '"Poppins", sans-serif', style: 'Suave', google: 'Poppins:wght@300;400;500;600;700' },
  { name: 'Playfair', family: '"Playfair Display", serif', style: 'Elegante', google: 'Playfair+Display:wght@400;500;600;700' },
  { name: 'Montserrat', family: '"Montserrat", sans-serif', style: 'Geométrica', google: 'Montserrat:wght@300;400;500;600;700' },
  { name: 'Raleway', family: '"Raleway", sans-serif', style: 'Delicada', google: 'Raleway:wght@300;400;500;600;700' },
  { name: 'Lato', family: '"Lato", sans-serif', style: 'Cálida', google: 'Lato:wght@300;400;700' },
  { name: 'Nunito', family: '"Nunito", sans-serif', style: 'Redonda', google: 'Nunito:wght@300;400;600;700' },
  { name: 'Quicksand', family: '"Quicksand", sans-serif', style: 'Juguetona', google: 'Quicksand:wght@300;400;500;600;700' },
  { name: 'Dancing Script', family: '"Dancing Script", cursive', style: 'Cursiva', google: 'Dancing+Script:wght@400;500;600;700' },
  { name: 'Cormorant', family: '"Cormorant Garamond", serif', style: 'Clásica', google: 'Cormorant+Garamond:wght@300;400;500;600;700' },
  { name: 'Space Grotesk', family: '"Space Grotesk", sans-serif', style: 'Tech', google: 'Space+Grotesk:wght@300;400;500;600;700' },
];

// Load Google Font dynamically
function loadGoogleFont(googleParam: string) {
  if (!googleParam) return;
  const id = `gfont-${googleParam.replace(/[^a-zA-Z]/g, '')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${googleParam}&display=swap`;
  document.head.appendChild(link);
}

interface Props {
  lang: AppLang;
  onLangChange: (lang: AppLang) => void;
}

export default function ThemePicker({ lang, onLangChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'color' | 'font' | 'lang'>('color');
  const [colorIdx, setColorIdx] = useState(5); // Violeta default
  const [fontIdx, setFontIdx] = useState(0);
  const t = getTranslations(lang);

  // Load saved preferences on mount
  useEffect(() => {
    const savedColor = localStorage.getItem('imagen-ai-color');
    if (savedColor) {
      const idx = parseInt(savedColor);
      if (!isNaN(idx) && COLORS[idx]) { setColorIdx(idx); applyColor(idx); }
    }
    const savedFont = localStorage.getItem('imagen-ai-font');
    if (savedFont) {
      const idx = parseInt(savedFont);
      if (!isNaN(idx) && FONTS[idx]) { setFontIdx(idx); applyFont(idx); }
    }
  }, []);

  const applyColor = useCallback((idx: number) => {
    const c = COLORS[idx];
    document.documentElement.style.setProperty('--accent-h', String(c.h));
    document.documentElement.style.setProperty('--accent-s', `${c.s}%`);
    document.documentElement.style.setProperty('--accent-l', `${c.l}%`);
  }, []);

  const applyFont = useCallback((idx: number) => {
    const f = FONTS[idx];
    if (f.google) loadGoogleFont(f.google);
    document.documentElement.style.setProperty('--app-font', f.family);
    document.body.style.fontFamily = f.family;
  }, []);

  const selectColor = (idx: number) => {
    setColorIdx(idx);
    applyColor(idx);
    localStorage.setItem('imagen-ai-color', String(idx));
  };

  const selectFont = (idx: number) => {
    setFontIdx(idx);
    applyFont(idx);
    localStorage.setItem('imagen-ai-font', String(idx));
  };

  const selectLang = (code: AppLang) => {
    onLangChange(code);
    localStorage.setItem('imagen-ai-lang', code);
  };

  return (
    <div className="relative">
      {/* Settings button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-800/80 border border-gray-700/50 hover:border-gray-500 transition-all hover:bg-gray-700/80"
        title={t.personalizar}
      >
        <span className="text-base">⚙️</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="fixed right-3 top-16 z-50 bg-gray-900/95 backdrop-blur-xl border border-gray-700/60 rounded-2xl shadow-2xl w-80 sm:w-96 animate-fade-in overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-white font-semibold text-base">⚙️ {t.personalizar}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg transition-colors">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pb-3">
              {(['color', 'font', 'lang'] as const).map(tb => (
                <button key={tb} onClick={() => setTab(tb)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    tab === tb
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}>
                  {tb === 'color' ? '🎨' : tb === 'font' ? '✍️' : '🌍'}
                  <span className="ml-1.5">
                    {tb === 'color' ? (lang === 'en' ? 'Colors' : 'Colores')
                      : tb === 'font' ? (lang === 'en' ? 'Fonts' : 'Fuentes')
                      : (lang === 'en' ? 'Language' : 'Idioma')}
                  </span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-4 pb-5 max-h-[60vh] overflow-y-auto">

              {/* ═══ COLORS ═══ */}
              {tab === 'color' && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-xs">{lang === 'en' ? 'Tap a color to change the app instantly' : 'Pincha un color para cambiar la app al instante'}</p>
                  <div className="grid grid-cols-7 gap-2">
                    {COLORS.map((c, i) => (
                      <button key={i} onClick={() => selectColor(i)}
                        className="group flex flex-col items-center gap-1"
                        title={c.name}>
                        <div className={`w-9 h-9 rounded-full transition-all shadow-md ${
                          colorIdx === i ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-110'
                        }`}
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className={`text-[9px] leading-tight ${colorIdx === i ? 'text-white' : 'text-gray-500'}`}>
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ FONTS ═══ */}
              {tab === 'font' && (
                <div className="space-y-2">
                  <p className="text-gray-400 text-xs">{lang === 'en' ? 'Tap a font to change all text instantly' : 'Pincha una fuente para cambiar todas las letras al instante'}</p>
                  {FONTS.map((f, i) => {
                    if (f.google) loadGoogleFont(f.google); // preload for preview
                    return (
                      <button key={i} onClick={() => selectFont(i)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                          fontIdx === i
                            ? 'bg-white/10 border border-white/20'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium" style={{ fontFamily: f.family }}>
                            {f.name}
                          </span>
                          <span className={`text-xs ${fontIdx === i ? 'text-violet-400' : 'text-gray-500'}`}>
                            {f.style}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1" style={{ fontFamily: f.family }}>
                          Imagen AI — Crea algo increíble hoy ✨
                        </p>
                        {fontIdx === i && (
                          <span className="text-[10px] text-green-400 mt-1 inline-block">✓ {lang === 'en' ? 'Active' : 'Activa'}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ═══ LANGUAGE ═══ */}
              {tab === 'lang' && (
                <div className="space-y-2">
                  <p className="text-gray-400 text-xs">{lang === 'en' ? 'Tap a language to change the entire app' : 'Pincha un idioma para cambiar toda la aplicación'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {APP_LANGUAGES.map(l => (
                      <button key={l.code} onClick={() => selectLang(l.code)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                          lang === l.code
                            ? 'bg-white/10 border border-white/20'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}>
                        <span className="text-lg">{l.flag}</span>
                        <div>
                          <p className={`text-sm font-medium ${lang === l.code ? 'text-white' : 'text-gray-300'}`}>
                            {l.name}
                          </p>
                          {lang === l.code && (
                            <span className="text-[10px] text-green-400">✓ {lang === 'en' ? 'Active' : 'Activo'}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
