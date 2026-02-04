using System.Collections.Concurrent;
using System.Text.Json;
using ProjectTemplate.Api.Models;

namespace ProjectTemplate.Api.Services;

public class LiveService
{
    private readonly ILogger<LiveService> _logger;
    private readonly ConcurrentDictionary<string, LiveGroup> _groups = new();
    private readonly ConcurrentDictionary<string, Wallet> _wallets = new();
    private readonly string _dataDir;

    public LiveService(ILogger<LiveService> logger, IWebHostEnvironment env)
    {
        _logger = logger;
        _dataDir = Path.Combine(env.ContentRootPath, "App_Data", "live");
        Directory.CreateDirectory(_dataDir);
        LoadData();
    }

    // ═══════════════════════════════════════════
    // GROUPS
    // ═══════════════════════════════════════════
    public LiveGroup CreateGroup(CreateGroupRequest req)
    {
        var group = new LiveGroup
        {
            Name = req.Name,
            Description = req.Description ?? "",
            OwnerId = req.OwnerName.ToLower().Replace(" ", "_"),
            OwnerName = req.OwnerName,
            AvatarEmoji = req.AvatarEmoji ?? "🎭",
            InviteCode = GenerateInviteCode(),
            InviteExpiresAt = DateTime.UtcNow.AddHours(24),
            Members = new List<GroupMember>
            {
                new() { UserId = req.OwnerName.ToLower().Replace(" ", "_"), DisplayName = req.OwnerName, Role = "owner" }
            }
        };

        _groups[group.Id] = group;
        SaveData();
        _logger.LogInformation("Group created: {Name} by {Owner}", group.Name, group.OwnerName);
        return group;
    }

    public List<LiveGroup> GetGroups() => _groups.Values.OrderByDescending(g => g.CreatedAt).ToList();

    public LiveGroup? GetGroup(string id) => _groups.TryGetValue(id, out var g) ? g : null;

    public LiveGroup? JoinGroup(JoinGroupRequest req)
    {
        var group = _groups.Values.FirstOrDefault(g => g.InviteCode == req.InviteCode);
        if (group == null) return null;

        if (group.InviteExpiresAt < DateTime.UtcNow)
        {
            // Auto-refresh expired invite
            group.InviteCode = GenerateInviteCode();
            group.InviteExpiresAt = DateTime.UtcNow.AddHours(24);
        }

        var userId = req.DisplayName.ToLower().Replace(" ", "_");
        if (group.Members.All(m => m.UserId != userId))
        {
            group.Members.Add(new GroupMember { UserId = userId, DisplayName = req.DisplayName });
            SaveData();
        }

        return group;
    }

    public string RefreshInvite(string groupId)
    {
        if (_groups.TryGetValue(groupId, out var group))
        {
            group.InviteCode = GenerateInviteCode();
            group.InviteExpiresAt = DateTime.UtcNow.AddHours(24);
            SaveData();
            return group.InviteCode;
        }
        return "";
    }

    public bool DeleteGroup(string groupId)
    {
        if (_groups.TryRemove(groupId, out _))
        {
            SaveData();
            return true;
        }
        return false;
    }

    // ═══════════════════════════════════════════
    // WALLET & COINS
    // ═══════════════════════════════════════════
    public Wallet GetOrCreateWallet(string userId)
    {
        if (!_wallets.TryGetValue(userId, out var wallet))
        {
            wallet = new Wallet { UserId = userId, CoinsBalance = 500 }; // Start with 500 free coins
            wallet.Transactions.Add(new Transaction
            {
                Type = "bonus",
                CoinsAmount = 500,
                Description = "🎉 ¡Bienvenida! 500 coins de regalo"
            });
            _wallets[userId] = wallet;
            SaveData();
        }
        return wallet;
    }

