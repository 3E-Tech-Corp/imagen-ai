import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════
interface Group {
  id: string; name: string; description: string; ownerName: string; ownerId: string;
  avatarEmoji: string; inviteCode: string; inviteExpiresAt: string;
  members: { userId: string; displayName: string; role: string; joinedAt: string }[];
  isLive: boolean; liveTitle?: string;
}
interface Gift { id: string; name: string; emoji: string; coins: number; }
interface CoinPkg { id: string; coins: number; price: number; popular: boolean; }
interface Wallet {
  userId: string; coinsBalance: number; earningsBalance: number;
  totalEarned: number; totalWithdrawn: number;
  transactions: { id: string; type: string; coinsAmount: number; moneyAmount?: number; description: string; createdAt: string }[];
}
interface ChatMsg {
  id: string; userId: string; displayName: string; text: string; type: string; createdAt: string;
}
interface GiftEvent {
  id: string; fromUserId: string; fromName: string; giftId: string; giftName: string; giftEmoji: string; coins: number; createdAt: string;
}
interface LiveState {
  id: string; title: string; hostName: string; hostUserId: string;
  viewerCount: number; isActive: boolean; totalGiftsCoins: number;
  messages: ChatMsg[]; totalMessages: number; recentGifts: GiftEvent[]; startedAt: string;
}

type View = 'groups' | 'group-detail' | 'live-room' | 'gifts' | 'wallet' | 'earnings';

// ═══════════════════════════════════════════
// FLOATING GIFT ANIMATION
// ═══════════════════════════════════════════
interface FloatingGift { id: string; emoji: string; name: string; fromName: string; x: number; }

