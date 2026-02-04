import { useState, useRef, useCallback, DragEvent } from 'react';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────
interface ColorimetryResult {
  season: string;
  bestColors: string[];
  avoidColors: string[];
  makeupTips: string;
  accessoryColors: string;
}

interface ClothingResult {
  bodyType: string;
  bestStyles: string[];
  bestCuts: string[];
  fabrics: string[];
  avoid: string[];
  tips: string;
}

interface HairResult {
  currentType: string;
  bestHairstyles: string[];
  bestCuts: string[];
  careRoutine: string[];
  tips: string;
}

interface SkincareResult {
  guaSha: string[];
  lymphaticDrainage: string[];
  facialExercises: string[];
  dailyRoutine: string[];
  antiAging: string;
}

interface SocialMediaResult {
  contentType: string;
  platforms: string[];
  visualStyle: string;
  videoIdeas: string[];
  tips: string;
}

interface SelfEsteemResult {
  observation: string;
  strengths: string[];
  affirmation: string;
  dailyHabit: string;
  innerDialogue: string;
}

interface TransformResult {
  greeting: string;
  faceShape: string;
  skinTone: string;
  skinSubtone: string;
  colorimetry: ColorimetryResult;
  clothing: ClothingResult;
  hair: HairResult;
  skincare: SkincareResult;
  socialMedia: SocialMediaResult;
  selfEsteem: SelfEsteemResult;
  dailyMessage: string;
}

// ── Color name to CSS color mapping ────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  // Spanish color names
  'rojo': '#DC2626', 'rojo oscuro': '#991B1B', 'rojo cereza': '#BE123C',
  'rosa': '#EC4899', 'rosa palo': '#F9A8D4', 'rosa pastel': '#FBCFE8', 'fucsia': '#D946EF', 'magenta': '#E11D90',
  'naranja': '#EA580C', 'naranja quemado': '#C2410C', 'coral': '#F97316', 'salmón': '#FA8072', 'durazno': '#FBBF24', 'terracota': '#B45309',
  'amarillo': '#EAB308', 'amarillo mostaza': '#CA8A04', 'mostaza': '#CA8A04', 'dorado': '#D4A017', 'oro': '#FFD700',
  'verde': '#16A34A', 'verde oliva': '#65A30D', 'verde esmeralda': '#059669', 'verde bosque': '#166534',
  'verde menta': '#6EE7B7', 'verde agua': '#5EEAD4', 'verde militar': '#4D7C0F', 'verde salvia': '#9CAF88', 'oliva': '#808000',
  'azul': '#2563EB', 'azul marino': '#1E3A5F', 'azul cielo': '#7DD3FC', 'azul royal': '#1D4ED8',
  'azul cobalto': '#0047AB', 'azul eléctrico': '#0EA5E9', 'azul petróleo': '#155E75', 'turquesa': '#14B8A6', 'celeste': '#7DD3FC', 'índigo': '#4F46E5',
  'morado': '#7C3AED', 'púrpura': '#9333EA', 'lila': '#C084FC', 'lavanda': '#DDD6FE', 'violeta': '#8B5CF6', 'ciruela': '#7E22CE',
  'marrón': '#92400E', 'café': '#78350F', 'chocolate': '#6B4226', 'camel': '#C6A664', 'beige': '#D4C5A9',
  'crema': '#FFFDD0', 'arena': '#C2B280', 'tierra': '#8B6F47', 'caramelo': '#FFD59A', 'canela': '#D2691E', 'tostado': '#C4A882',
  'blanco': '#FAFAFA', 'blanco roto': '#F5F0E8', 'marfil': '#FFFFF0', 'crudo': '#F5F0E8',
  'negro': '#1A1A1A', 'gris': '#6B7280', 'gris oscuro': '#374151', 'gris claro': '#D1D5DB', 'plata': '#C0C0C0', 'plateado': '#C0C0C0',
  'burdeos': '#800020', 'borgoña': '#800020', 'vino': '#722F37', 'granate': '#800000',
  'nude': '#E8C4A2', 'champán': '#F7E7CE', 'melocotón': '#FFCBA4', 'ocre': '#CC7722',
  // English color names (fallback)
  'red': '#DC2626', 'pink': '#EC4899', 'orange': '#EA580C', 'yellow': '#EAB308',
  'green': '#16A34A', 'blue': '#2563EB', 'purple': '#7C3AED', 'brown': '#92400E',
  'white': '#FAFAFA', 'black': '#1A1A1A', 'gray': '#6B7280', 'gold': '#FFD700',
  'navy': '#1E3A5F', 'teal': '#14B8A6', 'burgundy': '#800020', 'cream': '#FFFDD0',
};