    public Wallet? BuyCoins(BuyCoinsRequest req)
    {
        var package = LiveData.CoinPackages.FirstOrDefault(p => p.Id == req.PackageId);
        if (package == null) return null;

        var wallet = GetOrCreateWallet(req.UserId);
        wallet.CoinsBalance += package.Coins;
        wallet.Transactions.Add(new Transaction
        {
            Type = "purchase",
            CoinsAmount = package.Coins,
            MoneyAmount = package.Price,
            Description = $"💰 Compra de {package.Coins:N0} coins (${package.Price})"
        });

        SaveData();
        _logger.LogInformation("Coins purchased: {UserId} bought {Coins} for ${Price}", req.UserId, package.Coins, package.Price);
        return wallet;
    }

    public (bool success, string message) SendGift(SendGiftRequest req)
    {
        var gift = LiveData.Gifts.FirstOrDefault(g => g.Id == req.GiftId);
        if (gift == null) return (false, "Regalo no encontrado");

        var senderWallet = GetOrCreateWallet(req.FromUserId);
        if (senderWallet.CoinsBalance < gift.Coins)
            return (false, $"No tienes suficientes coins. Necesitas {gift.Coins:N0} y tienes {senderWallet.CoinsBalance:N0}");

        var receiverWallet = GetOrCreateWallet(req.ToUserId);

        // Deduct from sender
        senderWallet.CoinsBalance -= gift.Coins;
        senderWallet.Transactions.Add(new Transaction
        {
            Type = "gift_sent",
            CoinsAmount = -gift.Coins,
            Description = $"🎁 {gift.Emoji} {gift.Name} enviado ({gift.Coins:N0} coins)"
        });

        // 50/50 split: half goes to streamer as earnings, half to platform
        var totalUsd = LiveData.CoinsToUsd(gift.Coins);
        var streamerShare = Math.Round(totalUsd / 2, 2);

        receiverWallet.EarningsBalance += streamerShare;
        receiverWallet.TotalEarned += streamerShare;
        receiverWallet.Transactions.Add(new Transaction
        {
            Type = "gift_received",
            CoinsAmount = gift.Coins,
            MoneyAmount = streamerShare,
            Description = $"🎁 {gift.Emoji} {gift.Name} recibido — +${streamerShare:F2}"
        });

        SaveData();
        _logger.LogInformation("Gift sent: {Gift} from {From} to {To} ({Coins} coins, ${Usd})", gift.Name, req.FromUserId, req.ToUserId, gift.Coins, totalUsd);
        return (true, $"¡{gift.Emoji} {gift.Name} enviado!");
    }

    public (bool success, string message) Withdraw(WithdrawRequest req)
    {
        var wallet = GetOrCreateWallet(req.UserId);

        if (wallet.EarningsBalance < 20)
            return (false, $"Mínimo $20 para retirar. Tienes ${wallet.EarningsBalance:F2}");

        if (req.Amount > wallet.EarningsBalance)
            return (false, $"No tienes suficiente. Disponible: ${wallet.EarningsBalance:F2}");

        if (req.Amount < 20)
            return (false, "El retiro mínimo es $20");

        wallet.EarningsBalance -= req.Amount;
        wallet.TotalWithdrawn += req.Amount;
        wallet.Transactions.Add(new Transaction
        {
            Type = "withdrawal",
            MoneyAmount = -req.Amount,
            Description = $"🏦 Retiro de ${req.Amount:F2} vía {req.Method} (pendiente de procesamiento)"
        });

        SaveData();
        _logger.LogInformation("Withdrawal: {UserId} withdrew ${Amount} via {Method}", req.UserId, req.Amount, req.Method);
        return (true, $"✅ Retiro de ${req.Amount:F2} solicitado vía {req.Method}. Se procesará en 1-3 días hábiles.");
    }

    // ═══════════════════════════════════════════
    // LIVE SESSIONS
    // ═══════════════════════════════════════════
    private readonly ConcurrentDictionary<string, LiveSession> _sessions = new();

