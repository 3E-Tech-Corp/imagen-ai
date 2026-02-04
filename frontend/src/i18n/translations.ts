// App UI translations
export type AppLang = 'es' | 'en' | 'fr' | 'pt' | 'de' | 'it' | 'zh' | 'ja' | 'ko' | 'ar' | 'ru' | 'hi' | 'tr' | 'nl';

export interface Translations {
  // Header
  studioCreativo: string;
  imagenes: string;
  videos: string;
  herramientas: string;
  glowUp: string;
  miEspejo: string;
  voces: string;
  recetas: string;
  proyectos: string;
  // Chat
  bienvenidaImg: string;
  bienvenidaVid: string;
  describeLaImagen: string;
  describeElVideo: string;
  creando: string;
  procesando: string;
  tu: string;
  iaCreativa: string;
  descargar: string;
  modificar: string;
  hacerVideo: string;
  intentarDeNuevo: string;
  generandoVideo: string;
  listoEn2Min: string;
  videoListo: string;
  sugerenciasImg: string[];
  sugerenciasVid: string[];
  // Settings panel
  personalizar: string;
  colorDeLaApp: string;
  tipografia: string;
  idiomaDeLaApp: string;
  cerrar: string;
  // Footer
  footerText: string;
  // Misc
  adjuntarImagen: string;
  sueltaTuImagen: string;
  escribHabla: string;
}

const es: Translations = {
  studioCreativo: 'Studio Creativo',
  imagenes: 'Imágenes',
  videos: 'Videos',
  herramientas: 'Herramientas',
  glowUp: 'Glow Up',
  miEspejo: 'Mi Espejo',
  voces: 'Voces',
  recetas: 'Recetas',
  proyectos: 'Proyectos',
  bienvenidaImg: '👋 ¡Bienvenida a tu estudio creativo!\n\nCreo **cualquier cosa** que me pidas — personas, animales, objetos, paisajes — en el estilo que quieras.\n\n🎨 **Estilos disponibles:**\n• 📸 Realista (fotos que parecen reales)\n• 🎌 Anime / Manga\n• 🎬 Animación / Cartoon\n• 🧊 3D / Pixar / Disney\n• 🖌️ Pintura / Acuarela / Dibujo\n\n💡 **Escríbeme como quieras** — simple, detallado, como te salga. Yo te entiendo.',
  bienvenidaVid: '👋 ¡Bienvenida al estudio de video!\n\nCreo videos **con sonido** en cualquier estilo e idioma.\n\n🎬 **Lo que puedo hacer:**\n• Videos realistas, anime, animación o 3D\n• Con sonido, música y voces\n• En español, inglés, francés y 10+ idiomas\n• Animar cualquier imagen que generes\n\n⚡ Videos listos en **menos de 1 minuto**',
  describeLaImagen: 'Describe la imagen que quieres...',
  describeElVideo: 'Describe el video que quieres...',
  creando: 'Creando...',
  procesando: 'Procesando...',
  tu: 'Tú',
  iaCreativa: '🤖 IA Creativa',
  descargar: '📥 Descargar',
  modificar: '✏️ Modificar',
  hacerVideo: '🎬 Hacer Video',
  intentarDeNuevo: '🔄 Intentar de nuevo',
  generandoVideo: 'Generando video con sonido...',
  listoEn2Min: '⚡ Listo en menos de 1 minuto',
  videoListo: '✅ ¡Tu video está listo!',
  sugerenciasImg: ['👩 Una mujer bonita en la playa', '🐱 Un gatito tierno', '🐉 Un dragón de anime épico', '🏙️ Ciudad futurista 3D'],
  sugerenciasVid: ['🌊 Video de olas con sonido', '🎬 Animar mi última imagen', '💃 Mujer bailando en la ciudad', '🦁 León caminando en la sabana'],
  personalizar: 'Personalizar',
  colorDeLaApp: '🎨 Color de la app',
  tipografia: '✍️ Tipografía',
  idiomaDeLaApp: '🌍 Idioma de la app',
  cerrar: 'Cerrar',
  footerText: 'Imagen AI — Crea imágenes, videos y voces con inteligencia artificial',
  adjuntarImagen: 'Adjuntar imagen',
  sueltaTuImagen: '📎 Suelta tu imagen aquí',
  escribHabla: 'Escribe, habla 🎤 o sube imágenes 📎 — La IA sigue tu conversación',
};

