import { useState, useRef, useEffect } from 'react';

interface ImageEditorProps {
  imageUrl: string;
  imageId: string;
  onClose: () => void;
  onSaved: (newUrl: string) => void;
}

type FilterType = 'none' | 'grayscale' | 'sepia' | 'contrast' | 'brightness' | 'blur' | 'saturate' | 'vintage' | 'invert' | 'warm' | 'cool';

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

const FILTERS: { value: FilterType; label: string; css: string }[] = [
  { value: 'none', label: '🚫 Original', css: 'none' },
  { value: 'grayscale', label: '⬛ B&N', css: 'grayscale(100%)' },
  { value: 'sepia', label: '🟤 Sepia', css: 'sepia(80%)' },
  { value: 'contrast', label: '🔲 Contraste', css: 'contrast(150%)' },
  { value: 'brightness', label: '☀️ Brillo', css: 'brightness(130%)' },
  { value: 'blur', label: '🌫️ Desenfoque', css: 'blur(3px)' },
  { value: 'saturate', label: '🌈 Saturado', css: 'saturate(200%)' },
  { value: 'vintage', label: '📷 Vintage', css: 'sepia(40%) contrast(120%) brightness(90%)' },
  { value: 'invert', label: '🔄 Invertir', css: 'invert(100%)' },
  { value: 'warm', label: '🔥 Cálido', css: 'sepia(30%) saturate(140%) brightness(105%)' },
  { value: 'cool', label: '❄️ Frío', css: 'saturate(80%) brightness(105%) hue-rotate(10deg)' },
];

const FONTS = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: '"Courier New", monospace', label: 'Courier' },
  { value: '"Comic Sans MS", cursive', label: 'Comic Sans' },
  { value: '"Times New Roman", serif', label: 'Times' },
];