    public LiveSession? StartLive(string groupId, StartLiveRequest req)
    {
        if (!_groups.TryGetValue(groupId, out var group)) return null;
        if (group.IsLive) return _sessions.Values.FirstOrDefault(s => s.GroupId == groupId && s.IsActive);

        var session = new LiveSession
        {
            GroupId = groupId,
            Title = string.IsNullOrWhiteSpace(req.Title) ? $"🔴 {group.Name} en vivo!" : req.Title,
            HostUserId = req.UserId,
            HostName = group.OwnerName,
            ActiveViewers = new List<string> { req.UserId }
        };
        session.Messages.Add(new LiveChatMessage
        {
            UserId = "system",
            DisplayName = "Sistema",
            Text = $"🔴 ¡{group.OwnerName} está en vivo!",
            Type = "system"
        });

        _sessions[session.Id] = session;
        group.IsLive = true;
        group.LiveTitle = session.Title;
        SaveData();
        _logger.LogInformation("Live started: {Group} by {Host}", group.Name, group.OwnerName);
        return session;
    }

    public bool EndLive(string groupId, string userId)
    {
        if (!_groups.TryGetValue(groupId, out var group)) return false;

        var session = _sessions.Values.FirstOrDefault(s => s.GroupId == groupId && s.IsActive);
        if (session == null) return false;

        session.IsActive = false;
        session.EndedAt = DateTime.UtcNow;
        session.Messages.Add(new LiveChatMessage
        {
            UserId = "system",
            DisplayName = "Sistema",
            Text = "📴 El live ha terminado. ¡Gracias por acompañarnos!",
            Type = "system"
        });

        group.IsLive = false;
        group.LiveTitle = null;
        SaveData();
        _logger.LogInformation("Live ended: {Group}", group.Name);
        return true;
    }

    public LiveSession? GetActiveSession(string groupId)
        => _sessions.Values.FirstOrDefault(s => s.GroupId == groupId && s.IsActive);

    public LiveSession? JoinLive(string groupId, JoinLiveRequest req)
    {
        var session = _sessions.Values.FirstOrDefault(s => s.GroupId == groupId && s.IsActive);
        if (session == null) return null;

        if (!session.ActiveViewers.Contains(req.UserId))
        {
            session.ActiveViewers.Add(req.UserId);
            session.ViewerCount = session.ActiveViewers.Count;
            session.Messages.Add(new LiveChatMessage
            {
                UserId = "system",
                DisplayName = "Sistema",
                Text = $"👋 {req.DisplayName} se unió al live",
                Type = "system"
            });
        }
        return session;
    }

    public LiveChatMessage? SendChat(string groupId, SendChatRequest req)
    {
        var session = _sessions.Values.FirstOrDefault(s => s.GroupId == groupId && s.IsActive);
        if (session == null) return null;

        var msg = new LiveChatMessage
        {
            UserId = req.UserId,
            DisplayName = req.DisplayName,
            Text = req.Text,
            Type = "chat"
        };
        session.Messages.Add(msg);

        // Keep last 200 messages to prevent memory overflow
        if (session.Messages.Count > 200)
            session.Messages = session.Messages.Skip(session.Messages.Count - 200).ToList();

        return msg;
    }

