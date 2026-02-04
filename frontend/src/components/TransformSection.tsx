import { useState, useRef, useCallback, DragEvent } from 'react';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────

interface ColorimetryResult {
  season: string;
  bestColors: string[];
  rejuvenatingColors: string[];
  authorityColors: string[];
  sweetnessColors: string[];
  sensualityColors: string[];
  avoidColors: string[];
  clothingUse: string;
  makeupUse: string;
  accessoryUse: string;
}

interface ClothingResult {
  bodyType: string;
  idealGarments: string[];
  slimmingCuts: string[];
  fabrics: string[];
  confidentLook: string;
  elegantLook: string;
  mistakesToAvoid: string[];
  tips: string;
}

interface HairResult {
  currentType: string;
  harmoniousStyles: string[];
  idealCuts: string[];
  careRoutine: string[];
  shineStrengthGrowth: string[];
  agingHabits: string[];
  tips: string;
}

interface GuaShaResult {
  technique: string;
  keyZones: string[];
  dailyTime: string;
  benefits: string[];
  withLove: string;
  steps: string[];
}

interface LymphaticDrainageResult {
  facialNeckChin: string[];
  facialCheekbones: string[];
  bodyAbdomen: string[];
  bodyLegsArms: string[];
  frequency: string;
  expectedResults: string[];
}

interface GlowUpResult {
  ageGroup: string;
  routines: string[];
  techniques: string[];
  habits: string[];
  motivation: string;
}

interface FacialTechniquesResult {
  personalizedExercises: string[];
  firmingMassages: string[];
  shortRoutines: string[];
  agingMistakes: string[];
}

interface SocialMediaResult {
  idealContentType: string;
  platforms: string[];
  visualStyle: string;
  videoIdeas: string[];
  showUpAuthentically: string;
}

interface PersonalityContentResult {
  whatToShow: string;
  whatToProtect: string;
  onCameraTips: string;
  magneticQualities: string[];
  differentiation: string;
}

interface SelfEsteemResult {
  observation: string;
  strengths: string[];
  affirmation: string;
  dailyHabit: string;
  innerDialogueTip: string;
  boostTricks: string[];
  stopComparing: string;
  setBoundaries: string;
}

interface DailyGrowthResult {
  microHabits: string[];
  selfEsteemExercises: string[];
  thoughtReprogramming: string[];
  selfCareRituals: string[];
}

interface JoyOfLivingResult {
  purposeReminders: string[];
  reconnectExercises: string[];
  lowDayTechniques: string[];
  lightPhrases: string[];
}

interface InnerDialogueResult {
  woundedSelfConversation: string;
  strongSelfMessages: string;
  painReframing: string;
}

interface TransformResult {
  greeting: string;
  faceShape: string;
  skinTone: string;
  skinSubtone: string;
  colorimetry: ColorimetryResult;
  clothing: ClothingResult;
  hair: HairResult;
  guaSha: GuaShaResult;
  lymphaticDrainage: LymphaticDrainageResult;
  glowUp: GlowUpResult;
  facialTechniques: FacialTechniquesResult;
  socialMedia: SocialMediaResult;
  personalityContent: PersonalityContentResult;
  selfEsteem: SelfEsteemResult;
  dailyGrowth: DailyGrowthResult;
  joyOfLiving: JoyOfLivingResult;
  innerDialogue: InnerDialogueResult;
  dailyMessage: string;
}

// ── Color name to CSS color mapping ────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
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
  'red': '#DC2626', 'pink': '#EC4899', 'orange': '#EA580C', 'yellow': '#EAB308',
  'green': '#16A34A', 'blue': '#2563EB', 'purple': '#7C3AED', 'brown': '#92400E',
  'white': '#FAFAFA', 'black': '#1A1A1A', 'gray': '#6B7280', 'gold': '#FFD700',
  'navy': '#1E3A5F', 'teal': '#14B8A6', 'burgundy': '#800020', 'cream': '#FFFDD0',
};

