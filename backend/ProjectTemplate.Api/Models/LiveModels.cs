namespace ProjectTemplate.Api.Models;

// ═══════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════
public class LiveGroup
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string? AvatarEmoji { get; set; } = "🎭";
    public string InviteCode { get; set; } = string.Empty;
    public DateTime InviteExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<GroupMember> Members { get; set; } = new();
    public bool IsLive { get; set; } = false;
    public string? LiveTitle { get; set; }
}

public class GroupMember
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "member"; // "owner", "moderator", "member"
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public class CreateGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? AvatarEmoji { get; set; }
    public string OwnerName { get; set; } = string.Empty;
}

public class JoinGroupRequest
{
    public string InviteCode { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

// ═══════════════════════════════════════════
// COINS & WALLET
// ═══════════════════════════════════════════
public class Wallet
{
    public string UserId { get; set; } = string.Empty;
    public int CoinsBalance { get; set; } = 0;
    public decimal EarningsBalance { get; set; } = 0m; // Real money earned from gifts (in USD)
    public decimal TotalEarned { get; set; } = 0m;
    public decimal TotalWithdrawn { get; set; } = 0m;
    public List<Transaction> Transactions { get; set; } = new();
}

public class Transaction
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Type { get; set; } = string.Empty; // "purchase", "gift_sent", "gift_received", "withdrawal"
    public int CoinsAmount { get; set; } = 0;
    public decimal? MoneyAmount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class BuyCoinsRequest
{
    public string PackageId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}

public class SendGiftRequest
{
    public string FromUserId { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public string GroupId { get; set; } = string.Empty;
    public string GiftId { get; set; } = string.Empty;
}

public class WithdrawRequest
{
    public string UserId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = "paypal"; // "paypal", "bank", "debit"
}

// ═══════════════════════════════════════════
// STATIC DATA — GIFTS & PACKAGES
// ═══════════════════════════════════════════
public static class LiveData
{
    public static readonly List<CoinPackage> CoinPackages = new()
    {
        new() { Id = "pkg_350", Coins = 350, Price = 4.99m, Popular = false },
        new() { Id = "pkg_1425", Coins = 1425, Price = 20.99m, Popular = true },
        new() { Id = "pkg_3537", Coins = 3537, Price = 55.99m, Popular = false },
        new() { Id = "pkg_7090", Coins = 7090, Price = 85.99m, Popular = true },
        new() { Id = "pkg_14161", Coins = 14161, Price = 220.99m, Popular = false },
    };

    public static readonly List<Gift> Gifts = new()
    {
        new() { Id = "gift_50", Name = "Rosa", Emoji = "🌹", Coins = 50 },
        new() { Id = "gift_100", Name = "Corazón", Emoji = "❤️", Coins = 100 },
        new() { Id = "gift_250", Name = "Estrella", Emoji = "⭐", Coins = 250 },
        new() { Id = "gift_300", Name = "Beso", Emoji = "💋", Coins = 300 },
        new() { Id = "gift_400", Name = "Mariposa", Emoji = "🦋", Coins = 400 },
        new() { Id = "gift_550", Name = "Perfume", Emoji = "🌸", Coins = 550 },
        new() { Id = "gift_1000", Name = "Corona", Emoji = "👑", Coins = 1000 },
        new() { Id = "gift_1200", Name = "Diamante", Emoji = "💎", Coins = 1200 },
        new() { Id = "gift_1500", Name = "Unicornio", Emoji = "🦄", Coins = 1500 },
        new() { Id = "gift_2000", Name = "Cohete", Emoji = "🚀", Coins = 2000 },
        new() { Id = "gift_2500", Name = "Fuego", Emoji = "🔥", Coins = 2500 },
        new() { Id = "gift_3000", Name = "Arcoíris", Emoji = "🌈", Coins = 3000 },
        new() { Id = "gift_4000", Name = "León", Emoji = "🦁", Coins = 4000 },
        new() { Id = "gift_4500", Name = "Castillo", Emoji = "🏰", Coins = 4500 },
        new() { Id = "gift_5000", Name = "Yate", Emoji = "🛥️", Coins = 5000 },
        new() { Id = "gift_7500", Name = "Jet Privado", Emoji = "✈️", Coins = 7500 },
        new() { Id = "gift_8200", Name = "Ferrari", Emoji = "🏎️", Coins = 8200 },
        new() { Id = "gift_9000", Name = "Isla", Emoji = "🏝️", Coins = 9000 },
        new() { Id = "gift_10000", Name = "Planeta", Emoji = "🪐", Coins = 10000 },
        new() { Id = "gift_15000", Name = "Galaxia", Emoji = "🌌", Coins = 15000 },
        new() { Id = "gift_25000", Name = "Universo", Emoji = "✨", Coins = 25000 },
    };

    // Convert coins to USD (based on best rate: 14161 coins = $220.99 → ~$0.0156 per coin)
    public static decimal CoinsToUsd(int coins) => Math.Round(coins * 0.0156m, 2);
}

public class CoinPackage
{
    public string Id { get; set; } = string.Empty;
    public int Coins { get; set; }
    public decimal Price { get; set; }
    public bool Popular { get; set; }
}

public class Gift
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public int Coins { get; set; }
}

// ═══════════════════════════════════════════
// LIVE ROOM & CHAT
// ═══════════════════════════════════════════
public class LiveSession
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string GroupId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string HostUserId { get; set; } = string.Empty;
    public string HostName { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public int ViewerCount { get; set; } = 0;
    public List<string> ActiveViewers { get; set; } = new();
    public List<LiveChatMessage> Messages { get; set; } = new();
    public List<LiveGiftEvent> GiftEvents { get; set; } = new();
    public int TotalGiftsCoins { get; set; } = 0;
}

public class LiveChatMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string? Type { get; set; } = "chat"; // "chat", "system", "gift"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class LiveGiftEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string FromUserId { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
    public string GiftId { get; set; } = string.Empty;
    public string GiftName { get; set; } = string.Empty;
    public string GiftEmoji { get; set; } = string.Empty;
    public int Coins { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class StartLiveRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
}

public class SendChatRequest
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class JoinLiveRequest
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class SendLiveGiftRequest
{
    public string FromUserId { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
    public string GiftId { get; set; } = string.Empty;
}