export default function ImageEditor({ imageUrl, imageId, onClose, onSaved }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [filter, setFilter] = useState<FilterType>('none');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [activeSection, setActiveSection] = useState<'filters' | 'adjust' | 'text' | 'transform' | 'crop'>('filters');
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(32);
  const [textFont, setTextFont] = useState('Arial, sans-serif');
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [isExporting, setIsExporting] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !originalImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxW = 600;
    const maxH = 600;
    let w = originalImage.width;
    let h = originalImage.height;
    const scale = Math.min(maxW / w, maxH / h, 1);
    w *= scale;
    h *= scale;

    // Handle rotation dimensions
    if (rotation === 90 || rotation === 270) {
      canvas.width = h;
      canvas.height = w;
    } else {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Filters
    const filterParts = [];
    if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filterParts.push(`saturate(${saturation}%)`);

    const presetFilter = FILTERS.find(f => f.value === filter)?.css;
    if (presetFilter && presetFilter !== 'none') filterParts.push(presetFilter);

    ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

    // Draw image centered
    ctx.drawImage(originalImage, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Reset filter for text
    ctx.filter = 'none';

    // Draw text overlays
    textOverlays.forEach((overlay) => {
      ctx.save();
      ctx.font = `bold ${overlay.fontSize}px ${overlay.fontFamily}`;
      ctx.fillStyle = overlay.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      let y: number;
      if (overlay.y === 0) y = overlay.fontSize + 20; // top
      else if (overlay.y === 1) y = canvas.height / 2; // center
      else y = canvas.height - 20; // bottom

      ctx.fillText(overlay.text, canvas.width / 2, y);
      ctx.restore();
    });

  }, [originalImage, filter, rotation, flipH, flipV, brightness, contrast, saturation, textOverlays]);

  const addText = () => {
    if (!newText.trim()) return;
    const yPos = textPosition === 'top' ? 0 : textPosition === 'center' ? 1 : 2;
    setTextOverlays([...textOverlays, {
      text: newText,
      x: 0.5,
      y: yPos,
      fontSize: textSize,
      color: textColor,
      fontFamily: textFont,
    }]);
    setNewText('');
  };

  const removeText = (index: number) => {
    setTextOverlays(textOverlays.filter((_, i) => i !== index));
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current!.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Failed to export')),
          'image/png',
          1.0
        );
      });

      // Download locally
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `imagen-ai-edited-${imageId}.png`;
      link.click();
      URL.revokeObjectURL(url);

      onSaved(url);
    } catch (err) {
      alert('Error al exportar la imagen');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setFilter('none');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setTextOverlays([]);
  };

  const sections = [
    { id: 'filters' as const, label: '🎨 Filtros' },
    { id: 'adjust' as const, label: '🎛️ Ajustes' },
    { id: 'text' as const, label: '📝 Texto' },
    { id: 'transform' as const, label: '🔄 Transformar' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <h2 className="text-white text-lg font-bold">🖼️ Editor de Imagen</h2>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl text-sm hover:text-white transition-colors"
          >
            ↩️ Reset
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              isExporting
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r accent-gradient text-white hover:from-violet-500 hover:to-fuchsia-500'
            }`}
          >
            {isExporting ? '⏳ Exportando...' : '💾 Descargar Imagen'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl text-sm hover:text-white hover:bg-gray-700 transition-colors"
          >
            ✕ Cerrar
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Preview */}
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-950">
          {!imageLoaded ? (
            <div className="text-gray-400">Cargando imagen...</div>
          ) : (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full rounded-xl shadow-2xl"
            />
          )}
        </div>

        {/* Editor Panel */}
        <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
          {/* Section Tabs */}
          <div className="flex border-b border-gray-800">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 px-2 py-3 text-xs font-medium transition-colors ${
                  activeSection === s.id
                    ? 'bg-gray-800 text-white border-b-2 accent-border'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeSection === 'filters' && (
              <>
                <h3 className="text-white font-medium">🎨 Filtros Preset</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value)}
                      className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        filter === f.value
                          ? 'accent-bg text-white shadow-lg'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 accent-border-hover'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSection === 'adjust' && (
              <>
                <h3 className="text-white font-medium">🎛️ Ajustes Manuales</h3>
                <div>
                  <label className="text-gray-400 text-sm">☀️ Brillo: {brightness}%</label>
                  <input
                    type="range" min={0} max={200} value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full accent-yellow-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">🔲 Contraste: {contrast}%</label>
                  <input
                    type="range" min={0} max={200} value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">🌈 Saturación: {saturation}%</label>
                  <input
                    type="range" min={0} max={200} value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>
                <button
                  onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }}
                  className="w-full py-2 bg-gray-800 text-gray-400 rounded-xl text-sm hover:text-white transition-colors"
                >
                  ↩️ Resetear ajustes
                </button>
              </>
            )}

            {activeSection === 'text' && (
              <>
                <h3 className="text-white font-medium">📝 Agregar Texto</h3>
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Escribe el texto..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 accent-ring-focus"
                />
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Posición</label>
                  <div className="flex gap-2">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setTextPosition(pos)}
                        className={`flex-1 py-2 rounded-lg text-sm ${
                          textPosition === pos ? 'accent-bg text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        {pos === 'top' ? '⬆️ Arriba' : pos === 'center' ? '↔️ Centro' : '⬇️ Abajo'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Tamaño: {textSize}px</label>
                  <input
                    type="range" min={12} max={80} value={textSize}
                    onChange={(e) => setTextSize(parseInt(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Fuente</label>
                  <select
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white"
                  >
                    {FONTS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#000000'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        className={`w-8 h-8 rounded-full border-2 ${textColor === c ? 'accent-border scale-110' : 'border-gray-600'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={addText}
                  disabled={!newText.trim()}
                  className="w-full py-3 accent-bg text-white rounded-xl text-sm font-medium hover:accent-bg disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                >
                  ➕ Agregar texto
                </button>

                {textOverlays.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-gray-400 text-sm">Textos agregados:</p>
                    {textOverlays.map((t, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg">
                        <span className="text-white text-sm truncate">{t.text}</span>
                        <button onClick={() => removeText(i)} className="text-red-400 text-sm hover:text-red-300 ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeSection === 'transform' && (
              <>
                <h3 className="text-white font-medium">🔄 Transformar</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Rotar</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          onClick={() => setRotation(deg)}
                          className={`py-3 rounded-xl text-sm font-medium ${
                            rotation === deg ? 'accent-bg text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Voltear</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFlipH(!flipH)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium ${
                          flipH ? 'accent-bg text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        ↔️ Horizontal
                      </button>
                      <button
                        onClick={() => setFlipV(!flipV)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium ${
                          flipV ? 'accent-bg text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        ↕️ Vertical
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
