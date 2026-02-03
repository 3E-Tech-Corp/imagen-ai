export type GenerationType = 'image' | 'video' | 'voice' | 'tools' | 'recipe' | 'projects';

export type VoiceGender = 'female' | 'male';

// === STYLES ===
export interface StyleOption {
  value: string;
  label: string;
  emoji: string;
}

export const STYLES: StyleOption[] = [
  { value: 'photorealistic', label: 'Fotorrealista', emoji: '📷' },
  { value: 'realistic', label: 'Realista', emoji: '🎯' },
  { value: 'digital-illustration', label: 'Ilustración Digital', emoji: '🖌️' },
  { value: 'anime', label: 'Anime', emoji: '✨' },
  { value: 'manga', label: 'Manga', emoji: '📖' },
  { value: 'pixar-3d', label: 'Pixar / 3D Cinematográfico', emoji: '🎬' },
  { value: 'watercolor', label: 'Acuarela', emoji: '💧' },
  { value: 'oil-painting', label: 'Pintura al Óleo', emoji: '🖼️' },
  { value: 'pencil-drawing', label: 'Dibujo a Lápiz', emoji: '✏️' },
  { value: '3d-render', label: '3D Render', emoji: '🧊' },
  { value: 'cinematic', label: 'Cinematográfico', emoji: '🎥' },
  { value: 'custom-mix', label: 'Mezcla Personalizada', emoji: '🎨' },
];

// === ENVIRONMENTS ===
export interface EnvironmentOption {
  value: string;
  label: string;
  emoji: string;
}

export const ENVIRONMENTS: EnvironmentOption[] = [
  { value: 'any', label: 'Cualquiera', emoji: '🌍' },
  { value: 'interior', label: 'Interior', emoji: '🏠' },
  { value: 'exterior', label: 'Exterior', emoji: '🌳' },
  { value: 'urban', label: 'Urbano', emoji: '🏙️' },
  { value: 'nature', label: 'Naturaleza', emoji: '🏔️' },
  { value: 'underwater', label: 'Submarino', emoji: '🌊' },
  { value: 'space', label: 'Espacio', emoji: '🚀' },
  { value: 'fantasy', label: 'Fantasía', emoji: '🧙' },
];

// === TIME PERIODS ===
export interface TimePeriodOption {
  value: string;
  label: string;
  emoji: string;
}

export const TIME_PERIODS: TimePeriodOption[] = [
  { value: 'any', label: 'Cualquiera', emoji: '⏳' },
  { value: 'current', label: 'Actual', emoji: '📱' },
  { value: 'medieval', label: 'Medieval', emoji: '⚔️' },
  { value: 'renaissance', label: 'Renacimiento', emoji: '🎭' },
  { value: '80s', label: 'Años 80', emoji: '📼' },
  { value: '90s', label: 'Años 90', emoji: '💿' },
  { value: 'ancient', label: 'Pasado Lejano', emoji: '🏛️' },
  { value: 'futuristic', label: 'Futurista', emoji: '🤖' },
  { value: 'far-future', label: 'Futuro Distante', emoji: '🌌' },
];

// === LIGHTING ===
export interface LightingOption {
  value: string;
  label: string;
  emoji: string;
}

export const LIGHTING_OPTIONS: LightingOption[] = [
  { value: 'any', label: 'Automático', emoji: '💡' },
  { value: 'day', label: 'Día', emoji: '☀️' },
  { value: 'night', label: 'Noche', emoji: '🌙' },
  { value: 'golden-hour', label: 'Hora Dorada', emoji: '🌅' },
  { value: 'blue-hour', label: 'Hora Azul', emoji: '🌆' },
  { value: 'dramatic', label: 'Dramática', emoji: '⚡' },
  { value: 'neon', label: 'Neón', emoji: '💜' },
  { value: 'soft', label: 'Suave', emoji: '🕯️' },
];

// === EMOTIONS ===
export interface EmotionOption {
  value: string;
  label: string;
  emoji: string;
}

export const EMOTIONS: EmotionOption[] = [
  { value: 'any', label: 'Neutral', emoji: '😐' },
  { value: 'happy', label: 'Felicidad', emoji: '😊' },
  { value: 'dark', label: 'Oscuridad', emoji: '🖤' },
  { value: 'mystery', label: 'Misterio', emoji: '🔮' },
  { value: 'epic', label: 'Épica', emoji: '⚡' },
  { value: 'calm', label: 'Tranquilidad', emoji: '🧘' },
  { value: 'romance', label: 'Romance', emoji: '❤️' },
  { value: 'chaos', label: 'Caos', emoji: '🌪️' },
  { value: 'melancholy', label: 'Melancolía', emoji: '🌧️' },
  { value: 'horror', label: 'Terror', emoji: '👻' },
  { value: 'wonder', label: 'Asombro', emoji: '✨' },
  { value: 'nostalgia', label: 'Nostalgia', emoji: '📷' },
];

// === QUALITY ===
export interface QualityOption {
  value: string;
  label: string;
  emoji: string;
}

export const QUALITY_OPTIONS: QualityOption[] = [
  { value: 'standard', label: 'Estándar (HD)', emoji: '📺' },
  { value: 'high', label: 'Alta (Full HD)', emoji: '🖥️' },
  { value: 'ultra', label: 'Ultra HD (4K)', emoji: '🎞️' },
  { value: 'max', label: 'Máxima (8K)', emoji: '🏆' },
];

// === USE CASES ===
export interface UseCaseOption {
  value: string;
  label: string;
  emoji: string;
}

export const USE_CASES: UseCaseOption[] = [
  { value: 'any', label: 'General', emoji: '🌐' },
  { value: 'social-media', label: 'Redes Sociales', emoji: '📱' },
  { value: 'concept-art', label: 'Arte Conceptual', emoji: '🎨' },
  { value: 'product', label: 'Producto', emoji: '📦' },
  { value: 'avatar', label: 'Avatar', emoji: '👤' },
  { value: 'wallpaper', label: 'Fondo de Pantalla', emoji: '🖼️' },
  { value: 'branding', label: 'Branding', emoji: '™️' },
  { value: 'marketing', label: 'Marketing', emoji: '📊' },
  { value: 'storytelling', label: 'Narrativa', emoji: '📚' },
];

// === LANGUAGES ===
export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: '中文 (Mandarín)', flag: '🇨🇳' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ta', name: 'தமிழ்', flag: '🇱🇰' },
];

// === GENERATION MODELS ===
export interface ImageStyle {
  value: string;
}

export interface GenerationRequest {
  prompt: string;
  type: GenerationType;
  style: string;
  environment: string;
  timePeriod: string;
  lighting: string;
  emotion: string;
  quality: string;
  useCase: string;
  negativePrompt?: string;
}

export interface VoiceRequest {
  text: string;
  language: string;
  gender: VoiceGender;
}

export interface GenerationResult {
  id: string;
  prompt: string;
  type: GenerationType;
  style: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}