function GiftAnimation({ gift, onDone }: { gift: FloatingGift; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="absolute pointer-events-none animate-float-up" style={{ left: `${gift.x}%`, bottom: '20%' }}>
      <div className="text-center">
        <div className="text-6xl animate-bounce-gentle">{gift.emoji}</div>
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 mt-1">
          <span className="text-white text-xs font-medium">{gift.fromName}</span>
          <span className="text-amber-300 text-xs ml-1">→ {gift.name}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function LiveSection() {
  const [view, setView] = useState<View>('groups');
  const [userId] = useState(() => localStorage.getItem('imagen-ai-user') || 'user_' + Math.random().toString(36).slice(2, 8));
  const [userName, setUserName] = useState(() => localStorage.getItem('imagen-ai-username') || '');
  const [groups, setGroups] = useState<Group[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [packages, setPackages] = useState<CoinPkg[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [chatText, setChatText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showBuyCoins, setShowBuyCoins] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [newGroup, setNewGroup] = useState({ name: '', description: '', emoji: '🎭' });
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [needsName, setNeedsName] = useState(!userName);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { localStorage.setItem('imagen-ai-user', userId); }, [userId]);
  useEffect(() => { if (userName) localStorage.setItem('imagen-ai-username', userName); }, [userName]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  // Load data
  const load = useCallback(async () => {
    try {
      const [g, gi, p, w] = await Promise.all([
        api.get<Group[]>('/live/groups'),
        api.get<Gift[]>('/live/gifts'),
        api.get<CoinPkg[]>('/live/coin-packages'),
        api.get<Wallet>(`/live/wallet/${userId}`),
      ]);
      setGroups(g); setGifts(gi); setPackages(p); setWallet(w);
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Scroll chat to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [liveState?.messages]);

  // ═══════════════════════════════════════════
  // LIVE POLLING — poll live state every 2 seconds
  // ═══════════════════════════════════════════
  const startPolling = useCallback((groupId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    messageCountRef.current = 0;

    const poll = async () => {
      try {
        const state = await api.get<LiveState>(`/live/groups/${groupId}/live-state?after=${messageCountRef.current}`);
        setLiveState(prev => {
          if (!prev) return { ...state, messages: state.messages };
          const allMessages = [...prev.messages, ...state.messages];
          messageCountRef.current = state.totalMessages;
          return { ...state, messages: allMessages };
        });

        // Check for new gift events to animate
        if (state.recentGifts && state.recentGifts.length > 0) {
          const latestGift = state.recentGifts[0];
          setFloatingGifts(prev => {
            if (prev.find(g => g.id === latestGift.id)) return prev;
            return [...prev, {
              id: latestGift.id,
              emoji: latestGift.giftEmoji,
              name: latestGift.giftName,
              fromName: latestGift.fromName,
              x: 10 + Math.random() * 60
            }];
          });
        }

        if (!state.isActive) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Live might have ended
      }
    };

    poll(); // Initial fetch
    pollRef.current = setInterval(poll, 2000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => { return () => stopPolling(); }, [stopPolling]);

  // ═══════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════
  const createGroup = async () => {
    if (!newGroup.name.trim()) return;
    setBusy(true);
    try {
      await api.post('/live/groups', { name: newGroup.name, description: newGroup.description, avatarEmoji: newGroup.emoji, ownerName: userName });
      setShowCreate(false); setNewGroup({ name: '', description: '', emoji: '🎭' });
      await load(); flash('✅ ¡Grupo creado!');
    } catch { flash('❌ Error creando grupo'); }
    setBusy(false);
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    try {
      await api.post('/live/groups/join', { inviteCode: joinCode.toUpperCase(), displayName: userName });
      setShowJoin(false); setJoinCode('');
      await load(); flash('✅ ¡Te uniste al grupo!');
    } catch { flash('❌ Código inválido o expirado'); }
    setBusy(false);
  };

  const openGroupDetail = (group: Group) => {
    setSelectedGroup(group);
    setView('group-detail');
  };

  const startLive = async () => {
    if (!selectedGroup) return;
    setBusy(true);
    try {
      await api.post(`/live/groups/${selectedGroup.id}/start-live`, {
        userId, title: liveTitle || `🔴 ${selectedGroup.name} en vivo!`
      });
      messageCountRef.current = 0;
      setLiveState(null);
      setView('live-room');
      startPolling(selectedGroup.id);
      flash('🔴 ¡Estás en vivo!');
    } catch { flash('❌ Error iniciando live'); }
    setBusy(false);
  };

  const joinLive = async (group: Group) => {
    setBusy(true);
    try {
      await api.post(`/live/groups/${group.id}/join-live`, { userId, displayName: userName });
      setSelectedGroup(group);
      messageCountRef.current = 0;
      setLiveState(null);
      setView('live-room');
      startPolling(group.id);
    } catch { flash('❌ No hay live activo'); }
    setBusy(false);
  };

  const endLive = async () => {
    if (!selectedGroup) return;
    setBusy(true);
    try {
      await api.post(`/live/groups/${selectedGroup.id}/end-live?userId=${userId}`, {});
      stopPolling();
      setView('group-detail');
      await load();
      flash('📴 Live terminado');
    } catch { flash('❌ Error'); }
    setBusy(false);
  };

  const sendChat = async () => {
    if (!chatText.trim() || !selectedGroup) return;
    const text = chatText;
    setChatText('');
    try {
      await api.post(`/live/groups/${selectedGroup.id}/chat`, { userId, displayName: userName, text });
    } catch { /* ignore */ }
  };

  const sendLiveGift = async (giftId: string) => {
    if (!selectedGroup) return;
    setBusy(true);
    try {
      await api.post(`/live/groups/${selectedGroup.id}/send-live-gift`, {
        fromUserId: userId, fromName: userName, giftId
      });
      await load(); // refresh wallet
      setShowGiftPanel(false);
    } catch (e: any) { flash(e?.message || '❌ Error enviando regalo'); }
    setBusy(false);
  };

  const buyCoins = async (pkgId: string) => {
    setBusy(true);
    try {
      const w = await api.post<Wallet>('/live/wallet/buy-coins', { packageId: pkgId, userId });
      setWallet(w); flash('✅ ¡Coins comprados! (modo demo)');
      setShowBuyCoins(false);
    } catch { flash('❌ Error'); }
    setBusy(false);
  };

  const withdraw = async (amount: number, method: string) => {
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>('/live/wallet/withdraw', { userId, amount, method });
      flash(res.message); await load();
    } catch (e: any) { flash(e?.message || '❌ Error'); }
    setBusy(false);
  };

  const copyInvite = (code: string) => {
    const link = `${window.location.origin}?invite=${code}`;
    navigator.clipboard.writeText(link).then(() => flash('📋 ¡Link copiado!')).catch(() => flash(`Código: ${code}`));
  };

  const removeFloatingGift = (id: string) => setFloatingGifts(prev => prev.filter(g => g.id !== id));

  const EMOJIS = ['🎭', '🎤', '🎵', '💃', '🌟', '🔥', '💎', '🦋', '🌈', '👑', '🎪', '🎯'];

  // ═══════════════════════════════════════════
  // NAME PROMPT
  // ═══════════════════════════════════════════
  if (needsName) return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-gray-800/60 rounded-2xl border border-gray-700/50 animate-fade-in">
      <h2 className="text-xl font-bold text-white mb-2">👋 ¡Bienvenida a Live!</h2>
      <p className="text-gray-400 text-sm mb-4">Primero, dime cómo te llamas para crear tu perfil.</p>
      <input value={userName} onChange={e => setUserName(e.target.value)}
        placeholder="Tu nombre..." className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white mb-3 accent-ring-focus" />
      <button onClick={() => { if (userName.trim()) setNeedsName(false); }}
        disabled={!userName.trim()} className="w-full accent-gradient text-white font-semibold rounded-xl py-3 disabled:opacity-40 transition-all accent-shadow">
        Continuar ➤
      </button>
    </div>
  );

  // ═══════════════════════════════════════════
  // 🔴 LIVE ROOM VIEW
  // ═══════════════════════════════════════════
  if (view === 'live-room' && selectedGroup) {
    const isHost = liveState?.hostUserId === userId || selectedGroup.ownerId === userId;
    const duration = liveState?.startedAt
      ? Math.floor((Date.now() - new Date(liveState.startedAt).getTime()) / 1000)
      : 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Flash message */}
        {msg && <div className="text-center py-2 px-4 accent-bg-soft rounded-xl text-sm accent-text animate-fade-in mb-2">{msg}</div>}

        {/* Live video area */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-2">
              <button onClick={() => { stopPolling(); setView('group-detail'); }}
                className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70">
                ←
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-white text-sm font-semibold">{liveState?.hostName || selectedGroup.ownerName}</span>
                </div>
                <p className="text-gray-400 text-[10px]">{liveState?.title || selectedGroup.liveTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-white text-xs font-medium">LIVE</span>
              </div>
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-xs">👁 {liveState?.viewerCount || 1}</span>
              </div>
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-gray-400 text-xs">{mins}:{secs.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Center — host avatar */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-24 h-24 accent-gradient rounded-full flex items-center justify-center text-5xl accent-shadow-lg animate-pulse-slow">
              {selectedGroup.avatarEmoji}
            </div>
            <p className="text-white font-semibold mt-3">{liveState?.hostName || selectedGroup.ownerName}</p>
            <p className="text-gray-400 text-sm mt-1">{liveState?.title}</p>
            {liveState && (
              <div className="flex items-center gap-1 mt-2 bg-amber-500/20 rounded-full px-3 py-1">
                <span className="text-amber-400 text-xs">💰 {liveState.totalGiftsCoins.toLocaleString()} coins recibidos</span>
              </div>
            )}
          </div>

          {/* Floating gift animations */}
          {floatingGifts.map(g => (
            <GiftAnimation key={g.id} gift={g} onDone={() => removeFloatingGift(g.id)} />
          ))}

          {/* Chat overlay — bottom left */}
          <div className="absolute bottom-16 left-0 right-0 z-10 px-3">
            <div className="max-h-48 overflow-y-auto space-y-1.5 no-scrollbar">
              {(liveState?.messages || []).slice(-30).map(m => (
                <div key={m.id} className={`flex items-start gap-2 ${m.type === 'system' ? 'justify-center' : ''}`}>
                  {m.type === 'system' ? (
                    <span className="text-gray-500 text-xs italic bg-black/30 rounded-full px-3 py-0.5">{m.text}</span>
                  ) : m.type === 'gift' ? (
                    <div className="bg-amber-500/20 backdrop-blur-sm rounded-xl px-3 py-1.5 max-w-[85%]">
                      <span className="text-amber-300 text-xs font-semibold">{m.displayName}</span>
                      <span className="text-amber-200 text-xs ml-1">{m.text}</span>
                    </div>
                  ) : (
                    <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 max-w-[85%]">
                      <span className="accent-text text-xs font-semibold">{m.displayName}</span>
                      <span className="text-white text-xs ml-1.5">{m.text}</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Bottom bar — chat input + gift button */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <input value={chatText} onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Escribe un mensaje..." className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-400" />
              </div>
              <button onClick={sendChat} disabled={!chatText.trim()}
                className="w-10 h-10 accent-gradient rounded-full flex items-center justify-center text-white accent-shadow disabled:opacity-40 transition-all">
                ➤
              </button>
              <button onClick={() => setShowGiftPanel(!showGiftPanel)}
                className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-2xl hover:bg-amber-500/30 transition-all">
                🎁
              </button>
              {isHost && (
                <button onClick={endLive}
                  className="px-3 py-2 bg-red-500/80 text-white text-xs font-medium rounded-full hover:bg-red-500 transition-all">
                  Terminar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Gift panel (overlay below live) */}
        {showGiftPanel && (
          <div className="mt-3 bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">🎁 Enviar Regalo</h3>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xs font-medium">💰 {wallet?.coinsBalance?.toLocaleString() || 0} coins</span>
                <button onClick={() => setShowBuyCoins(!showBuyCoins)}
                  className="text-xs accent-text hover:underline">+ Comprar</button>
              </div>
            </div>

            {showBuyCoins && (
              <div className="mb-3 space-y-1.5">
                {packages.map(p => (
                  <button key={p.id} onClick={() => buyCoins(p.id)} disabled={busy}
                    className="w-full flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 hover:bg-gray-800 transition-all disabled:opacity-40">
                    <span className="text-white text-sm">💰 {p.coins.toLocaleString()} coins</span>
                    <span className="accent-gradient text-white text-xs font-bold px-3 py-1 rounded-lg">${p.price}</span>
                  </button>
                ))}
                <p className="text-center text-gray-600 text-[10px]">💳 Pagos reales próximamente con Stripe</p>
              </div>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {gifts.map(g => (
                <button key={g.id} onClick={() => sendLiveGift(g.id)}
                  disabled={busy || !wallet || wallet.coinsBalance < g.coins}
                  className={`bg-gray-900/60 border border-gray-700/50 rounded-xl p-2 text-center transition-all hover:scale-105 disabled:opacity-30 ${
                    wallet && wallet.coinsBalance >= g.coins ? 'hover:accent-glow hover:border-gray-500' : ''
                  }`}>
                  <div className="text-2xl">{g.emoji}</div>
                  <p className="text-gray-400 text-[9px] mt-0.5 truncate">{g.name}</p>
                  <p className="accent-text text-[10px] font-bold">{g.coins >= 1000 ? `${(g.coins/1000).toFixed(g.coins % 1000 ? 1 : 0)}k` : g.coins}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // 👥 GROUP DETAIL VIEW
  // ═══════════════════════════════════════════
  if (view === 'group-detail' && selectedGroup) {
    const isOwner = selectedGroup.ownerId === userId;
    const inviteExpired = new Date(selectedGroup.inviteExpiresAt) < new Date();

    return (
      <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
        {msg && <div className="text-center py-2 px-4 accent-bg-soft rounded-xl text-sm accent-text animate-fade-in">{msg}</div>}

        {/* Back button */}
        <button onClick={() => setView('groups')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          ← Volver a grupos
        </button>

        {/* Group header */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 text-center">
          <div className="w-20 h-20 accent-bg-soft rounded-2xl flex items-center justify-center text-4xl mx-auto">
            {selectedGroup.avatarEmoji}
          </div>
          <h2 className="text-white text-xl font-bold mt-3">{selectedGroup.name}</h2>
          {selectedGroup.description && <p className="text-gray-400 text-sm mt-1">{selectedGroup.description}</p>}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
            <span>👥 {selectedGroup.members.length} miembros</span>
            <span>👤 Creado por {selectedGroup.ownerName}</span>
          </div>

          {selectedGroup.isLive && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-red-400 text-sm font-medium">EN VIVO</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {selectedGroup.isLive ? (
            <button onClick={() => joinLive(selectedGroup)} disabled={busy}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all text-lg disabled:opacity-40 flex items-center justify-center gap-2">
              <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
              Ver Live
            </button>
          ) : isOwner ? (
            <div className="space-y-2">
              <input value={liveTitle} onChange={e => setLiveTitle(e.target.value)}
                placeholder="Título del live (opcional)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white accent-ring-focus text-sm" />
              <button onClick={startLive} disabled={busy}
                className="w-full py-4 accent-gradient text-white font-bold rounded-xl accent-shadow transition-all text-lg disabled:opacity-40 hover:opacity-90 flex items-center justify-center gap-2">
                🔴 Ir en Vivo
              </button>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p className="text-3xl mb-2">😴</p>
              <p className="text-sm">El grupo no está en vivo ahora</p>
              <p className="text-xs mt-1">Solo el dueño puede iniciar un live</p>
            </div>
          )}
        </div>

        {/* Invite link */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-sm">🔗 Link de Invitación</h3>
            {inviteExpired && <span className="text-red-400 text-[10px]">Expirado</span>}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono truncate">
              {selectedGroup.inviteCode}
            </code>
            <button onClick={() => copyInvite(selectedGroup.inviteCode)}
              className="px-4 py-2 accent-gradient text-white text-sm font-medium rounded-lg accent-shadow hover:opacity-90 transition-all">
              📋 Copiar
            </button>
          </div>
          <p className="text-gray-600 text-[10px] mt-2">
            Se renueva automáticamente cada 24 horas. Comparte el link para que se unan.
          </p>
          {isOwner && (
            <button onClick={async () => {
              try {
                const res = await api.post<{ inviteCode: string }>(`/live/groups/${selectedGroup.id}/refresh-invite`, {});
                setSelectedGroup({ ...selectedGroup, inviteCode: res.inviteCode });
                flash('✅ Nuevo código generado');
              } catch { flash('❌ Error'); }
            }} className="mt-2 text-xs accent-text hover:underline">🔄 Generar nuevo código</button>
          )}
        </div>

        {/* Members */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <h3 className="text-white font-semibold text-sm mb-3">👥 Miembros ({selectedGroup.members.length})</h3>
          <div className="space-y-2">
            {selectedGroup.members.map(m => (
              <div key={m.userId} className="flex items-center gap-3 bg-gray-900/40 rounded-xl px-3 py-2">
                <div className="w-8 h-8 accent-bg-soft rounded-full flex items-center justify-center text-sm">
                  {m.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{m.displayName}</p>
                  <p className="text-gray-500 text-[10px]">{m.role === 'owner' ? '👑 Dueño' : '👤 Miembro'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MAIN VIEW — GROUPS / WALLET / EARNINGS
  // ═══════════════════════════════════════════
  const TABS: { id: View; label: string; emoji: string }[] = [
    { id: 'groups', label: 'Mis Grupos', emoji: '👥' },
    { id: 'wallet', label: 'Billetera', emoji: '💰' },
    { id: 'earnings', label: 'Ganancias', emoji: '📊' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="text-center py-4">
        <h2 className="text-2xl sm:text-3xl font-bold accent-gradient-text">📡 Live & Grupos</h2>
        <p className="text-gray-400 text-sm mt-1">Crea grupos, haz lives y recibe regalos</p>
        {wallet && (
          <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 accent-bg-soft rounded-full">
            <span className="text-sm">💰 <strong className="accent-text">{wallet.coinsBalance.toLocaleString()}</strong> coins</span>
            <span className="text-gray-500">|</span>
            <span className="text-sm">💵 <strong className="text-green-400">${wallet.earningsBalance.toFixed(2)}</strong></span>
          </div>
        )}
      </div>

      {/* Flash message */}
      {msg && <div className="text-center py-2 px-4 accent-bg-soft rounded-xl text-sm accent-text animate-fade-in">{msg}</div>}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-800/60 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              view === t.id ? 'accent-bg text-white accent-shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}>
            <span>{t.emoji}</span> <span className="ml-1">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ GROUPS ═══ */}
      {view === 'groups' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="flex-1 accent-gradient text-white font-medium rounded-xl py-3 transition-all accent-shadow hover:opacity-90">
              ➕ Crear Grupo
            </button>
            <button onClick={() => setShowJoin(true)} className="flex-1 bg-gray-800 text-gray-300 font-medium rounded-xl py-3 border border-gray-700 hover:bg-gray-700 transition-all">
              🔗 Unirse con Código
            </button>
          </div>

          {/* Create dialog */}
          {showCreate && (
            <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-5 space-y-3 animate-fade-in">
              <h3 className="text-white font-semibold">Crear nuevo grupo</h3>
              <div className="flex gap-2 flex-wrap">{EMOJIS.map(e => (
                <button key={e} onClick={() => setNewGroup(p => ({...p, emoji: e}))}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${newGroup.emoji === e ? 'accent-bg accent-shadow scale-110' : 'bg-gray-700 hover:bg-gray-600'}`}>{e}</button>
              ))}</div>
              <input value={newGroup.name} onChange={e => setNewGroup(p => ({...p, name: e.target.value}))}
                placeholder="Nombre del grupo" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white accent-ring-focus" />
              <input value={newGroup.description} onChange={e => setNewGroup(p => ({...p, description: e.target.value}))}
                placeholder="Descripción (opcional)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white accent-ring-focus" />
              <div className="flex gap-2">
                <button onClick={createGroup} disabled={busy || !newGroup.name.trim()}
                  className="flex-1 accent-gradient text-white font-medium rounded-xl py-2.5 disabled:opacity-40 accent-shadow">
                  {busy ? '⏳' : '✅'} Crear
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">Cancelar</button>
              </div>
            </div>
          )}

          {/* Join dialog */}
          {showJoin && (
            <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-5 space-y-3 animate-fade-in">
              <h3 className="text-white font-semibold">Unirse a un grupo</h3>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Código de invitación" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-center text-lg tracking-widest accent-ring-focus" maxLength={8} />
              <div className="flex gap-2">
                <button onClick={joinGroup} disabled={busy || !joinCode.trim()}
                  className="flex-1 accent-gradient text-white font-medium rounded-xl py-2.5 disabled:opacity-40 accent-shadow">
                  {busy ? '⏳' : '🔗'} Unirse
                </button>
                <button onClick={() => setShowJoin(false)} className="px-4 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">Cancelar</button>
              </div>
            </div>
          )}

          {/* Groups list */}
          {groups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">👥</p>
              <p>No tienes grupos aún</p>
              <p className="text-sm">Crea uno o únete con un código de invitación</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(g => (
                <button key={g.id} onClick={() => openGroupDetail(g)}
                  className="w-full text-left bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4 hover:border-gray-600 transition-all hover:bg-gray-800/80">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 accent-bg-soft rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {g.avatarEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-semibold truncate">{g.name}</h4>
                        {g.isLive && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                          </span>
                        )}
                      </div>
                      {g.description && <p className="text-gray-400 text-xs mt-0.5 truncate">{g.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>👥 {g.members.length} miembros</span>
                        <span>👤 {g.ownerName}</span>
                      </div>
                    </div>
                    <span className="text-gray-600 text-lg">›</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ WALLET ═══ */}
      {view === 'wallet' && wallet && (
        <div className="space-y-4">
          <div className="accent-gradient rounded-2xl p-6 text-white text-center accent-shadow-lg">
            <p className="text-sm opacity-80">Tu balance</p>
            <p className="text-4xl font-bold mt-1">{wallet.coinsBalance.toLocaleString()} 💰</p>
            <p className="text-sm opacity-70 mt-1">coins disponibles</p>
          </div>

          <h3 className="text-white font-semibold">Comprar Coins</h3>
          <div className="space-y-2">
            {packages.map(p => (
              <button key={p.id} onClick={() => buyCoins(p.id)} disabled={busy}
                className={`w-full flex items-center justify-between bg-gray-800/60 border rounded-xl px-4 py-3 transition-all hover:bg-gray-800 ${
                  p.popular ? 'border-amber-500/50 accent-glow' : 'border-gray-700/50'
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div className="text-left">
                    <p className="text-white font-bold">{p.coins.toLocaleString()} coins</p>
                    {p.popular && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">⭐ Popular</span>}
                  </div>
                </div>
                <span className="accent-gradient text-white font-bold px-4 py-1.5 rounded-lg text-sm">${p.price}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs">💳 Pagos reales próximamente con Stripe</p>

          <h3 className="text-white font-semibold mt-6">Historial</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {wallet.transactions.slice().reverse().map(t => (
              <div key={t.id} className="flex items-center justify-between bg-gray-800/40 rounded-xl px-3 py-2 text-sm">
                <span className="text-gray-300 truncate flex-1">{t.description}</span>
                <span className={`font-medium ml-2 flex-shrink-0 ${t.coinsAmount > 0 ? 'text-green-400' : t.coinsAmount < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {t.coinsAmount > 0 ? '+' : ''}{t.coinsAmount !== 0 ? `${t.coinsAmount.toLocaleString()} 💰` : ''}
                  {t.moneyAmount ? ` $${Math.abs(t.moneyAmount).toFixed(2)}` : ''}
                </span>
              </div>
            ))}
            {wallet.transactions.length === 0 && <p className="text-gray-500 text-center py-4 text-sm">Sin transacciones aún</p>}
          </div>
        </div>
      )}

      {/* ═══ EARNINGS ═══ */}
      {view === 'earnings' && wallet && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">Ganado total</p>
              <p className="text-green-400 text-xl font-bold mt-1">${wallet.totalEarned.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">Disponible</p>
              <p className="accent-text text-xl font-bold mt-1">${wallet.earningsBalance.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">Retirado</p>
              <p className="text-gray-300 text-xl font-bold mt-1">${wallet.totalWithdrawn.toFixed(2)}</p>
            </div>
          </div>

          <div className="accent-bg-soft border accent-border-soft rounded-xl p-4">
            <p className="accent-text-light text-sm font-medium">💡 ¿Cómo funcionan las ganancias?</p>
            <p className="text-gray-400 text-xs mt-1">
              Por cada regalo que recibes en un live, el 50% se convierte en ganancias para ti y el 50% va a la plataforma.
              Puedes retirar cuando acumules mínimo <strong className="text-white">$20.00</strong>.
            </p>
          </div>

          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Retirar dinero</h3>
            {wallet.earningsBalance >= 20 ? (
              <div className="space-y-2">
                {[{ label: 'PayPal', icon: '💳', method: 'paypal' }, { label: 'Cuenta Bancaria', icon: '🏦', method: 'bank' }, { label: 'Tarjeta de Débito', icon: '💳', method: 'debit' }].map(m => (
                  <button key={m.method} onClick={() => withdraw(wallet.earningsBalance, m.method)} disabled={busy}
                    className="w-full flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 hover:bg-gray-800 transition-all disabled:opacity-40">
                    <span className="text-white text-sm">{m.icon} {m.label}</span>
                    <span className="text-green-400 font-bold text-sm">${wallet.earningsBalance.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Necesitas mínimo <strong className="text-white">$20.00</strong> para retirar</p>
                <p className="text-gray-600 text-xs mt-1">Te faltan ${(20 - wallet.earningsBalance).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
