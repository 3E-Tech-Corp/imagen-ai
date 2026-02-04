import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════
interface Group {
  id: string; name: string; description: string; ownerName: string;
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

type Tab = 'groups' | 'gifts' | 'wallet' | 'earnings';

export default function LiveSection() {
  const [tab, setTab] = useState<Tab>('groups');
  const [userId] = useState(() => localStorage.getItem('imagen-ai-user') || 'usuario_' + Math.random().toString(36).slice(2, 8));
  const [userName, setUserName] = useState(() => localStorage.getItem('imagen-ai-username') || '');
  const [groups, setGroups] = useState<Group[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [packages, setPackages] = useState<CoinPkg[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', emoji: '🎭' });
  const [joinCode, setJoinCode] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [giftTarget, setGiftTarget] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [needsName, setNeedsName] = useState(!userName);

  // Save user
  useEffect(() => { localStorage.setItem('imagen-ai-user', userId); }, [userId]);
  useEffect(() => { if (userName) localStorage.setItem('imagen-ai-username', userName); }, [userName]);

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

  // Show msg briefly
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

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

  const buyCoins = async (pkgId: string) => {
    setBusy(true);
    try {
      const w = await api.post<Wallet>('/live/wallet/buy-coins', { packageId: pkgId, userId });
      setWallet(w); flash('✅ ¡Coins comprados! (modo demo)');
    } catch { flash('❌ Error'); }
    setBusy(false);
  };

  const sendGift = async (giftId: string) => {
    if (!giftTarget || !selectedGroup) return;
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>('/live/wallet/send-gift', {
        fromUserId: userId, toUserId: giftTarget, groupId: selectedGroup.id, giftId
      });
      flash(res.message); await load();
    } catch (e: any) { flash(e?.message || '❌ Error enviando regalo'); }
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
    navigator.clipboard.writeText(link).then(() => flash('📋 Link copiado!')).catch(() => flash(`Código: ${code}`));
  };

  // ═══════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════
  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'groups', label: 'Mis Grupos', emoji: '👥' },
    { id: 'gifts', label: 'Regalos', emoji: '🎁' },
    { id: 'wallet', label: 'Billetera', emoji: '💰' },
    { id: 'earnings', label: 'Ganancias', emoji: '📊' },
  ];