const en: Translations = {
  studioCreativo: 'Creative Studio',
  imagenes: 'Images',
  videos: 'Videos',
  herramientas: 'Tools',
  glowUp: 'Glow Up',
  miEspejo: 'My Mirror',
  voces: 'Voices',
  recetas: 'Recipes',
  proyectos: 'Projects',
  bienvenidaImg: '👋 Welcome to your creative studio!\n\nI create **anything** you ask — people, animals, objects, landscapes — in any style.\n\n🎨 **Available styles:**\n• 📸 Realistic (photos that look real)\n• 🎌 Anime / Manga\n• 🎬 Animation / Cartoon\n• 🧊 3D / Pixar / Disney\n• 🖌️ Painting / Watercolor / Drawing\n\n💡 **Write however you want** — simple, detailed, however it comes out. I understand you.',
  bienvenidaVid: '👋 Welcome to the video studio!\n\nI create videos **with sound** in any style and language.\n\n🎬 **What I can do:**\n• Realistic, anime, animation or 3D videos\n• With sound, music and voices\n• In English, Spanish, French and 10+ languages\n• Animate any image you generate\n\n⚡ Videos ready in **under 1 minute**',
  describeLaImagen: 'Describe the image you want...',
  describeElVideo: 'Describe the video you want...',
  creando: 'Creating...',
  procesando: 'Processing...',
  tu: 'You',
  iaCreativa: '🤖 Creative AI',
  descargar: '📥 Download',
  modificar: '✏️ Edit',
  hacerVideo: '🎬 Make Video',
  intentarDeNuevo: '🔄 Try again',
  generandoVideo: 'Generating video with sound...',
  listoEn2Min: '⚡ Ready in under 1 minute',
  videoListo: '✅ Your video is ready!',
  sugerenciasImg: ['👩 A beautiful woman on the beach', '🐱 A cute kitten', '🐉 An epic anime dragon', '🏙️ Futuristic 3D city'],
  sugerenciasVid: ['🌊 Video of waves with sound', '🎬 Animate my last image', '💃 Woman dancing in the city', '🦁 Lion walking in the savanna'],
  personalizar: 'Customize',
  colorDeLaApp: '🎨 App color',
  tipografia: '✍️ Typography',
  idiomaDeLaApp: '🌍 App language',
  cerrar: 'Close',
  footerText: 'Imagen AI — Create images, videos and voices with artificial intelligence',
  adjuntarImagen: 'Attach image',
  sueltaTuImagen: '📎 Drop your image here',
  escribHabla: 'Type, speak 🎤 or upload images 📎 — AI follows your conversation',
};

const fr: Translations = {
  studioCreativo: 'Studio Créatif',
  imagenes: 'Images',
  videos: 'Vidéos',
  herramientas: 'Outils',
  glowUp: 'Glow Up',
  miEspejo: 'Mon Miroir',
  voces: 'Voix',
  recetas: 'Recettes',
  proyectos: 'Projets',
  bienvenidaImg: '👋 Bienvenue dans votre studio créatif!\n\nJe crée **tout** ce que vous demandez — personnes, animaux, objets, paysages — dans le style que vous voulez.\n\n💡 **Écrivez comme vous voulez** — je vous comprends.',
  bienvenidaVid: '👋 Bienvenue au studio vidéo!\n\nJe crée des vidéos **avec son** dans tout style et langue.\n\n⚡ Vidéos prêtes en **moins d\'1 minute**',
  describeLaImagen: 'Décrivez l\'image que vous voulez...',
  describeElVideo: 'Décrivez la vidéo que vous voulez...',
  creando: 'Création...',
  procesando: 'Traitement...',
  tu: 'Vous',
  iaCreativa: '🤖 IA Créative',
  descargar: '📥 Télécharger',
  modificar: '✏️ Modifier',
  hacerVideo: '🎬 Faire Vidéo',
  intentarDeNuevo: '🔄 Réessayer',
  generandoVideo: 'Génération vidéo avec son...',
  listoEn2Min: '⚡ Prêt en moins d\'1 minute',
  videoListo: '✅ Votre vidéo est prête!',
  sugerenciasImg: ['👩 Une belle femme à la plage', '🐱 Un chaton mignon', '🐉 Un dragon anime épique', '🏙️ Ville futuriste 3D'],
  sugerenciasVid: ['🌊 Vidéo de vagues avec son', '🎬 Animer ma dernière image', '💃 Femme dansant en ville', '🦁 Lion marchant dans la savane'],
  personalizar: 'Personnaliser',
  colorDeLaApp: '🎨 Couleur de l\'app',
  tipografia: '✍️ Typographie',
  idiomaDeLaApp: '🌍 Langue de l\'app',
  cerrar: 'Fermer',
  footerText: 'Imagen AI — Créez des images, vidéos et voix avec l\'intelligence artificielle',
  adjuntarImagen: 'Joindre image',
  sueltaTuImagen: '📎 Déposez votre image ici',
  escribHabla: 'Tapez, parlez 🎤 ou uploadez 📎 — L\'IA suit votre conversation',
};

