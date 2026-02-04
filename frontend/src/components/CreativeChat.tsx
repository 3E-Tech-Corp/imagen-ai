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

  useEffect(() => {
    const w: ChatMsg = {
      id: 'welcome', role: 'assistant', ts: new Date(),
      text: mode === 'image'
        ? '¡Hola! ✿ Bienvenida a tu estudio creativo.\n\nCreo **cualquier cosa** que me pidas — personas, animales, objetos, paisajes — en el estilo que quieras.\n\n**Estilos disponibles:**\n✧ Realista (fotos que parecen reales)\n✧ Anime / Manga\n✧ Animación / Cartoon\n✧ 3D / Pixar / Disney\n✧ Pintura / Acuarela / Dibujo\n\nEscríbeme como quieras — simple o detallado. Yo te entiendo ♡'
        : '¡Hola! ♡ Bienvenida al estudio de video.\n\nCreo videos **con sonido** en cualquier estilo e idioma.\n\n**Lo que puedo hacer:**\n✧ Videos realistas, anime, animación o 3D\n✧ Con sonido, música y voces\n✧ En español, inglés, francés y más\n✧ Animar cualquier imagen que generes\n\nEscríbeme como quieras — yo entiendo y creo lo que pides ✿',
      suggestions: mode === 'image'
        ? ['✿ Una mujer bonita en la playa', '♡ Un gatito tierno', '✧ Un dragón de anime', '◇ Ciudad futurista 3D']
        : ['✿ Video de olas con sonido', '♡ Animar mi última imagen', '✧ Mujer bailando en la ciudad', '◇ León caminando en la sabana'],
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
            ? { ...m, mediaUrl: r.url, mediaType: 'video' as const, text: m.text.replace('\n\n⏳ Tu video se está generando con sonido. Te avisaré cuando esté listo...', '\n\n✿ ¡Tu video está listo!') }
            : m));
        } else if (r.status === 'failed') {
          clearInterval(iv); polls.current.delete(msgId);
          setMessages(p => p.map(m => m.id === msgId
            ? { ...m, mediaType: undefined, text: m.text.replace('\n\n⏳ Tu video se está generando con sonido. Te avisaré cuando esté listo...', `\n\n✧ ${r.error || 'Error generando video. Intenta de nuevo.'}`) }
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
      }, 180_000);

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
        text: `✧ ${err instanceof Error ? err.message : 'Error de conexión. Intenta de nuevo.'}`,
        suggestions: ['✿ Intentar de nuevo'],
      }]);
    } finally { setBusy(false); }
  }, [input, busy, mode, attachments, convId, lastMedia, history, pollVideo]);

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

  const isImg = mode === 'image';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-2 sm:px-4"
        onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)} onDrop={onDrop}>

        {isDrag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(248,232,238,0.6)', backdropFilter: 'blur(8px)' }}>
            <div className="card-soft px-10 py-8 text-center">
              <p className="text-3xl mb-2">✿</p>
              <p className="text-[#6b5e66] font-medium">Suelta tu imagen aquí</p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className="max-w-[90%] sm:max-w-[78%]">
              {/* Role label */}
              <p className={`text-[10px] tracking-[0.1em] uppercase mb-1.5 font-medium ${
                msg.role === 'user' ? 'text-right text-[#a8969e]' : `text-${isImg ? 'rose' : 'purple'}-400`}`}>
                {msg.role === 'user' ? '✧ Tú' : `✿ ${isImg ? 'Estudio de Imágenes' : 'Estudio de Video'}`}
              </p>

              <div className={`rounded-2xl px-4 py-3.5 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-rose-100 to-pink-100 text-[#3d3037] border border-rose-200/50'
                  : 'bg-white text-[#3d3037] border border-[rgba(180,160,170,0.15)] shadow-sm'}`}>

                {/* User attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {msg.attachments.map((a, i) => (
                      <img key={i} src={a} alt="" className="h-20 rounded-xl object-cover border border-rose-200/30 shadow-sm" />
                    ))}
                  </div>
                )}

                {/* Text with markdown bold */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#3d3037]">$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />

                {/* Image result */}
                {msg.mediaType === 'image' && msg.mediaUrl && (
                  <div className="mt-3">
                    <div className="relative group rounded-2xl overflow-hidden border border-rose-100 shadow-sm">
                      <img src={msg.mediaUrl} alt=""
                        className="w-full max-h-[500px] object-contain cursor-pointer transition-all duration-300 hover:brightness-105"
                        onClick={() => window.open(msg.mediaUrl, '_blank')} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => download(msg.mediaUrl!, 'image')}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-white border border-rose-200/50 text-[#6b5e66] rounded-xl hover:bg-rose-50 hover:border-rose-300/50 transition-all shadow-sm">
                        ↓ Descargar
                      </button>
                      <button onClick={() => { setInput('Modifica la imagen: '); inputRef.current?.focus(); }}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-white border border-rose-200/50 text-[#6b5e66] rounded-xl hover:bg-rose-50 hover:border-rose-300/50 transition-all shadow-sm">
                        ✎ Editar
                      </button>
                      <button onClick={() => send('Crea un video animado con sonido a partir de esta imagen')}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-gradient-to-r from-rose-50 to-purple-50 border border-purple-200/50 text-purple-500 rounded-xl hover:from-rose-100 hover:to-purple-100 transition-all shadow-sm">
                        ▶ Crear Video
                      </button>
                    </div>
                  </div>
                )}

                {/* Video result */}
                {msg.mediaType === 'video' && msg.mediaUrl && (
                  <div className="mt-3">
                    <div className="rounded-2xl overflow-hidden border border-purple-100 shadow-sm">
                      <video src={msg.mediaUrl} controls className="w-full max-h-[400px]" autoPlay loop />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => download(msg.mediaUrl!, 'video')}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-white border border-purple-200/50 text-[#6b5e66] rounded-xl hover:bg-purple-50 transition-all shadow-sm">
                        ↓ Descargar Video
                      </button>
                    </div>
                  </div>
                )}

                {/* Video generating */}
                {msg.mediaType === 'video_pending' && (
                  <div className="mt-3 bg-gradient-to-r from-rose-50 to-purple-50 border border-purple-200/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 border-2 border-rose-200 rounded-full" />
                        <div className="absolute inset-0 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                      <div>
                        <p className="text-rose-500 text-sm font-medium">Creando tu video con audio...</p>
                        <p className="text-[#a8969e] text-xs mt-0.5">Esto toma 1-3 minutos ✿</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1 bg-rose-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-300 to-purple-300 rounded-full animate-progress" />
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestion chips */}
              {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {msg.suggestions.map((s, i) => (
                    <button key={i} onClick={() => send(s)} disabled={busy}
                      className="text-xs px-3.5 py-2 bg-white text-[#6b5e66] rounded-xl border border-[rgba(180,160,170,0.2)] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all duration-200 disabled:opacity-30 shadow-sm">
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
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-[rgba(180,160,170,0.15)] rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-pink-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[#a8969e] text-sm">
                  {isImg ? 'Creando tu imagen...' : 'Procesando tu video...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 py-2.5 border-t" style={{ borderColor: 'var(--border-soft)', background: 'rgba(255,255,255,0.7)' }}>
          {attachments.map((a, i) => (
            <div key={i} className="relative group">
              <img src={a} alt="" className="h-16 rounded-xl object-cover border border-rose-200/30 shadow-sm" />
              <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-400 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Elegant input bar */}
      <div className="glass-soft border-t p-3 sm:p-4" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          {/* Attach button */}
          <button onClick={() => fileRef.current?.click()} title="Adjuntar imagen"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[rgba(180,160,170,0.2)] text-[#a8969e] hover:text-rose-400 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm">
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
              placeholder={isImg ? 'Describe lo que quieres ver...' : 'Describe el video que quieres...'}
              className="w-full bg-white border border-[rgba(180,160,170,0.2)] rounded-xl px-4 py-3 pr-12 text-[#3d3037] placeholder-[#b8a9b0] focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 resize-none text-sm transition-all shadow-sm"
              rows={1} disabled={busy}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 120)}px`; }}
            />
            {/* Voice button */}
            <button onClick={toggleVoice} title="Hablar" disabled={busy}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                listening
                  ? 'bg-rose-400 text-white animate-pulse'
                  : 'text-[#b8a9b0] hover:text-rose-400 hover:bg-rose-50'
              }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>

          {/* Send button */}
          <button onClick={() => send()} disabled={!input.trim() || busy}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-300 to-pink-400 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-rose-400 hover:to-pink-500 transition-all shadow-sm active:scale-95">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] mt-2 tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
          ✿ escribe · habla · sube fotos — tu asistente creativo ✿
        </p>
      </div>
    </div>
  );
}
