import { useState, useRef, useEffect, useCallback, DragEvent } from 'react';
import api from '../services/api';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
  suggestions?: string[];
  ts: Date;
}

interface ApiResponse {
  message: string;
  suggestions?: string[];
}

// Compress image before sending
function compressImg(dataUrl: string, maxDim = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const r = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Error'));
    img.src = dataUrl;
  });
}

export default function MirrorChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isDrag, setIsDrag] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recog = useRef<any>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: '¡Hola hermosa! 🪞✨ Soy tu espejo — pero uno que te ve con amor.\n\nPuedes:\n📸 **Subir tu selfie** y te digo cómo te veo, qué te favorece hoy\n💬 **Contarme cómo te sientes** y te doy consejos personalizados\n👗 **Mostrarme tu ropa** y te armo el mejor outfit\n💇 **Pedirme consejos** de peinado, maquillaje o colores\n\n¿Por dónde quieres empezar?',
        suggestions: ['📸 Sube tu selfie del día', '¿Cómo puedo verme mejor hoy?', 'Me siento sin energía', 'Necesito ayuda con mi outfit'],
        ts: new Date()
      }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImg(reader.result as string, 800, 0.8);
        setImage(compressed);
      } catch {
        setImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); setIsDrag(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const removeImage = () => setImage(null);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg && !image) return;

    const userMsg: Msg = {
      id: Date.now().toString(),
      role: 'user',
      text: msg || (image ? '📸 [Foto]' : ''),
      imageUrl: image || undefined,
      ts: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const sentImage = image;
    setImage(null);
    setBusy(true);

    try {
      // Build history
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          content: m.text,
          hasImage: !!m.imageUrl
        }));

      const res = await api.post<ApiResponse>('/mirror/chat', {
        message: msg || '',
        imageUrl: sentImage || undefined,
        history
      }, 120_000);

      const assistantMsg: Msg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.message,
        suggestions: res.suggestions,
        ts: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '😔 Hubo un error al responder. Intenta de nuevo.',
        ts: new Date()
      }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  // Voice input
  const toggleVoice = () => {
    if (listening) { recog.current?.stop(); setListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'es-ES'; r.continuous = false; r.interimResults = false;
    r.onresult = (e: any) => { setInput(prev => prev + ' ' + e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recog.current = r;
    r.start();
    setListening(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" style={{ background: 'var(--bg-main)' }}>
      {/* Header */}
      <div className="text-center py-3 border-b glass-soft" style={{ borderColor: 'var(--border-soft)' }}>
        <h2 className="text-xl font-elegant font-semibold italic text-rose-400">
          ❋ Mi Espejo Personal
        </h2>
        <p className="text-xs mt-0.5 tracking-wide" style={{ color: 'var(--text-muted)' }}>Tu guía de imagen, estilo y bienestar emocional</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4"
        onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)}
        onDrop={handleDrop}>

        {isDrag && (
          <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(248,232,238,0.6)', backdropFilter: 'blur(8px)' }}>
            <div className="card-soft px-10 py-8 text-center">
              <p className="text-3xl mb-2">✿</p>
              <p className="text-[#6b5e66] font-medium">Suelta tu foto aquí</p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-rose-100 to-pink-100 border border-rose-200/50 text-[#3d3037]'
                : 'bg-white border border-[rgba(180,160,170,0.15)] text-[#3d3037] shadow-sm'
            }`}>
              {/* User image */}
              {msg.imageUrl && (
                <div className="mb-2 rounded-xl overflow-hidden max-w-[200px]">
                  <img src={msg.imageUrl} alt="Tu foto" className="w-full h-auto" />
                </div>
              )}

              {/* Message text */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: msg.text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} />

              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  {msg.suggestions.map((s, i) => (
                    <button key={i} onClick={() => send(s)} disabled={busy}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs rounded-full px-3 py-1.5 transition-colors disabled:opacity-50 border border-rose-200/50">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-rose-300' : 'text-[#b8a9b0]'}`}>
                {msg.ts.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-white border border-[rgba(180,160,170,0.15)] rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-pink-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Image preview */}
      {image && (
        <div className="px-3 sm:px-6 pb-2">
          <div className="flex items-center gap-2 bg-white rounded-xl p-2 border border-rose-200/50 shadow-sm">
            <img src={image} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
            <span className="text-[#a8969e] text-xs flex-1">✿ Foto lista para enviar</span>
            <button onClick={removeImage} className="text-[#b8a9b0] hover:text-rose-400 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="glass-soft border-t px-3 sm:px-6 py-3" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {/* Photo button */}
          <button onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 bg-white border border-[rgba(180,160,170,0.2)] hover:bg-rose-50 hover:border-rose-200 text-[#a8969e] hover:text-rose-400 rounded-xl p-2.5 transition-all shadow-sm"
            title="Subir foto">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {/* Camera button (mobile) */}
          <label className="flex-shrink-0 bg-white border border-[rgba(180,160,170,0.2)] hover:bg-rose-50 text-[#a8969e] rounded-xl p-2.5 transition-all cursor-pointer sm:hidden shadow-sm"
            title="Tomar selfie">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <input type="file" accept="image/*" capture="user" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Cuéntame cómo te sientes o pide un consejo..."
              rows={1}
              className="w-full bg-white border border-[rgba(180,160,170,0.2)] rounded-xl px-4 py-2.5 pr-10 text-[#3d3037] placeholder-[#b8a9b0] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all shadow-sm"
              style={{ minHeight: '42px', maxHeight: '120px' }}
              disabled={busy} />
            {/* Voice button inside input */}
            <button onClick={toggleVoice} disabled={busy}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                listening ? 'bg-rose-400 text-white animate-pulse' : 'text-[#b8a9b0] hover:text-rose-400 hover:bg-rose-50'
              }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>

          {/* Send button */}
          <button onClick={() => send()} disabled={busy || (!input.trim() && !image)}
            className="flex-shrink-0 bg-gradient-to-r from-rose-300 to-pink-400 hover:from-rose-400 hover:to-pink-500 disabled:opacity-30 text-white rounded-xl p-2.5 transition-all shadow-sm active:scale-95">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