const pt: Translations = {
  studioCreativo: 'Estúdio Criativo',
  imagenes: 'Imagens',
  videos: 'Vídeos',
  herramientas: 'Ferramentas',
  glowUp: 'Glow Up',
  miEspejo: 'Meu Espelho',
  voces: 'Vozes',
  recetas: 'Receitas',
  proyectos: 'Projetos',
  bienvenidaImg: '👋 Bem-vinda ao seu estúdio criativo!\n\nCrio **qualquer coisa** que você pedir — pessoas, animais, objetos, paisagens — no estilo que quiser.\n\n💡 **Escreva como quiser** — eu entendo.',
  bienvenidaVid: '👋 Bem-vinda ao estúdio de vídeo!\n\nCrio vídeos **com som** em qualquer estilo e idioma.\n\n⚡ Vídeos prontos em **menos de 1 minuto**',
  describeLaImagen: 'Descreva a imagem que você quer...',
  describeElVideo: 'Descreva o vídeo que você quer...',
  creando: 'Criando...',
  procesando: 'Processando...',
  tu: 'Você',
  iaCreativa: '🤖 IA Criativa',
  descargar: '📥 Baixar',
  modificar: '✏️ Editar',
  hacerVideo: '🎬 Fazer Vídeo',
  intentarDeNuevo: '🔄 Tentar novamente',
  generandoVideo: 'Gerando vídeo com som...',
  listoEn2Min: '⚡ Pronto em menos de 1 minuto',
  videoListo: '✅ Seu vídeo está pronto!',
  sugerenciasImg: ['👩 Uma mulher bonita na praia', '🐱 Um gatinho fofo', '🐉 Um dragão anime épico', '🏙️ Cidade futurista 3D'],
  sugerenciasVid: ['🌊 Vídeo de ondas com som', '🎬 Animar minha última imagem', '💃 Mulher dançando na cidade', '🦁 Leão caminhando na savana'],
  personalizar: 'Personalizar',
  colorDeLaApp: '🎨 Cor do app',
  tipografia: '✍️ Tipografia',
  idiomaDeLaApp: '🌍 Idioma do app',
  cerrar: 'Fechar',
  footerText: 'Imagen AI — Crie imagens, vídeos e vozes com inteligência artificial',
  adjuntarImagen: 'Anexar imagem',
  sueltaTuImagen: '📎 Solte sua imagem aqui',
  escribHabla: 'Digite, fale 🎤 ou envie imagens 📎 — A IA segue sua conversa',
};