    public (bool success, string message, LiveGiftEvent? giftEvent) SendLiveGift(string groupId, SendLiveGiftRequest req)
    {
        var session = _sessions.Values.FirstOrDefault(s => s.GroupId == groupId && s.IsActive);
        if (session == null) return (false, "No hay live activo", null);

        var gift = LiveData.Gifts.FirstOrDefault(g => g.Id == req.GiftId);
        if (gift == null) return (false, "Regalo no encontrado", null);

        var senderWallet = GetOrCreateWallet(req.FromUserId);
        if (senderWallet.CoinsBalance < gift.Coins)
            return (false, $"No tienes suficientes coins. Necesitas {gift.Coins:N0}", null);

        var hostWallet = GetOrCreateWallet(session.HostUserId);

        // Deduct from sender
        senderWallet.CoinsBalance -= gift.Coins;
        senderWallet.Transactions.Add(new Transaction
        {
            Type = "gift_sent",
            CoinsAmount = -gift.Coins,
            Description = $"🎁 {gift.Emoji} {gift.Name} en live de {session.HostName}"
        });

        // 50/50 split
        var totalUsd = LiveData.CoinsToUsd(gift.Coins);
        var streamerShare = Math.Round(totalUsd / 2, 2);
        hostWallet.EarningsBalance += streamerShare;
        hostWallet.TotalEarned += streamerShare;
        hostWallet.Transactions.Add(new Transaction
        {
            Type = "gift_received",
            CoinsAmount = gift.Coins,
            MoneyAmount = streamerShare,
            Description = $"🎁 {gift.Emoji} {gift.Name} de {req.FromName} en live — +${streamerShare:F2}"
        });

        // Record gift event
        var giftEvent = new LiveGiftEvent
        {
            FromUserId = req.FromUserId,
            FromName = req.FromName,
            GiftId = gift.Id,
            GiftName = gift.Name,
            GiftEmoji = gift.Emoji,
            Coins = gift.Coins
        };
        session.GiftEvents.Add(giftEvent);
        session.TotalGiftsCoins += gift.Coins;

        // Add chat message for the gift
        session.Messages.Add(new LiveChatMessage
        {
            UserId = req.FromUserId,
            DisplayName = req.FromName,
            Text = $"🎁 envió {gift.Emoji} {gift.Name} ({gift.Coins:N0} coins)",
            Type = "gift"
        });

        SaveData();
        return (true, $"¡{gift.Emoji} {gift.Name} enviado!", giftEvent);
    }

    public object? GetLiveState(string groupId, int? afterMessageIndex)
    {
        var session = _sessions.Values.FirstOrDefault(s => s.GroupId == groupId && s.IsActive);
        if (session == null) return null;

        var idx = afterMessageIndex ?? 0;
        var newMessages = session.Messages.Skip(idx).ToList();
        var recentGifts = session.GiftEvents.OrderByDescending(g => g.CreatedAt).Take(5).ToList();

        return new
        {
            session.Id,
            session.Title,
            session.HostName,
            session.HostUserId,
            viewerCount = session.ActiveViewers.Count,
            session.IsActive,
            session.TotalGiftsCoins,
            messages = newMessages,
            totalMessages = session.Messages.Count,
            recentGifts,
            startedAt = session.StartedAt
        };
    }

    // ═══════════════════════════════════════════
    // STATIC DATA
    // ═══════════════════════════════════════════
    public List<Gift> GetGifts() => LiveData.Gifts;
    public List<CoinPackage> GetCoinPackages() => LiveData.CoinPackages;

    // ═══════════════════════════════════════════
    // PERSISTENCE
    // ═══════════════════════════════════════════
    private void SaveData()
    {
        try
        {
            var groupsJson = JsonSerializer.Serialize(_groups.Values.ToList());
            File.WriteAllText(Path.Combine(_dataDir, "groups.json"), groupsJson);

            var walletsJson = JsonSerializer.Serialize(_wallets.Values.ToList());
            File.WriteAllText(Path.Combine(_dataDir, "wallets.json"), walletsJson);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save live data");
        }
    }

    private void LoadData()
    {
        try
        {
            var groupsFile = Path.Combine(_dataDir, "groups.json");
            if (File.Exists(groupsFile))
            {
                var groups = JsonSerializer.Deserialize<List<LiveGroup>>(File.ReadAllText(groupsFile));
                if (groups != null)
                    foreach (var g in groups) _groups[g.Id] = g;
            }

            var walletsFile = Path.Combine(_dataDir, "wallets.json");
            if (File.Exists(walletsFile))
            {
                var wallets = JsonSerializer.Deserialize<List<Wallet>>(File.ReadAllText(walletsFile));
                if (wallets != null)
                    foreach (var w in wallets) _wallets[w.UserId] = w;
            }

            _logger.LogInformation("Loaded {Groups} groups, {Wallets} wallets", _groups.Count, _wallets.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load live data");
        }
    }

    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 8).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }
}
