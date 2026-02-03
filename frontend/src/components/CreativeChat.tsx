import { useState, useRef, useCallback, useEffect } from 'react';
import VoiceInput from './VoiceInput';
import { ChatMessage, ChatResponse } from '../types';
import api from '../services/api';

export default function CreativeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Get all previous media URLs for context
  const getPreviousResults = useCallback((): string[] => {
    return messages
      .filter(m => m.role === 'assistant' && m.mediaUrl && m.mediaType !== 'video_pending')
      .map(m => m.mediaUrl!)
      .slice(-3);
  }, [messages]);

  // Get conversation history for AI context
  const getHistory = useCallback(() => {
    return messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType ?? undefined,
    }));
  }, [messages]);

  // Poll for video completion
  const pollVideoJob = useCallback((jobId: string, messageId: string) => {
    const interval = setInterval(async () => {
      try {
        const result = await api.get<{ jobId: string; status: string; url?: string; error?: string }>(
          `/api/chat/job/${jobId}`
        );

        if (result.status === 'completed' && result.url) {
          clearInterval(interval);
          setMessages(prev =>
            prev.map(m =>
              m.id === messageId
                ? { ...m, mediaUrl: result.url, mediaType: 'video' as const, jobId: undefined }
                : m
            )
          );
        } else if (result.status === 'failed') {
          clearInterval(interval);
          setMessages(prev =>
            prev.map(m =>
              m.id === messageId
                ? {
                    ...m,
                    content: m.content + `\n\n❌ ${result.error || 'Error al generar el video.'}`,
                    mediaType: null,
                    jobId: undefined,
                  }
                : m
            )
          );
        }
      } catch {
        // Network error, keep polling
      }
    }, 5000);

    // Max 10 min poll
    setTimeout(() => clearInterval(interval), 600_000);
  }, []);

  // Send message
  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText && attachments.length === 0) return;
    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Add loading placeholder
    const loadingId = crypto.randomUUID();
    setMessages(prev => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isLoading: true,
      },
    ]);

    try {
      const response = await api.post<ChatResponse>('/api/chat/message', {
        message: messageText,
        conversationId,
        attachments: userMessage.attachments,
        previousResults: getPreviousResults(),
        history: getHistory(),
      }, 120_000);

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMessage: ChatMessage = {
        id: loadingId,
        role: 'assistant',
        content: response.message,
        mediaUrl: response.mediaUrl ?? undefined,
        mediaType: response.mediaType,
        jobId: response.jobId ?? undefined,
        suggestions: response.suggestions ?? undefined,
        timestamp: new Date().toISOString(),
        isLoading: false,
      };

      setMessages(prev => prev.map(m => (m.id === loadingId ? assistantMessage : m)));

      // If video is pending, start polling
      if (response.mediaType === 'video_pending' && response.jobId) {
        pollVideoJob(response.jobId, loadingId);
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? {
                ...m,
                content: `❌ ${err instanceof Error ? err.message : 'Error al procesar tu mensaje. Intenta de nuevo.'}`,
                isLoading: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, attachments, isLoading, conversationId, getPreviousResults, getHistory, pollVideoJob]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAttachments(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  // Handle drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle voice transcript
  const handleVoiceTranscript = useCallback((text: string) => {
    setInput(prev => prev + text);
  }, []);

  // Handle key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // Quick action from suggestion
  const handleSuggestion = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion);
    },
    [sendMessage]
  );

  // Action buttons on assistant messages
  const handleRecreate = useCallback(
    (_message: ChatMessage) => {
      const lastUserMsg = messages
        .filter(m => m.role === 'user')
        .pop();
      if (lastUserMsg) {
        sendMessage(lastUserMsg.content);
      }
    },
    [messages, sendMessage]
  );

  const handleMakeVideo = useCallback(
    (_mediaUrl: string) => {
      sendMessage(`Crea un video a partir de esta imagen`);
    },
    [sendMessage]
  );

  const handleDownload = useCallback(async (url: string, type: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `imagen-ai-${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  // New conversation
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setAttachments([]);
    setInput('');
  }, []);

  return (
    <div
      className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white text-sm">✨</span>
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Asistente Creativo</h2>
            <p className="text-gray-500 text-xs">Crea imágenes y videos con conversación</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all"
          >
            ✨ Nueva conversación
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <WelcomeScreen onSuggestion={handleSuggestion} />
        )}

        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onSuggestion={handleSuggestion}
            onRecreate={handleRecreate}
            onMakeVideo={handleMakeVideo}
            onDownload={handleDownload}
            onImageClick={setExpandedImage}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800/50 flex gap-2 overflow-x-auto">
          {attachments.map((att, i) => (
            <div key={i} className="relative group flex-shrink-0">
              <img
                src={att}
                alt={`Adjunto ${i + 1}`}
                className="h-16 w-16 object-cover rounded-lg border border-gray-700"
              />
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-gray-800/50">
        <div className="flex items-end gap-2 bg-gray-800/50 rounded-2xl border border-gray-700/50 p-2 focus-within:border-violet-500/50 transition-colors">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-violet-400 hover:bg-gray-700/50 transition-all"
            title="Adjuntar imagen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 01-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835a2.25 2.25 0 01-3.182-3.182l9.849-9.849a.75.75 0 011.06 1.06l-9.848 9.849a.75.75 0 001.061 1.06l10.94-10.94a2.25 2.25 0 000-3.124z" clipRule="evenodd" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe lo que quieres crear..."
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm py-2 px-1 max-h-[120px]"
          />

          {/* Voice button */}
          <VoiceInput onTranscript={handleVoiceTranscript} language="es-ES" />

          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-600/25 transition-all active:scale-95"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-gray-600 text-[10px] text-center mt-2">
          Escribe, habla o adjunta una imagen • La IA recuerda el contexto de la conversación
        </p>
      </div>

      {/* Expanded image modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Imagen ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-gray-800/80 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
            onClick={() => setExpandedImage(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// Welcome screen with suggestions
function WelcomeScreen({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  const suggestions = [
    { emoji: '🌅', text: 'Crea una imagen de un atardecer en la playa' },
    { emoji: '🎨', text: 'Hazme un retrato estilo anime de una guerrera' },
    { emoji: '🏙️', text: 'Genera una ciudad futurista de noche con luces neón' },
    { emoji: '🎬', text: 'Crea un video de un bosque mágico con luciérnagas' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/25">
          <span className="text-3xl">✨</span>
        </div>
        <h2 className="text-2xl font-bold text-white">¿Qué quieres crear hoy?</h2>
        <p className="text-gray-400 text-sm max-w-md">
          Describe lo que imaginas y yo lo haré realidad. Puedes pedirme imágenes, videos, editar creaciones anteriores, ¡y mucho más!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s.text)}
            className="group flex items-center gap-3 px-4 py-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/40 hover:border-violet-500/30 rounded-xl transition-all text-left"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">{s.emoji}</span>
            <span className="text-gray-300 text-sm group-hover:text-white transition-colors">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  onSuggestion,
  onRecreate,
  onMakeVideo,
  onDownload,
  onImageClick,
}: {
  message: ChatMessage;
  onSuggestion: (s: string) => void;
  onRecreate: (m: ChatMessage) => void;
  onMakeVideo: (url: string) => void;
  onDownload: (url: string, type: string) => void;
  onImageClick: (url: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-slide-up`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
            : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
        }`}
      >
        {isUser ? '👤' : '✨'}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* User attachments */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {message.attachments.map((att, i) => (
              <img
                key={i}
                src={att}
                alt={`Adjunto ${i + 1}`}
                className="h-24 w-24 object-cover rounded-xl border border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onImageClick(att)}
              />
            ))}
          </div>
        )}

        {/* Text bubble */}
        {(message.content || message.isLoading) && (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-tr-md'
                : 'bg-gray-800/70 text-gray-200 rounded-tl-md border border-gray-700/30'
            }`}
          >
            {message.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-gray-400 text-xs">Pensando...</span>
              </div>
            ) : (
              <span className="whitespace-pre-wrap">{message.content}</span>
            )}
          </div>
        )}

        {/* Media content */}
        {!isUser && message.mediaUrl && message.mediaType === 'image' && (
          <div className="relative group">
            <img
              src={message.mediaUrl}
              alt="Imagen generada"
              className="max-w-sm w-full rounded-xl border border-gray-700/30 cursor-pointer hover:opacity-95 transition-opacity shadow-lg"
              onClick={() => onImageClick(message.mediaUrl!)}
              loading="lazy"
            />
            {/* Action overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionButton emoji="🔄" label="Recrear" onClick={() => onRecreate(message)} />
              <ActionButton emoji="🎬" label="Video" onClick={() => onMakeVideo(message.mediaUrl!)} />
              <ActionButton emoji="📥" label="Descargar" onClick={() => onDownload(message.mediaUrl!, 'image')} />
            </div>
          </div>
        )}

        {!isUser && message.mediaUrl && message.mediaType === 'video' && (
          <div className="relative group">
            <video
              src={message.mediaUrl}
              controls
              className="max-w-sm w-full rounded-xl border border-gray-700/30 shadow-lg"
              preload="metadata"
            />
            <div className="absolute bottom-12 left-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionButton emoji="🔄" label="Recrear" onClick={() => onRecreate(message)} />
              <ActionButton emoji="📥" label="Descargar" onClick={() => onDownload(message.mediaUrl!, 'video')} />
            </div>
          </div>
        )}

        {!isUser && message.mediaType === 'video_pending' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-xl border border-gray-700/30">
            <div className="w-8 h-8 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
            <div>
              <p className="text-gray-300 text-sm font-medium">Generando video...</p>
              <p className="text-gray-500 text-xs">Esto puede tomar 1-5 minutos</p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && !message.isLoading && (
          <div className="flex gap-2 flex-wrap mt-1">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-700/60 border border-gray-700/30 hover:border-violet-500/30 rounded-full transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-gray-600 text-[10px]">
          {new Date(message.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// Small action button for media overlays
function ActionButton({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center gap-1 px-2.5 py-1.5 bg-black/70 backdrop-blur-sm text-white text-xs rounded-lg hover:bg-black/90 transition-all border border-white/10"
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