const de: Translations = {
  studioCreativo: 'Kreativstudio',
  imagenes: 'Bilder',
  videos: 'Videos',
  herramientas: 'Werkzeuge',
  glowUp: 'Glow Up',
  miEspejo: 'Mein Spiegel',
  voces: 'Stimmen',
  recetas: 'Rezepte',
  proyectos: 'Projekte',
  bienvenidaImg: '👋 Willkommen in deinem Kreativstudio!\n\nIch erstelle **alles** was du möchtest — Menschen, Tiere, Objekte, Landschaften — in jedem Stil.\n\n💡 **Schreib wie du willst** — ich verstehe dich.',
  bienvenidaVid: '👋 Willkommen im Videostudio!\n\nIch erstelle Videos **mit Sound** in jedem Stil und Sprache.\n\n⚡ Videos fertig in **unter 1 Minute**',
  describeLaImagen: 'Beschreibe das gewünschte Bild...',
  describeElVideo: 'Beschreibe das gewünschte Video...',
  creando: 'Erstelle...',
  procesando: 'Verarbeite...',
  tu: 'Du',
  iaCreativa: '🤖 Kreativ-KI',
  descargar: '📥 Herunterladen',
  modificar: '✏️ Bearbeiten',
  hacerVideo: '🎬 Video erstellen',
  intentarDeNuevo: '🔄 Erneut versuchen',
  generandoVideo: 'Video mit Sound wird erstellt...',
  listoEn2Min: '⚡ Fertig in unter 1 Minute',
  videoListo: '✅ Dein Video ist fertig!',
  sugerenciasImg: ['👩 Eine schöne Frau am Strand', '🐱 Ein süßes Kätzchen', '🐉 Ein epischer Anime-Drache', '🏙️ Futuristische 3D-Stadt'],
  sugerenciasVid: ['🌊 Video von Wellen mit Sound', '🎬 Mein letztes Bild animieren', '💃 Frau tanzt in der Stadt', '🦁 Löwe in der Savanne'],
  personalizar: 'Anpassen',
  colorDeLaApp: '🎨 App-Farbe',
  tipografia: '✍️ Schriftart',
  idiomaDeLaApp: '🌍 App-Sprache',
  cerrar: 'Schließen',
  footerText: 'Imagen AI — Erstelle Bilder, Videos und Stimmen mit künstlicher Intelligenz',
  adjuntarImagen: 'Bild anhängen',
  sueltaTuImagen: '📎 Bild hier ablegen',
  escribHabla: 'Tippe, sprich 🎤 oder lade Bilder hoch 📎 — Die KI folgt deinem Gespräch',
};

const it: Translations = {
  studioCreativo: 'Studio Creativo',
  imagenes: 'Immagini',
  videos: 'Video',
  herramientas: 'Strumenti',
  glowUp: 'Glow Up',
  miEspejo: 'Il Mio Specchio',
  voces: 'Voci',
  recetas: 'Ricette',
  proyectos: 'Progetti',
  bienvenidaImg: '👋 Benvenuta nel tuo studio creativo!\n\nCreo **qualsiasi cosa** tu chieda — persone, animali, oggetti, paesaggi — in qualsiasi stile.\n\n💡 **Scrivi come vuoi** — ti capisco.',
  bienvenidaVid: '👋 Benvenuta nello studio video!\n\nCreo video **con audio** in qualsiasi stile e lingua.\n\n⚡ Video pronti in **meno di 1 minuto**',
  describeLaImagen: 'Descrivi l\'immagine che vuoi...',
  describeElVideo: 'Descrivi il video che vuoi...',
  creando: 'Creazione...',
  procesando: 'Elaborazione...',
  tu: 'Tu',
  iaCreativa: '🤖 IA Creativa',
  descargar: '📥 Scarica',
  modificar: '✏️ Modifica',
  hacerVideo: '🎬 Crea Video',
  intentarDeNuevo: '🔄 Riprova',
  generandoVideo: 'Generazione video con audio...',
  listoEn2Min: '⚡ Pronto in meno di 1 minuto',
  videoListo: '✅ Il tuo video è pronto!',
  sugerenciasImg: ['👩 Una bella donna in spiaggia', '🐱 Un gattino carino', '🐉 Un drago anime epico', '🏙️ Città futuristica 3D'],
  sugerenciasVid: ['🌊 Video di onde con suono', '🎬 Anima la mia ultima immagine', '💃 Donna che balla in città', '🦁 Leone che cammina nella savana'],
  personalizar: 'Personalizza',
  colorDeLaApp: '🎨 Colore app',
  tipografia: '✍️ Tipografia',
  idiomaDeLaApp: '🌍 Lingua dell\'app',
  cerrar: 'Chiudi',
  footerText: 'Imagen AI — Crea immagini, video e voci con intelligenza artificiale',
  adjuntarImagen: 'Allega immagine',
  sueltaTuImagen: '📎 Rilascia la tua immagine qui',
  escribHabla: 'Scrivi, parla 🎤 o carica immagini 📎 — L\'IA segue la tua conversazione',
};

