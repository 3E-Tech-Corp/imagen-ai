import { useState, useRef, useCallback, useEffect, DragEvent } from 'react';
import api from '../services/api';
import { Translations } from '../i18n/translations';

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
  t: Translations;
}

export default function CreativeChat({ mode, t }: Props) {
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
      text: mode === 'image' ? t.bienvenidaImg : t.bienvenidaVid,
      suggestions: mode === 'image' ? t.sugerenciasImg : t.sugerenciasVid,
    };
    setMessages([w]);
  }, [mode, t]);

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
            ? { ...m, mediaUrl: r.url, mediaType: 'video' as const, text: m.text.replace(/\n\n⏳.*$/, `\n\n${t.videoListo}`) }
            : m));
        } else if (r.status === 'failed') {
          clearInterval(iv); polls.current.delete(msgId);
          setMessages(p => p.map(m => m.id === msgId
            ? { ...m, mediaType: undefined, text: m.text.replace(/\n\n⏳.*$/, `\n\n❌ ${r.error || 'Error. Intenta de nuevo.'}`) }
            : m));
        }
      } catch { /* keep polling */ }
    }, 2000);
    polls.current.set(msgId, iv);
    setTimeout(() => { if (polls.current.has(msgId)) { clearInterval(iv); polls.current.delete(msgId); } }, 600_000);
  }, [t]);

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
        text: `⚠️ ${err instanceof Error ? err.message : 'Error de conexión. Intenta de nuevo.'}`,
        suggestions: [t.intentarDeNuevo],
      }]);
    } finally { setBusy(false); }
  }, [input, busy, mode, attachments, convId, lastMedia, history, pollVideo, t]);

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

  // Dynamic accent color style for inline use
  const accentColor = `hsl(var(--accent-h), var(--accent-s), var(--accent-l))`;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1 sm:px-2"
        onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)} onDrop={onDrop}>

        {isDrag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ background: `hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.1)`, border: `2px dashed ${accentColor}` }}>
            <p className="accent-text text-xl font-medium">{t.sueltaTuImagen}</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[90%] sm:max-w-[80%]">
              <p className={`text-xs text-gray-500 mb-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.role === 'user' ? t.tu : t.iaCreativa}
              </p>

              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'accent-bg text-white rounded-br-sm accent-shadow'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700/50'}`}>

                {msg.attachments?.map((a, i) => (
                  <img key={i} src={a} alt="" className="h-20 rounded-lg object-cover mb-2 inline-block mr-2" />
                ))}

                <div className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />

                {msg.mediaType === 'image' && msg.mediaUrl && (
                  <div className="mt-3">
                    <img src={msg.mediaUrl} alt="" className="rounded-xl max-h-96 w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(msg.mediaUrl, '_blank')} />
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button onClick={() => download(msg.mediaUrl!, 'image')}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors accent-bg-soft accent-text-light accent-bg-soft-hover">
                        {t.descargar}
                      </button>
                      <button onClick={() => { setInput('Modifica la imagen: '); inputRef.current?.focus(); }}
                        className="text-xs px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                        {t.modificar}
                      </button>
                      <button onClick={() => send('Crea un video animado con sonido a partir de esta imagen')}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors accent-gradient-soft accent-text-light accent-bg-soft-hover">
                        {t.hacerVideo}
                      </button>
                    </div>
                  </div>
                )}

                {msg.mediaType === 'video' && msg.mediaUrl && (
                  <div className="mt-3">
                    <video src={msg.mediaUrl} controls className="rounded-xl max-h-96 w-full" autoPlay muted loop />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => download(msg.mediaUrl!, 'video')}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors accent-bg-soft accent-text-light accent-bg-soft-hover">
                        {t.descargar}
                      </button>
                    </div>
                  </div>
                )}

                {msg.mediaType === 'video_pending' && (
                  <div className="mt-3 flex items-center gap-3 bg-gray-700/30 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-full animate-spin"
                      style={{ border: `2px solid ${accentColor}`, borderTopColor: 'transparent' }} />
                    <div className="flex-1">
                      <p className="accent-text text-sm font-medium">{t.generandoVideo}</p>
                      <p className="text-gray-500 text-xs">{t.listoEn2Min}</p>
                      <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full animate-progress accent-gradient" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'assistant' && msg.suggestions && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.suggestions.map((s, i) => (
                    <button key={i} onClick={() => send(s)} disabled={busy}
                      className="text-xs px-3 py-1.5 bg-gray-800/80 text-gray-300 rounded-full border border-gray-700 accent-border-hover accent-text-light transition-all disabled:opacity-50"
                      style={{ ['--tw-border-opacity' as string]: 1 }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-bounce accent-bg" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce accent-bg" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce accent-bg" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-gray-400 text-sm">{mode === 'image' ? t.creando : t.procesando}</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-t border-gray-800">
          {attachments.map((a, i) => (
            <div key={i} className="relative group">
              <img src={a} alt="" className="h-14 rounded-lg object-cover" />
              <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm p-3">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <button onClick={() => fileRef.current?.click()} title={t.adjuntarImagen}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            📎
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) addFile(e.target.files[0]); e.target.value = ''; }} />

          <div className="flex-1">
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={mode === 'image' ? t.describeLaImagen : t.describeElVideo}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-transparent resize-none text-sm accent-ring-focus"
              rows={1} disabled={busy}
              onInput={e => { const ta = e.target as HTMLTextAreaElement; ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`; }}
            />
          </div>

          <button onClick={toggleVoice} title="Voice"
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
            🎤
          </button>

          <button onClick={() => send()} disabled={!input.trim() || busy}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl accent-gradient text-white disabled:opacity-30 disabled:cursor-not-allowed accent-bg-hover transition-all accent-shadow">
            ➤
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-1.5">
          {t.escribHabla}
        </p>
      </div>
    </div>
  );
}