function getColorHex(colorName: string): string {
  const lower = colorName.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  let hash = 0;
  for (let i = 0; i < lower.length; i++) hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 50%)`;
}

// ── Goals ──────────────────────────────────────────────────────────────
const GOALS = [
  { value: '', label: 'Selecciona un objetivo (opcional)' },
  { value: 'Verme mejor', label: '💄 Verme mejor' },
  { value: 'Sanar emocionalmente', label: '💆 Sanar emocionalmente' },
  { value: 'Crecer en redes', label: '📱 Crecer en redes sociales' },
  { value: 'Todo', label: '✨ Todo: imagen, emociones y redes' },
];

// ── Reusable sub-components ────────────────────────────────────────────

function ResultCard({ emoji, title, gradient, children, defaultOpen = false }: {
  emoji: string; title: string; gradient: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${open ? 'shadow-xl' : 'shadow-md'}`}>
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${gradient} text-white font-semibold text-left transition-all`}>
        <span className="text-2xl">{emoji}</span>
        <span className="flex-1 text-base sm:text-lg">{title}</span>
        <svg className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-gray-800/90 backdrop-blur-sm p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5">
      <div className="w-6 h-6 rounded-full border-2 border-white/30 flex-shrink-0"
        style={{ backgroundColor: getColorHex(color) }} title={color} />
      <span className="text-sm text-gray-200 capitalize">{color}</span>
    </div>
  );
}

function ColorGroup({ label, colors }: { label: string; colors: string[] }) {
  if (!colors?.length) return null;
  return (
    <div>
      <p className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">{colors.map((c, i) => <ColorSwatch key={i} color={c} />)}</div>
    </div>
  );
}

function LI({ text, icon = '•' }: { text: string; icon?: string }) {
  return (
    <li className="flex gap-2 text-gray-300 text-sm leading-relaxed">
      <span className="text-pink-400 flex-shrink-0 mt-0.5">{icon}</span><span>{text}</span>
    </li>
  );
}

function NumberedList({ items, label, labelIcon }: { items: string[]; label?: string; labelIcon?: string }) {
  if (!items?.length) return null;
  return (
    <div>
      {label && <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">{labelIcon ? `${labelIcon} ` : ''}{label}</p>}
      <ol className="space-y-1">{items.map((s, i) => <LI key={i} text={s} icon={`${i + 1}.`} />)}</ol>
    </div>
  );
}

function BulletList({ items, label, labelIcon, icon }: { items: string[]; label?: string; labelIcon?: string; icon?: string }) {
  if (!items?.length) return null;
  return (
    <div>
      {label && <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">{labelIcon ? `${labelIcon} ` : ''}{label}</p>}
      <ul className="space-y-1">{items.map((s, i) => <LI key={i} text={s} icon={icon || '•'} />)}</ul>
    </div>
  );
}

function PillList({ items, color = 'violet' }: { items: string[]; color?: string }) {
  if (!items?.length) return null;
  const cls = {
    violet: 'bg-violet-500/20 text-violet-300',
    pink: 'bg-pink-500/20 text-pink-300',
    blue: 'bg-blue-500/20 text-blue-300',
    teal: 'bg-teal-500/20 text-teal-300',
    amber: 'bg-amber-500/20 text-amber-300',
    rose: 'bg-rose-500/20 text-rose-300',
    emerald: 'bg-emerald-500/20 text-emerald-300',
    indigo: 'bg-indigo-500/20 text-indigo-300',
  }[color] || 'bg-gray-500/20 text-gray-300';
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((f, i) => <span key={i} className={`${cls} rounded-full px-3 py-1 text-xs`}>{f}</span>)}
    </div>
  );
}

function Quote({ text, borderColor = 'border-pink-500', accentColor = 'text-pink-400' }: { text: string; borderColor?: string; accentColor?: string }) {
  if (!text) return null;
  return <p className={`text-gray-300 text-sm italic border-l-2 ${borderColor} pl-3`}><span className={accentColor}>✦</span> {text}</p>;
}

function InfoLine({ label, value, accentColor = 'text-pink-400' }: { label: string; value: string; accentColor?: string }) {
  if (!value) return null;
  return <p className="text-gray-300 text-sm"><span className={`${accentColor} font-medium`}>{label}:</span> {value}</p>;
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
    if (!file.type.startsWith('image/')) { setError('Por favor, sube una imagen (JPG, PNG, WebP).'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('La imagen es muy grande. Máximo 20MB.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result as string); setResult(null); };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const analyze = async () => {
    if (!image) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post<TransformResult>('/transform/analyze', {
        imageUrl: image,
        age: age ? parseInt(age) : undefined,
        goal: goal || undefined,
        personality: personality || undefined,
      }, 180_000);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al analizar. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  const reset = () => { setImage(null); setResult(null); setError(''); setAge(''); setGoal(''); setPersonality(''); };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
          ✨ Tu Transformación Personal
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
          Sube tu selfie y recibe un análisis completo: colorimetría, moda, cabello, gua sha, drenaje linfático, glow up, técnicas faciales, redes sociales, autoestima, crecimiento personal y un mensaje del día hecho para ti.
        </p>
      </div>

      {/* ── Upload Area ──────────────────────────────────────────── */}
      {!result && (
        <div className="max-w-2xl mx-auto space-y-4">
          {!image ? (
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center ${
                dragOver ? 'border-pink-400 bg-pink-500/10 scale-[1.02]' : 'border-gray-600 hover:border-pink-400/50 hover:bg-gray-800/50'
              }`}>
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
              <div className="relative rounded-2xl overflow-hidden bg-gray-800 max-w-sm mx-auto">
                <img src={image} alt="Tu selfie" className="w-full h-auto max-h-80 object-contain" />
                <button onClick={reset} className="absolute top-3 right-3 bg-gray-900/80 hover:bg-red-600 text-white rounded-full p-2 transition-colors" title="Cambiar foto">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Edad (opcional)</label>
                  <input type="number" min="10" max="100" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Ej: 28"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Objetivo (opcional)</label>
                  <select value={goal} onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500 transition-colors">
                    {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Cuéntame sobre ti (opcional)</label>
                <textarea value={personality} onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Ej: Soy tímida pero quiero mostrarme más segura, me gusta la moda minimalista..." rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => cameraRef.current?.click()} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl px-4 py-3 transition-colors" title="Tomar selfie">
                  <span>📷</span><span className="hidden sm:inline text-sm">Cámara</span>
                </button>
                <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <button onClick={analyze} disabled={loading}
                  className="flex-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-all shadow-lg shadow-pink-500/25">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analizando...
                    </span>
                  ) : '✨ Analizar mi foto'}
                </button>
              </div>
            </div>
          )}
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">{error}</div>}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-1">
            {['✨','🌈','👗','💇','🧖','💆','🏋️','📱','🎭','💖','🌱','🪞','💌'].map((e, i) => (
              <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.12}s` }}>{e}</span>
            ))}
          </div>
          <p className="text-gray-400 text-sm">Analizando tu foto con IA... esto puede tomar 20-30 segundos</p>
          <p className="text-gray-500 text-xs">Preparando tus 14 secciones personalizadas ✨</p>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
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

          {/* ── 1. Colorimetría ──────────────────────────────────── */}
          <ResultCard emoji="🌈" title="Colorimetría" gradient="from-amber-500 to-orange-600" defaultOpen>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl px-4 py-3">
                <span className="text-amber-400 font-semibold">Estación:</span>
                <span className="text-white ml-2 text-lg capitalize">{result.colorimetry?.season}</span>
              </div>
              <ColorGroup label="✅ Tu paleta ideal" colors={result.colorimetry?.bestColors} />
              <ColorGroup label="🌸 Colores que rejuvenecen" colors={result.colorimetry?.rejuvenatingColors} />
              <ColorGroup label="👑 Colores de autoridad / poder" colors={result.colorimetry?.authorityColors} />
              <ColorGroup label="🍬 Colores de dulzura / ternura" colors={result.colorimetry?.sweetnessColors} />
              <ColorGroup label="🔥 Colores de sensualidad" colors={result.colorimetry?.sensualityColors} />
              <ColorGroup label="❌ Colores a evitar" colors={result.colorimetry?.avoidColors} />
              <InfoLine label="👗 En la ropa" value={result.colorimetry?.clothingUse} accentColor="text-amber-400" />
              <InfoLine label="💄 En el maquillaje" value={result.colorimetry?.makeupUse} accentColor="text-amber-400" />
              <InfoLine label="💍 En accesorios" value={result.colorimetry?.accessoryUse} accentColor="text-amber-400" />
            </div>
          </ResultCard>

          {/* ── 2. Ropa Perfecta ─────────────────────────────────── */}
          <ResultCard emoji="👗" title="Tu Ropa Perfecta" gradient="from-violet-500 to-purple-600">
            <div className="space-y-3">
              <InfoLine label="Tipo de cuerpo" value={result.clothing?.bodyType} accentColor="text-violet-400" />
              <BulletList items={result.clothing?.idealGarments} label="Prendas ideales" icon="👗" />
              <BulletList items={result.clothing?.slimmingCuts} label="Cortes que estilizan" icon="✂️" />
              {result.clothing?.fabrics?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Telas ideales</p>
                  <PillList items={result.clothing.fabrics} color="violet" />
                </div>
              )}
              <InfoLine label="Para verte segura" value={result.clothing?.confidentLook} accentColor="text-violet-400" />
              <InfoLine label="Para verte elegante" value={result.clothing?.elegantLook} accentColor="text-violet-400" />
              <BulletList items={result.clothing?.mistakesToAvoid} label="Errores a evitar" icon="🚫" />
              <Quote text={result.clothing?.tips} borderColor="border-violet-500" accentColor="text-violet-400" />
            </div>
          </ResultCard>

          {/* ── 3. Peinados + Cuidado Capilar ────────────────────── */}
          <ResultCard emoji="💇" title="Peinados + Cuidado Capilar" gradient="from-teal-500 to-emerald-600">
            <div className="space-y-3">
              <InfoLine label="Tu tipo actual" value={result.hair?.currentType} accentColor="text-teal-400" />
              <BulletList items={result.hair?.harmoniousStyles} label="Peinados que armonizan" icon="💇" />
              <BulletList items={result.hair?.idealCuts} label="Cortes ideales" icon="✂️" />
              <NumberedList items={result.hair?.careRoutine} label="Rutina capilar" labelIcon="🧴" />
              <BulletList items={result.hair?.shineStrengthGrowth} label="Brillo, fuerza y crecimiento" icon="✨" />
              <BulletList items={result.hair?.agingHabits} label="Hábitos que envejecen el cabello" icon="⚠️" />
              <Quote text={result.hair?.tips} borderColor="border-teal-500" accentColor="text-teal-400" />
            </div>
          </ResultCard>

          {/* ── 4. Rutina de Gua Sha ─────────────────────────────── */}
          <ResultCard emoji="🧖" title="Rutina de Gua Sha" gradient="from-stone-500 to-stone-700">
            <div className="space-y-3">
              <InfoLine label="Técnica para tu rostro" value={result.guaSha?.technique} accentColor="text-stone-300" />
              <BulletList items={result.guaSha?.keyZones} label="Zonas clave" icon="📍" />
              <InfoLine label="⏱️ Tiempo diario" value={result.guaSha?.dailyTime} accentColor="text-stone-300" />
              <NumberedList items={result.guaSha?.steps} label="Paso a paso" labelIcon="🪨" />
              <BulletList items={result.guaSha?.benefits} label="Beneficios" icon="🌟" />
              {result.guaSha?.withLove && (
                <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl p-4">
                  <p className="text-pink-300 text-xs font-medium mb-1">💕 Hazlo con amor</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.guaSha.withLove}</p>
                </div>
              )}
            </div>
          </ResultCard>

          {/* ── 5. Drenaje Linfático ─────────────────────────────── */}
          <ResultCard emoji="💆" title="Drenaje Linfático" gradient="from-cyan-500 to-sky-600">
            <div className="space-y-3">
              <NumberedList items={result.lymphaticDrainage?.facialNeckChin} label="Facial: Cuello y papada" labelIcon="🦢" />
              <NumberedList items={result.lymphaticDrainage?.facialCheekbones} label="Facial: Pómulos" labelIcon="✨" />
              <NumberedList items={result.lymphaticDrainage?.bodyAbdomen} label="Corporal: Abdomen" labelIcon="🌀" />
              <NumberedList items={result.lymphaticDrainage?.bodyLegsArms} label="Corporal: Piernas y brazos" labelIcon="💪" />
              <InfoLine label="Frecuencia recomendada" value={result.lymphaticDrainage?.frequency} accentColor="text-cyan-400" />
              <BulletList items={result.lymphaticDrainage?.expectedResults} label="Resultados esperados" icon="🎯" />
            </div>
          </ResultCard>

          {/* ── 6. Glow Up ───────────────────────────────────────── */}
          <ResultCard emoji="✨" title="Glow Up" gradient="from-yellow-500 to-amber-600">
            <div className="space-y-3">
              {result.glowUp?.ageGroup && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl px-4 py-3">
                  <span className="text-amber-400 font-semibold">Enfoque:</span>
                  <span className="text-white ml-2">{result.glowUp.ageGroup}</span>
                </div>
              )}
              <BulletList items={result.glowUp?.routines} label="Rutinas personalizadas" icon="📋" />
              <BulletList items={result.glowUp?.techniques} label="Técnicas específicas" icon="🔬" />
              <BulletList items={result.glowUp?.habits} label="Hábitos duraderos" icon="🌱" />
              {result.glowUp?.motivation && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl p-4 text-center">
                  <p className="text-white text-sm font-medium italic">"{result.glowUp.motivation}"</p>
                </div>
              )}
            </div>
          </ResultCard>

          {/* ── 7. Técnicas Faciales Rejuvenecedoras ──────────────── */}
          <ResultCard emoji="🏋️" title="Técnicas Faciales Rejuvenecedoras" gradient="from-red-500 to-rose-600">
            <div className="space-y-3">
              <NumberedList items={result.facialTechniques?.personalizedExercises} label="Ejercicios faciales personalizados" labelIcon="🏋️" />
              <NumberedList items={result.facialTechniques?.firmingMassages} label="Masajes reafirmantes" labelIcon="🤲" />
              <BulletList items={result.facialTechniques?.shortRoutines} label="Rutinas cortas (5 min)" icon="⏱️" />
              <BulletList items={result.facialTechniques?.agingMistakes} label="Errores que envejecen" icon="⚠️" />
            </div>
          </ResultCard>

          {/* ── 8. Crecimiento en Redes ──────────────────────────── */}
          <ResultCard emoji="📱" title="Crecimiento en Redes" gradient="from-blue-500 to-indigo-600">
            <div className="space-y-3">
              <InfoLine label="Tu tipo de contenido ideal" value={result.socialMedia?.idealContentType} accentColor="text-blue-400" />
              {result.socialMedia?.platforms?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Plataformas recomendadas</p>
                  <PillList items={result.socialMedia.platforms} color="blue" />
                </div>
              )}
              <InfoLine label="Estilo visual" value={result.socialMedia?.visualStyle} accentColor="text-blue-400" />
              <BulletList items={result.socialMedia?.videoIdeas} label="Ideas de video" icon="🎬" />
              <Quote text={result.socialMedia?.showUpAuthentically} borderColor="border-blue-500" accentColor="text-blue-400" />
            </div>
          </ResultCard>

          {/* ── 9. Contenido según Personalidad ──────────────────── */}
          <ResultCard emoji="🎭" title="Contenido según tu Personalidad" gradient="from-fuchsia-500 to-pink-600">
            <div className="space-y-3">
              <InfoLine label="Qué mostrar" value={result.personalityContent?.whatToShow} accentColor="text-fuchsia-400" />
              <InfoLine label="Qué proteger" value={result.personalityContent?.whatToProtect} accentColor="text-fuchsia-400" />
              <InfoLine label="En cámara" value={result.personalityContent?.onCameraTips} accentColor="text-fuchsia-400" />
              {result.personalityContent?.magneticQualities?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">✨ Lo que te hace magnética</p>
                  <div className="flex flex-wrap gap-2">
                    {result.personalityContent.magneticQualities.map((q, i) => (
                      <span key={i} className="bg-fuchsia-500/20 text-fuchsia-300 rounded-full px-3 py-1.5 text-sm">💫 {q}</span>
                    ))}
                  </div>
                </div>
              )}
              <Quote text={result.personalityContent?.differentiation} borderColor="border-fuchsia-500" accentColor="text-fuchsia-400" />
            </div>
          </ResultCard>

          {/* ── 10. Autoestima y Amor Propio ──────────────────────── */}
          <ResultCard emoji="💖" title="Autoestima y Amor Propio" gradient="from-pink-500 to-rose-600" defaultOpen>
            <div className="space-y-4">
              {result.selfEsteem?.observation && (
                <p className="text-gray-300 text-sm leading-relaxed">{result.selfEsteem.observation}</p>
              )}
              {result.selfEsteem?.strengths?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Tus fortalezas</p>
                  <div className="flex flex-wrap gap-2">
                    {result.selfEsteem.strengths.map((s, i) => (
                      <span key={i} className="bg-pink-500/20 text-pink-300 rounded-full px-3 py-1.5 text-sm">💪 {s}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.selfEsteem?.affirmation && (
                <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl p-4 text-center">
                  <p className="text-pink-300 text-sm font-medium mb-1">Tu afirmación</p>
                  <p className="text-white text-lg font-semibold italic">&ldquo;{result.selfEsteem.affirmation}&rdquo;</p>
                </div>
              )}
              <InfoLine label="Hábito diario" value={result.selfEsteem?.dailyHabit} accentColor="text-pink-400" />
              <InfoLine label="Diálogo interno" value={result.selfEsteem?.innerDialogueTip} accentColor="text-pink-400" />
              <BulletList items={result.selfEsteem?.boostTricks} label="Trucos para subir autoestima" icon="🚀" />
              <InfoLine label="Para dejar de compararte" value={result.selfEsteem?.stopComparing} accentColor="text-pink-400" />
              <InfoLine label="Para poner límites" value={result.selfEsteem?.setBoundaries} accentColor="text-pink-400" />
            </div>
          </ResultCard>

          {/* ── 11. Rutinas Diarias de Crecimiento ───────────────── */}
          <ResultCard emoji="🌱" title="Rutinas Diarias de Crecimiento" gradient="from-emerald-500 to-green-600">
            <div className="space-y-3">
              <BulletList items={result.dailyGrowth?.microHabits} label="Micro hábitos" icon="🌱" />
              <BulletList items={result.dailyGrowth?.selfEsteemExercises} label="Ejercicios de autoestima" icon="💪" />
              <BulletList items={result.dailyGrowth?.thoughtReprogramming} label="Reprogramación de pensamientos" icon="🧠" />
              <BulletList items={result.dailyGrowth?.selfCareRituals} label="Rituales de autocuidado" icon="🕯️" />
            </div>
          </ResultCard>

          {/* ── 12. Ganas de Vivir ───────────────────────────────── */}
          <ResultCard emoji="✨" title="Ganas de Vivir" gradient="from-orange-500 to-yellow-500">
            <div className="space-y-3">
              <BulletList items={result.joyOfLiving?.purposeReminders} label="Recordatorios de propósito" icon="🎯" />
              <BulletList items={result.joyOfLiving?.reconnectExercises} label="Reconectar con la ilusión" icon="🦋" />
              <BulletList items={result.joyOfLiving?.lowDayTechniques} label="Para días bajos" icon="☀️" />
              {result.joyOfLiving?.lightPhrases?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wide">💡 Frases que devuelven la luz</p>
                  <div className="space-y-2">
                    {result.joyOfLiving.lightPhrases.map((p, i) => (
                      <div key={i} className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl px-4 py-3 text-center">
                        <p className="text-white text-sm font-medium italic">&ldquo;{p}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ResultCard>

          {/* ── 13. Diálogos Internos Guiados ────────────────────── */}
          <ResultCard emoji="🪞" title="Diálogos Internos Guiados" gradient="from-purple-500 to-indigo-600">
            <div className="space-y-4">
              {result.innerDialogue?.woundedSelfConversation && (
                <div className="bg-purple-500/10 rounded-xl p-4">
                  <p className="text-purple-300 text-xs font-medium mb-2 uppercase tracking-wide">💔 Conversación con tu yo herido</p>
                  <p className="text-gray-300 text-sm leading-relaxed italic">{result.innerDialogue.woundedSelfConversation}</p>
                </div>
              )}
              {result.innerDialogue?.strongSelfMessages && (
                <div className="bg-indigo-500/10 rounded-xl p-4">
                  <p className="text-indigo-300 text-xs font-medium mb-2 uppercase tracking-wide">💪 Mensajes de tu yo fuerte</p>
                  <p className="text-gray-300 text-sm leading-relaxed italic">{result.innerDialogue.strongSelfMessages}</p>
                </div>
              )}
              {result.innerDialogue?.painReframing && (
                <div className="bg-violet-500/10 rounded-xl p-4">
                  <p className="text-violet-300 text-xs font-medium mb-2 uppercase tracking-wide">🔄 Reencuadre del dolor</p>
                  <p className="text-gray-300 text-sm leading-relaxed italic">{result.innerDialogue.painReframing}</p>
                </div>
              )}
            </div>
          </ResultCard>

          {/* ── 14. Mensaje del Día (special highlight) ──────────── */}
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-pink-500/20">
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-6 sm:p-8 text-center space-y-3">
              <span className="text-4xl">💌</span>
              <h3 className="text-white font-bold text-lg sm:text-xl">Tu Mensaje del Día</h3>
              <p className="text-white/95 text-base sm:text-lg leading-relaxed max-w-lg mx-auto font-medium">
                {result.dailyMessage}
              </p>
              <div className="text-white/60 text-2xl mt-2">💖</div>
            </div>
          </div>

          {/* New Analysis */}
          <div className="text-center pt-4">
            <button onClick={reset}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-xl px-6 py-3 transition-colors text-sm font-medium">
              📸 Nuevo análisis
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out; }
      `}</style>
    </div>
  );
}
