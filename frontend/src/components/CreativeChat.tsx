import { useState, useRef, useCallback, useEffect, DragEvent } from 'react';
import api from '../services/api';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'video_pending';
  jobId?: string;
  suggestions?: string[];
  attachments?: string[];
  ts: Date;
}

interface ChatApiResponse {
  conversationId: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  jobId?: string;
  suggestions?: string[];
}

interface Props {
  mode: 'image' | 'video';
}

export default function CreativeChat({ mode }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isDrag, setIsDrag] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const polls = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recog = useRef<any>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => () => { polls.current.forEach(clearInterval); }, []);

  // Premium welcome message
  useEffect(() => {
    const w: ChatMsg = {
      id: 'welcome', role: 'assistant', ts: new Date(),
      text: mode === 'image'
        ? '👋 ¡Bienvenida al estudio de imágenes!\n\nCreo exactamente lo que me pidas — personas, animales, objetos, paisajes — todo en calidad profesional.\n\n💡 **Tips:**\n• Sé específica: colores, poses, fondos\n• Pide "cuerpo completo" si lo necesitas\n• Sube una foto para editarla\n• Puedo modificar cualquier imagen generada'
        : '👋 ¡Bienvenida al estudio de video!\n\nCreo videos con sonido y en el idioma que elijas.\n\n💡 **Tips:**\n• Describe la escena y el movimiento\n• Sube una imagen para animarla\n• Pide "con sonido" o "que hable en español"\n• Videos de 5-10 segundos en alta calidad',
      suggestions: mode === 'image'
        ? ['👩 Retrato profesional de una mujer', '🐱 Un gato persa blanco realista', '🏙️ Ciudad futurista de noche', '💍 Anillo de diamantes']
        : ['🌊 Video de olas en la playa con sonido', '🎬 Animar una foto con movimiento', '🌃 Video cinemático de ciudad de noche', '🦁 León caminando en la sabana'],
    };
    setMessages([w]);
  }, [mode]);

  const lastMedia = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.mediaUrl && (m.mediaType === 'image' || m.mediaType === 'video')) return m.mediaUrl;
    }
    return null;
  }, [messages]);

  const history = useCallback(() =>
    messages.filter(m => m.id !== 'welcome').slice(-12).map(m => ({
      role: m.role, content: m.text, mediaUrl: m.mediaUrl, mediaType: m.mediaType,
    })), [messages]);

  const pollVideo = useCallback((msgId: string, jobId: string) => {
    const iv = setInterval(async () => {
      try {
        const r = await api.get<{ status: string; url: string; error?: string }>(`/generation/job/${jobId}`);
        if (r.status === 'completed' && r.url) {
          clearInterval(iv); polls.current.delete(msgId);
          setMessages(p => p.map(m => m.id === msgId
            ? { ...m, mediaUrl: r.url, mediaType: 'video' as const, text: m.text.replace('\n\n⏳ Tu video se está generando. Te avisaré cuando esté listo...', '\n\n✅ ¡Tu video está listo!') }
            : m));
        } else if (r.status === 'failed') {
          clearInterval(iv); polls.current.delete(msgId);
          setMessages(p => p.map(m => m.id === msgId
            ? { ...m, mediaType: undefined, text: m.text.replace('\n\n⏳ Tu video se está generando. Te avisaré cuando esté listo...', `\n\n❌ ${r.error || 'Error generando video. Intenta de nuevo.'}`) }
            : m));
        }
      } catch { /* keep polling */ }
    }, 5000);
    polls.current.set(msgId, iv);
    setTimeout(() => { if (polls.current.has(msgId)) { clearInterval(iv); polls.current.delete(msgId); } }, 600_000);
  }, []);

  const send = useCallback(async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || busy) return;

    let hint = '';
    if (mode === 'video' && !/video|anima|graba|clip/i.test(text)) hint = ' (el usuario quiere un VIDEO)';

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(), role: 'user', text,
      attachments: attachments.length > 0 ? [...attachments] : undefined, ts: new Date(),
    };

    setMessages(p => [...p, userMsg]);
    setInput(''); setAttachments([]); setBusy(true);

    try {
      const lm = lastMedia();
      const res = await api.post<ChatApiResponse>('/chat/message', {
        message: text + hint,
        conversationId: convId,
        attachments: userMsg.attachments,
        previousResults: lm ? [lm] : undefined,
        history: history(),
      }, 180_000); // 3 minutes timeout

      if (res.conversationId) setConvId(res.conversationId);

      const aMsg: ChatMsg = {
        id: crypto.randomUUID(), role: 'assistant', text: res.message,
        mediaUrl: res.mediaUrl || undefined,
        mediaType: (res.mediaType as ChatMsg['mediaType']) || undefined,
        jobId: res.jobId || undefined,
        suggestions: res.suggestions, ts: new Date(),
      };
      setMessages(p => [...p, aMsg]);

      if (res.mediaType === 'video_pending' && res.jobId) pollVideo(aMsg.id, res.jobId);
    } catch (err) {
      setMessages(p => [...p, {
        id: crypto.randomUUID(), role: 'assistant', ts: new Date(),
        text: `⚠️ ${err instanceof Error ? err.message : 'Error de conexión. Verifica tu internet e intenta de nuevo.'}`,
        suggestions: ['🔄 Intentar de nuevo'],
      }]);
    } finally { setBusy(false); }
  }, [input, busy, mode, attachments, convId, lastMedia, history, pollVideo]);

  // Voice recognition
  const toggleVoice = useCallback(() => {
    if (listening) { recog.current?.stop(); setListening(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.lang = 'es-ES'; r.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => { setInput(p => (p ? `${p} ${e.results[0][0].transcript}` : e.results[0][0].transcript)); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recog.current = r; r.start(); setListening(true);
  }, [listening]);

  const addFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setAttachments(p => [...p.slice(-4), reader.result as string]);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: DragEvent) => { e.preventDefault(); setIsDrag(false); if (e.dataTransfer.files[0]) addFile(e.dataTransfer.files[0]); }, [addFile]);

  const download = async (url: string, type: string) => {
    try {
      const r = await fetch(url); const b = await r.blob(); const u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = u; a.download = `imagen-ai-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
    } catch { window.open(url, '_blank'); }
  };

  const modeColor = mode === 'image' ? 'violet' : 'fuchsia';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-2 sm:px-4"
        onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)} onDrop={onDrop}>

        {/* Drag overlay */}
        {isDrag && (
          <div className="fixed inset-0 bg-violet-500/10 backdrop-blur-sm border-2 border-dashed border-violet-400 z-50 flex items-center justify-center">
            <div className="bg-black/60 rounded-2xl px-8 py-6 text-center">
              <p className="text-4xl mb-2">📎</p>
              <p className="text-violet-300 text-lg font-medium">Suelta tu imagen aquí</p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] sm:max-w-[80%]`}>
              {/* Role label */}
              <p className={`text-[10px] font-medium tracking-wider uppercase mb-1.5 ${
                msg.role === 'user' ? 'text-right text-gray-500' : `text-${modeColor}-400/70`}`}>
                {msg.role === 'user' ? '✦ Tú' : `✦ ${mode === 'image' ? 'Estudio de Imágenes' : 'Estudio de Video'}`}
              </p>

              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? `bg-gradient-to-br from-${modeColor}-600/90 to-${modeColor}-700/90 text-white border border-${modeColor}-500/20`
                  : 'bg-gray-800/60 text-gray-100 border border-white/[0.06] backdrop-blur-sm'}`}>

                {/* User attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {msg.attachments.map((a, i) => (
                      <img key={i} src={a} alt="" className="h-20 rounded-xl object-cover border border-white/10 shadow-lg" />
                    ))}
                  </div>
                )}

                {/* Text with markdown-like bold */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />

                {/* Image result */}
                {msg.mediaType === 'image' && msg.mediaUrl && (
                  <div className="mt-3">
                    <div className="relative group rounded-xl overflow-hidden">
                      <img src={msg.mediaUrl} alt="" 
                        className="w-full max-h-[500px] object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                        onClick={() => window.open(msg.mediaUrl, '_blank')} />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <span className="text-white/80 text-xs font-medium">Click para ver en tamaño completo</span>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => download(msg.mediaUrl!, 'image')}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-white/[0.06] border border-white/[0.08] text-gray-200 rounded-xl hover:bg-white/[0.12] hover:border-white/[0.15] transition-all duration-200">
                        <span>📥</span> Descargar HD
                      </button>
                      <button onClick={() => { setInput('Modifica la imagen: '); inputRef.current?.focus(); }}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-white/[0.06] border border-white/[0.08] text-gray-200 rounded-xl hover:bg-white/[0.12] hover:border-white/[0.15] transition-all duration-200">
                        <span>✏️</span> Editar
                      </button>
                      <button onClick={() => send('Crea un video animado con sonido a partir de esta imagen')}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 border border-fuchsia-500/20 text-fuchsia-200 rounded-xl hover:from-fuchsia-600/50 hover:to-purple-600/50 transition-all duration-200">
                        <span>🎬</span> Crear Video
                      </button>
                    </div>
                  </div>
                )}

                {/* Video result */}
                {msg.mediaType === 'video' && msg.mediaUrl && (
                  <div className="mt-3">
                    <div className="rounded-xl overflow-hidden border border-white/[0.06] shadow-2xl">
                      <video src={msg.mediaUrl} controls className="w-full max-h-[400px]" autoPlay loop />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => download(msg.mediaUrl!, 'video')}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-white/[0.06] border border-white/[0.08] text-gray-200 rounded-xl hover:bg-white/[0.12] hover:border-white/[0.15] transition-all duration-200">
                        <span>📥</span> Descargar Video
                      </button>
                    </div>
                  </div>
                )}

                {/* Video generating */}
                {msg.mediaType === 'video_pending' && (
                  <div className="mt-3 bg-gradient-to-r from-fuchsia-500/[0.08] to-purple-500/[0.08] border border-fuchsia-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 border-2 border-fuchsia-500/30 rounded-full" />
                        <div className="absolute inset-0 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                      <div>
                        <p className="text-fuchsia-300 text-sm font-medium">Generando tu video con audio...</p>
                        <p className="text-gray-500 text-xs mt-0.5">Esto toma 1-3 minutos. No cierres la página.</p>
                      </div>
                    </div>
                    {/* Animated progress bar */}
                    <div className="mt-3 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 rounded-full animate-progress" />
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestion chips */}
              {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {msg.suggestions.map((s, i) => (
                    <button key={i} onClick={() => send(s)} disabled={busy}
                      className="text-xs px-3.5 py-2 bg-white/[0.04] text-gray-300 rounded-xl border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all duration-200 disabled:opacity-30">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-gray-800/60 border border-white/[0.06] rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className={`w-2 h-2 bg-${modeColor}-400 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
                  <div className={`w-2 h-2 bg-${modeColor}-400 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
                  <div className={`w-2 h-2 bg-${modeColor}-400 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-gray-400 text-sm">
                  {mode === 'image' ? 'Creando tu imagen...' : 'Procesando tu video...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 py-2.5 border-t border-white/[0.06] bg-black/30">
          {attachments.map((a, i) => (
            <div key={i} className="relative group">
              <img src={a} alt="" className="h-16 rounded-xl object-cover border border-white/10" />
              <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Premium input bar */}
      <div className="border-t border-white/[0.06] bg-black/50 backdrop-blur-xl p-3 sm:p-4">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          {/* Attach button */}
          <button onClick={() => fileRef.current?.click()} title="Adjuntar imagen de referencia"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.12] hover:border-white/[0.15] transition-all duration-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) addFile(e.target.files[0]); e.target.value = ''; }} />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={mode === 'image'
                ? 'Describe exactamente lo que quieres ver...'
                : 'Describe el video que quieres crear...'}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none text-sm transition-all duration-200"
              rows={1} disabled={busy}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 120)}px`; }}
            />
            {/* Voice button inside */}
            <button onClick={toggleVoice} title="Hablar" disabled={busy}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                listening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.08]'
              }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>

          {/* Send button */}
          <button onClick={() => send()} disabled={!input.trim() || busy}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-${modeColor}-600 to-${modeColor === 'violet' ? 'indigo' : 'purple'}-600 text-white disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-${modeColor}-500/25 transition-all duration-200 active:scale-95`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-center text-gray-600 text-[10px] mt-2 font-medium tracking-wide">
          ✦ ESCRIBE · HABLA · SUBE FOTOS — Tu asistente creativo con IA ✦
        </p>
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 5%; margin-left: 0; }
          50% { width: 40%; margin-left: 30%; }
          100% { width: 5%; margin-left: 95%; }
        }
        .animate-progress { animation: progress 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
