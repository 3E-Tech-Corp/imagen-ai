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

    // ═══ STATIC DATA ═══
    [HttpGet("gifts")]
    public IActionResult GetGifts() => Ok(_liveService.GetGifts());

    [HttpGet("coin-packages")]
    public IActionResult GetCoinPackages() => Ok(_liveService.GetCoinPackages());
}