  const EMOJIS = ['🎭', '🎤', '🎵', '💃', '🌟', '🔥', '💎', '🦋', '🌈', '👑', '🎪', '🎯'];

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
      {msg && (
        <div className="text-center py-2 px-4 accent-bg-soft rounded-xl text-sm accent-text animate-fade-in">{msg}</div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-800/60 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              tab === t.id ? 'accent-bg text-white accent-shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}>
            <span>{t.emoji}</span> <span className="hidden sm:inline ml-1">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ GROUPS TAB ═══ */}
      {tab === 'groups' && (
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
                <div key={g.id} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4 hover:border-gray-600 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 accent-bg-soft rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {g.avatarEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-semibold truncate">{g.name}</h4>
                        {g.isLive && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">🔴 LIVE</span>}
                      </div>
                      {g.description && <p className="text-gray-400 text-xs mt-0.5 truncate">{g.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>👥 {g.members.length} miembros</span>
                        <span>👤 {g.ownerName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-700/50">
                    <button onClick={() => copyInvite(g.inviteCode)}
                      className="text-xs px-3 py-1.5 accent-bg-soft accent-text-light rounded-lg transition-colors accent-bg-soft-hover">
                      📋 Copiar Link
                    </button>
                    <button onClick={() => { setSelectedGroup(g); setGiftTarget(g.ownerName.toLowerCase().replace(' ', '_')); setTab('gifts'); }}
                      className="text-xs px-3 py-1.5 bg-amber-500/15 text-amber-300 rounded-lg hover:bg-amber-500/25 transition-colors">
                      🎁 Regalar
                    </button>
                    <span className="text-[10px] text-gray-600 self-center ml-auto">
                      Código: <code className="accent-text">{g.inviteCode}</code>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ GIFTS TAB ═══ */}
      {tab === 'gifts' && (
        <div className="space-y-4">
          {selectedGroup && (
            <div className="accent-bg-soft border accent-border-soft rounded-xl p-3 flex items-center gap-2">
              <span className="text-lg">{selectedGroup.avatarEmoji}</span>
              <span className="text-white text-sm font-medium">{selectedGroup.name}</span>
              <span className="text-gray-400 text-xs">→ regalando a {giftTarget}</span>
              <button onClick={() => setSelectedGroup(null)} className="ml-auto text-gray-500 hover:text-red-400 text-sm">✕</button>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {gifts.map(g => (
              <button key={g.id} onClick={() => sendGift(g.id)} disabled={busy || !selectedGroup || !wallet || wallet.coinsBalance < g.coins}
                className={`bg-gray-800/60 border border-gray-700/50 rounded-2xl p-3 text-center transition-all hover:scale-[1.03] hover:border-gray-600 disabled:opacity-40 disabled:hover:scale-100 ${
                  wallet && wallet.coinsBalance >= g.coins ? 'hover:accent-glow' : ''
                }`}>
                <div className="text-3xl mb-1">{g.emoji}</div>
                <p className="text-white text-xs font-medium">{g.name}</p>
                <p className="accent-text text-[11px] font-bold">{g.coins.toLocaleString()} 💰</p>
              </button>
            ))}
          </div>

          {!selectedGroup && (
            <div className="text-center py-6 text-gray-500 text-sm">
              ☝️ Primero selecciona un grupo en la pestaña "Mis Grupos" y toca "🎁 Regalar"
            </div>
          )}
        </div>
      )}

      {/* ═══ WALLET TAB ═══ */}
      {tab === 'wallet' && wallet && (
        <div className="space-y-4">
          {/* Balance card */}
          <div className="accent-gradient rounded-2xl p-6 text-white text-center accent-shadow-lg">
            <p className="text-sm opacity-80">Tu balance</p>
            <p className="text-4xl font-bold mt-1">{wallet.coinsBalance.toLocaleString()} 💰</p>
            <p className="text-sm opacity-70 mt-1">coins disponibles</p>
          </div>

          {/* Coin packages */}
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
          <p className="text-center text-gray-600 text-xs">💳 Pagos con tarjeta, débito y PayPal (próximamente con Stripe)</p>

          {/* Transaction history */}
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

      {/* ═══ EARNINGS TAB ═══ */}
      {tab === 'earnings' && wallet && (
        <div className="space-y-4">
          {/* Stats cards */}
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

          {/* Split explanation */}
          <div className="accent-bg-soft border accent-border-soft rounded-xl p-4">
            <p className="accent-text-light text-sm font-medium">💡 ¿Cómo funcionan las ganancias?</p>
            <p className="text-gray-400 text-xs mt-1">
              Por cada regalo que recibes, el 50% se convierte en ganancias para ti y el 50% va a la plataforma.
              Puedes retirar cuando acumules mínimo <strong className="text-white">$20.00</strong>.
            </p>
          </div>

          {/* Withdraw */}
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Retirar dinero</h3>
            {wallet.earningsBalance >= 20 ? (
              <div className="space-y-2">
                {['PayPal', 'Cuenta Bancaria', 'Tarjeta de Débito'].map(method => (
                  <button key={method} onClick={() => withdraw(wallet.earningsBalance, method.toLowerCase())} disabled={busy}
                    className="w-full flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 hover:bg-gray-800 transition-all disabled:opacity-40">
                    <span className="text-white text-sm">
                      {method === 'PayPal' ? '💳' : method === 'Cuenta Bancaria' ? '🏦' : '💳'} {method}
                    </span>
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