// Simplified entries for remaining languages (using English as base with localized key phrases)
const zh: Translations = { ...en, studioCreativo: '创意工作室', imagenes: '图片', videos: '视频', herramientas: '工具', glowUp: '变美', miEspejo: '我的镜子', voces: '配音', recetas: '食谱', proyectos: '项目', personalizar: '个性化', colorDeLaApp: '🎨 应用颜色', tipografia: '✍️ 字体', idiomaDeLaApp: '🌍 应用语言', cerrar: '关闭', tu: '你', creando: '创建中...', procesando: '处理中...', descargar: '📥 下载', modificar: '✏️ 编辑', hacerVideo: '🎬 制作视频', describeLaImagen: '描述你想要的图片...', describeElVideo: '描述你想要的视频...' };
const ja: Translations = { ...en, studioCreativo: 'クリエイティブスタジオ', imagenes: '画像', videos: '動画', herramientas: 'ツール', glowUp: 'グローアップ', miEspejo: 'マイミラー', voces: 'ボイス', recetas: 'レシピ', proyectos: 'プロジェクト', personalizar: 'カスタマイズ', colorDeLaApp: '🎨 アプリカラー', tipografia: '✍️ フォント', idiomaDeLaApp: '🌍 アプリ言語', cerrar: '閉じる', tu: 'あなた', creando: '作成中...', procesando: '処理中...', descargar: '📥 ダウンロード', describeLaImagen: '欲しい画像を説明してください...', describeElVideo: '欲しい動画を説明してください...' };
const ko: Translations = { ...en, studioCreativo: '크리에이티브 스튜디오', imagenes: '이미지', videos: '비디오', herramientas: '도구', glowUp: '글로우업', miEspejo: '내 거울', voces: '음성', recetas: '레시피', proyectos: '프로젝트', personalizar: '커스터마이즈', colorDeLaApp: '🎨 앱 색상', tipografia: '✍️ 글꼴', idiomaDeLaApp: '🌍 앱 언어', cerrar: '닫기', tu: '나', creando: '생성 중...', procesando: '처리 중...' };
const ar: Translations = { ...en, studioCreativo: 'استوديو إبداعي', imagenes: 'صور', videos: 'فيديو', herramientas: 'أدوات', personalizar: 'تخصيص', cerrar: 'إغلاق', tu: 'أنت' };
const ru: Translations = { ...en, studioCreativo: 'Креативная Студия', imagenes: 'Изображения', videos: 'Видео', herramientas: 'Инструменты', personalizar: 'Настроить', cerrar: 'Закрыть', tu: 'Вы', creando: 'Создаю...', procesando: 'Обработка...' };
const hi: Translations = { ...en, studioCreativo: 'क्रिएटिव स्टूडियो', imagenes: 'चित्र', videos: 'वीडियो', personalizar: 'कस्टमाइज़', cerrar: 'बंद करें', tu: 'आप' };
const tr: Translations = { ...en, studioCreativo: 'Yaratıcı Stüdyo', imagenes: 'Görseller', videos: 'Videolar', herramientas: 'Araçlar', personalizar: 'Kişiselleştir', cerrar: 'Kapat', tu: 'Sen' };
const nl: Translations = { ...en, studioCreativo: 'Creatief Studio', imagenes: 'Afbeeldingen', videos: "Video's", herramientas: 'Gereedschap', personalizar: 'Aanpassen', cerrar: 'Sluiten', tu: 'Jij' };

export const ALL_TRANSLATIONS: Record<AppLang, Translations> = { es, en, fr, pt, de, it, zh, ja, ko, ar, ru, hi, tr, nl };

export const APP_LANGUAGES: { code: AppLang; name: string; flag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
];

export function getTranslations(lang: AppLang): Translations {
  return ALL_TRANSLATIONS[lang] || ALL_TRANSLATIONS.es;
}
