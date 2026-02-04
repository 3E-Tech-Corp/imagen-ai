using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Models;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LiveController : ControllerBase
{
    private readonly LiveService _liveService;

    public LiveController(LiveService liveService) => _liveService = liveService;

    // ═══ GROUPS ═══
    [HttpGet("groups")]
    public IActionResult GetGroups() => Ok(_liveService.GetGroups());

    [HttpGet("groups/{id}")]
    public IActionResult GetGroup(string id)
    {
        var group = _liveService.GetGroup(id);
        return group != null ? Ok(group) : NotFound();
    }

    [HttpPost("groups")]
    public IActionResult CreateGroup([FromBody] CreateGroupRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Nombre del grupo requerido");
        var group = _liveService.CreateGroup(req);
        return Ok(group);
    }

    [HttpPost("groups/join")]
    public IActionResult JoinGroup([FromBody] JoinGroupRequest req)
    {
        var group = _liveService.JoinGroup(req);
        return group != null ? Ok(group) : NotFound(new { message = "Código de invitación inválido o expirado" });
    }

    [HttpPost("groups/{id}/refresh-invite")]
    public IActionResult RefreshInvite(string id)
    {
        var code = _liveService.RefreshInvite(id);
        return !string.IsNullOrEmpty(code) ? Ok(new { inviteCode = code }) : NotFound();
    }

    [HttpDelete("groups/{id}")]
    public IActionResult DeleteGroup(string id)
        => _liveService.DeleteGroup(id) ? Ok() : NotFound();

    // ═══ WALLET ═══
    [HttpGet("wallet/{userId}")]
    public IActionResult GetWallet(string userId) => Ok(_liveService.GetOrCreateWallet(userId));

    [HttpPost("wallet/buy-coins")]
    public IActionResult BuyCoins([FromBody] BuyCoinsRequest req)
    {
        var wallet = _liveService.BuyCoins(req);
        return wallet != null ? Ok(wallet) : BadRequest("Paquete no encontrado");
    }

    [HttpPost("wallet/send-gift")]
    public IActionResult SendGift([FromBody] SendGiftRequest req)
    {
        var (success, message) = _liveService.SendGift(req);
        return success ? Ok(new { message }) : BadRequest(new { message });
    }

    [HttpPost("wallet/withdraw")]
    public IActionResult Withdraw([FromBody] WithdrawRequest req)
    {
        var (success, message) = _liveService.Withdraw(req);
        return success ? Ok(new { message }) : BadRequest(new { message });
    }

    // ═══ LIVE SESSIONS ═══
    [HttpPost("groups/{id}/start-live")]
    public IActionResult StartLive(string id, [FromBody] StartLiveRequest req)
    {
        var session = _liveService.StartLive(id, req);
        return session != null ? Ok(session) : NotFound(new { message = "Grupo no encontrado" });
    }

    [HttpPost("groups/{id}/end-live")]
    public IActionResult EndLive(string id, [FromQuery] string userId)
    {
        return _liveService.EndLive(id, userId) ? Ok() : NotFound();
    }

    [HttpPost("groups/{id}/join-live")]
    public IActionResult JoinLive(string id, [FromBody] JoinLiveRequest req)
    {
        var session = _liveService.JoinLive(id, req);
        return session != null ? Ok(session) : NotFound(new { message = "No hay live activo" });
    }

    [HttpPost("groups/{id}/chat")]
    public IActionResult SendChat(string id, [FromBody] SendChatRequest req)
    {
        var msg = _liveService.SendChat(id, req);
        return msg != null ? Ok(msg) : NotFound(new { message = "No hay live activo" });
    }

    [HttpPost("groups/{id}/send-live-gift")]
    public IActionResult SendLiveGift(string id, [FromBody] SendLiveGiftRequest req)
    {
        var (success, message, giftEvent) = _liveService.SendLiveGift(id, req);
        return success ? Ok(new { message, giftEvent }) : BadRequest(new { message });
    }

    [HttpGet("groups/{id}/live-state")]
    public IActionResult GetLiveState(string id, [FromQuery] int? after)
    {
        var state = _liveService.GetLiveState(id, after);
        return state != null ? Ok(state) : NotFound(new { message = "No hay live activo" });
    }

    [HttpGet("groups/{id}/session")]
    public IActionResult GetActiveSession(string id)
    {
        var session = _liveService.GetActiveSession(id);
        return session != null ? Ok(session) : NotFound(new { message = "No hay live activo" });
    }

    // ═══ DIAGNOSTIC ═══
    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { status = "live-ok", time = DateTime.UtcNow });

    // ═══ STATIC DATA ═══
    [HttpGet("gifts")]
    public IActionResult GetGifts() => Ok(_liveService.GetGifts());

    [HttpGet("coin-packages")]
    public IActionResult GetCoinPackages() => Ok(_liveService.GetCoinPackages());
}