function getColorHex(colorName: string): string {
  const lower = colorName.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  // Try partial match
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  // Generate a consistent hash-based color
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 50%)`;
}

// ── Goals ──────────────────────────────────────────────────────────────
const GOALS = [
  { value: '', label: 'Selecciona un objetivo (opcional)' },
  { value: 'Verme mejor', label: '💄 Verme mejor' },
  { value: 'Sanar emocionalmente', label: '💆 Sanar emocionalmente' },
  { value: 'Crecer en redes', label: '📱 Crecer en redes sociales' },
  { value: 'Todo', label: '✨ Todo: imagen, emociones y redes' },
];

// ── Collapsible Card ───────────────────────────────────────────────────
function ResultCard({
  emoji, title, gradient, children, defaultOpen = false,
}: {
  emoji: string; title: string; gradient: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${open ? 'shadow-xl' : 'shadow-md'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${gradient} text-white font-semibold text-left transition-all`}
      >
        <span className="text-2xl">{emoji}</span>
        <span className="flex-1 text-base sm:text-lg">{title}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-gray-800/90 backdrop-blur-sm p-5 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Color Swatch ───────────────────────────────────────────────────────
function ColorSwatch({ color }: { color: string }) {
  const hex = getColorHex(color);
  return (
    <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5">
      <div
        className="w-6 h-6 rounded-full border-2 border-white/30 flex-shrink-0"
        style={{ backgroundColor: hex }}
        title={color}
      />
      <span className="text-sm text-gray-200 capitalize">{color}</span>
    </div>
  );
}

// ── List Item ──────────────────────────────────────────────────────────
function ListItem({ text, icon = '•' }: { text: string; icon?: string }) {
  return (
    <li className="flex gap-2 text-gray-300 text-sm leading-relaxed">
      <span className="text-pink-400 flex-shrink-0 mt-0.5">{icon}</span>
      <span>{text}</span>
    </li>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function TransformSection() {
  const [image, setImage] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState('');
  const [personality, setPersonality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TransformResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor, sube una imagen (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('La imagen es muy grande. Máximo 20MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post<TransformResult>('/transform/analyze', {
        imageUrl: image,
        age: age ? parseInt(age) : undefined,
        goal: goal || undefined,
        personality: personality || undefined,
      }, 120_000);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al analizar. Intenta de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError('');
    setAge('');
    setGoal('');
    setPersonality('');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
          ✨ Tu Transformación Personal
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
          Sube tu selfie y recibe un análisis completo: colorimetría, moda, cabello, skincare, redes sociales y un mensaje de autoestima personalizado.
        </p>
      </div>

      {/* Upload Area */}
      {!result && (
        <div className="max-w-2xl mx-auto space-y-4">
          {!image ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center ${
                dragOver
                  ? 'border-pink-400 bg-pink-500/10 scale-[1.02]'
                  : 'border-gray-600 hover:border-pink-400/50 hover:bg-gray-800/50'
              }`}
            >
              <div className="space-y-4">
                <div className="text-5xl sm:text-6xl">📸</div>
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-white">Sube tu selfie</p>
                  <p className="text-gray-400 text-sm mt-1">Arrastra y suelta, o haz clic para seleccionar</p>
                  <p className="text-gray-500 text-xs mt-2">JPG, PNG o WebP • Máximo 20MB</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-800 max-w-sm mx-auto">
                <img src={image} alt="Tu selfie" className="w-full h-auto max-h-80 object-contain" />
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 bg-gray-900/80 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                  title="Cambiar foto"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Edad (opcional)</label>
                  <input
                    type="number" min="10" max="100" value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Ej: 28"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Objetivo (opcional)</label>
                  <select
                    value={goal} onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500 transition-colors"
                  >
                    {GOALS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Cuéntame sobre ti (opcional)</label>
                <textarea
                  value={personality} onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Ej: Soy tímida pero quiero mostrarme más segura, me gusta la moda minimalista..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                />
              </div>

              {/* Camera + Analyze buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl px-4 py-3 transition-colors"
                  title="Tomar selfie"
                >
                  <span>📷</span>
                  <span className="hidden sm:inline text-sm">Cámara</span>
                </button>
                <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

                <button
                  onClick={analyze}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-all shadow-lg shadow-pink-500/25"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analizando tu foto...
                    </span>
                  ) : '✨ Analizar mi foto'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Loading Animation */}
      {loading && (
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-1">
            {['✨', '💄', '👗', '💇', '🧖', '📱', '💖'].map((e, i) => (
              <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>{e}</span>
            ))}
          </div>
          <p className="text-gray-400 text-sm">Analizando tu foto con IA... esto puede tomar unos segundos</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
          {/* Greeting */}
          <div className="bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-pink-500/30 rounded-2xl p-5 text-center">
            <p className="text-white text-lg sm:text-xl font-medium leading-relaxed">{result.greeting}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm text-gray-300">
              <span className="bg-gray-700/50 rounded-full px-3 py-1">🪞 Rostro: {result.faceShape}</span>
              <span className="bg-gray-700/50 rounded-full px-3 py-1">🎨 Tono: {result.skinTone}</span>
              <span className="bg-gray-700/50 rounded-full px-3 py-1">✨ Subtono: {result.skinSubtone}</span>
            </div>
          </div>

          {/* Colorimetry */}
          <ResultCard emoji="🌈" title="Colorimetría" gradient="from-amber-500 to-orange-600" defaultOpen>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl px-4 py-3">
                <span className="text-amber-400 font-semibold">Estación:</span>
                <span className="text-white ml-2 text-lg capitalize">{result.colorimetry.season}</span>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wide">✅ Tus mejores colores</p>
                <div className="flex flex-wrap gap-2">
                  {result.colorimetry.bestColors.map((c, i) => <ColorSwatch key={i} color={c} />)}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wide">❌ Colores a evitar</p>
                <div className="flex flex-wrap gap-2">
                  {result.colorimetry.avoidColors.map((c, i) => <ColorSwatch key={i} color={c} />)}
                </div>
              </div>
              {result.colorimetry.makeupTips && (
                <div>
                  <p className="text-gray-400 text-xs mb-1 font-medium uppercase tracking-wide">💄 Maquillaje</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.colorimetry.makeupTips}</p>
                </div>
              )}
              {result.colorimetry.accessoryColors && (
                <div>
                  <p className="text-gray-400 text-xs mb-1 font-medium uppercase tracking-wide">💍 Accesorios</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.colorimetry.accessoryColors}</p>
                </div>
              )}
            </div>
          </ResultCard>

          {/* Clothing */}
          <ResultCard emoji="👗" title="Tu Ropa Ideal" gradient="from-violet-500 to-purple-600">
            <div className="space-y-3">
              {result.clothing.bodyType && (
                <p className="text-gray-300 text-sm"><span className="text-violet-400 font-medium">Tipo de cuerpo:</span> {result.clothing.bodyType}</p>
              )}
              {result.clothing.bestStyles.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Estilos recomendados</p>
                  <ul className="space-y-1">
                    {result.clothing.bestStyles.map((s, i) => <ListItem key={i} text={s} icon="👗" />)}
                  </ul>
                </div>
              )}
              {result.clothing.bestCuts.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Mejores cortes</p>
                  <ul className="space-y-1">
                    {result.clothing.bestCuts.map((s, i) => <ListItem key={i} text={s} icon="✂️" />)}
                  </ul>
                </div>
              )}
              {result.clothing.fabrics.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Telas ideales</p>
                  <div className="flex flex-wrap gap-2">
                    {result.clothing.fabrics.map((f, i) => (
                      <span key={i} className="bg-violet-500/20 text-violet-300 rounded-full px-3 py-1 text-xs">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.clothing.avoid.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Evitar</p>
                  <ul className="space-y-1">
                    {result.clothing.avoid.map((s, i) => <ListItem key={i} text={s} icon="🚫" />)}
                  </ul>
                </div>
              )}
              {result.clothing.tips && <p className="text-gray-300 text-sm italic border-l-2 border-violet-500 pl-3">{result.clothing.tips}</p>}
            </div>
          </ResultCard>

          {/* Hair */}
          <ResultCard emoji="💇" title="Cabello" gradient="from-teal-500 to-emerald-600">
            <div className="space-y-3">
              {result.hair.currentType && (
                <p className="text-gray-300 text-sm"><span className="text-teal-400 font-medium">Tu tipo actual:</span> {result.hair.currentType}</p>
              )}
              {result.hair.bestHairstyles.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Peinados recomendados</p>
                  <ul className="space-y-1">
                    {result.hair.bestHairstyles.map((s, i) => <ListItem key={i} text={s} icon="💇" />)}
                  </ul>
                </div>
              )}
              {result.hair.bestCuts.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Cortes ideales</p>
                  <ul className="space-y-1">
                    {result.hair.bestCuts.map((s, i) => <ListItem key={i} text={s} icon="✂️" />)}
                  </ul>
                </div>
              )}
              {result.hair.careRoutine.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Rutina de cuidado</p>
                  <ol className="space-y-1">
                    {result.hair.careRoutine.map((s, i) => <ListItem key={i} text={s} icon={`${i + 1}.`} />)}
                  </ol>
                </div>
              )}
              {result.hair.tips && <p className="text-gray-300 text-sm italic border-l-2 border-teal-500 pl-3">{result.hair.tips}</p>}
            </div>
          </ResultCard>

          {/* Skincare */}
          <ResultCard emoji="🧖" title="Skincare & Técnicas" gradient="from-rose-500 to-pink-600">
            <div className="space-y-3">
              {result.skincare.dailyRoutine.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Rutina diaria</p>
                  <ol className="space-y-1">
                    {result.skincare.dailyRoutine.map((s, i) => <ListItem key={i} text={s} icon={`${i + 1}.`} />)}
                  </ol>
                </div>
              )}
              {result.skincare.guaSha.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">🪨 Gua Sha</p>
                  <ol className="space-y-1">
                    {result.skincare.guaSha.map((s, i) => <ListItem key={i} text={s} icon={`${i + 1}.`} />)}
                  </ol>
                </div>
              )}
              {result.skincare.lymphaticDrainage.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">💆 Drenaje linfático</p>
                  <ol className="space-y-1">
                    {result.skincare.lymphaticDrainage.map((s, i) => <ListItem key={i} text={s} icon={`${i + 1}.`} />)}
                  </ol>
                </div>
              )}
              {result.skincare.facialExercises.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">🏋️ Ejercicios faciales</p>
                  <ul className="space-y-1">
                    {result.skincare.facialExercises.map((s, i) => <ListItem key={i} text={s} icon="💪" />)}
                  </ul>
                </div>
              )}
              {result.skincare.antiAging && (
                <p className="text-gray-300 text-sm italic border-l-2 border-rose-500 pl-3">🌟 {result.skincare.antiAging}</p>
              )}
            </div>
          </ResultCard>

          {/* Social Media */}
          <ResultCard emoji="📱" title="Redes Sociales" gradient="from-blue-500 to-indigo-600">
            <div className="space-y-3">
              {result.socialMedia.contentType && (
                <p className="text-gray-300 text-sm"><span className="text-blue-400 font-medium">Tu tipo de contenido:</span> {result.socialMedia.contentType}</p>
              )}
              {result.socialMedia.platforms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.socialMedia.platforms.map((p, i) => (
                    <span key={i} className="bg-blue-500/20 text-blue-300 rounded-full px-3 py-1 text-sm font-medium">{p}</span>
                  ))}
                </div>
              )}
              {result.socialMedia.visualStyle && (
                <p className="text-gray-300 text-sm"><span className="text-blue-400 font-medium">Estilo visual:</span> {result.socialMedia.visualStyle}</p>
              )}
              {result.socialMedia.videoIdeas.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Ideas de video</p>
                  <ul className="space-y-1">
                    {result.socialMedia.videoIdeas.map((s, i) => <ListItem key={i} text={s} icon="🎬" />)}
                  </ul>
                </div>
              )}
              {result.socialMedia.tips && (
                <p className="text-gray-300 text-sm italic border-l-2 border-blue-500 pl-3">{result.socialMedia.tips}</p>
              )}
            </div>
          </ResultCard>

          {/* Self Esteem */}
          <ResultCard emoji="💖" title="Autoestima" gradient="from-pink-500 to-rose-600" defaultOpen>
            <div className="space-y-4">
              {result.selfEsteem.observation && (
                <p className="text-gray-300 text-sm leading-relaxed">{result.selfEsteem.observation}</p>
              )}
              {result.selfEsteem.strengths.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Tus fortalezas</p>
                  <div className="flex flex-wrap gap-2">
                    {result.selfEsteem.strengths.map((s, i) => (
                      <span key={i} className="bg-pink-500/20 text-pink-300 rounded-full px-3 py-1.5 text-sm">💪 {s}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.selfEsteem.affirmation && (
                <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl p-4 text-center">
                  <p className="text-pink-300 text-sm font-medium mb-1">Tu afirmación</p>
                  <p className="text-white text-lg font-semibold italic">"{result.selfEsteem.affirmation}"</p>
                </div>
              )}
              {result.selfEsteem.dailyHabit && (
                <p className="text-gray-300 text-sm">
                  <span className="text-pink-400 font-medium">Hábito diario:</span> {result.selfEsteem.dailyHabit}
                </p>
              )}
              {result.selfEsteem.innerDialogue && (
                <div className="border-l-2 border-pink-500 pl-4">
                  <p className="text-gray-400 text-xs mb-1 font-medium">Tu yo fuerte te dice:</p>
                  <p className="text-white text-sm italic leading-relaxed">"{result.selfEsteem.innerDialogue}"</p>
                </div>
              )}
            </div>
          </ResultCard>

          {/* Daily Message — highlighted special card */}
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-pink-500/20">
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-6 sm:p-8 text-center space-y-3">
              <span className="text-4xl">✨</span>
              <h3 className="text-white font-bold text-lg sm:text-xl">Tu Mensaje del Día</h3>
              <p className="text-white/95 text-base sm:text-lg leading-relaxed max-w-lg mx-auto font-medium">
                {result.dailyMessage}
              </p>
              <div className="text-white/60 text-2xl mt-2">💖</div>
            </div>
          </div>

          {/* New Analysis button */}
          <div className="text-center pt-4">
            <button
              onClick={reset}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-xl px-6 py-3 transition-colors text-sm font-medium"
            >
              📸 Nuevo análisis
            </button>
          </div>
        </div>
      )}

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.6s ease-out; }
      `}</style>
    </div>
  );
}
