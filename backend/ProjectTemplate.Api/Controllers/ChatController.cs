using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Models;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class ChatController : ControllerBase
{
    private readonly ChatService _chatService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(ChatService chatService, ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    [HttpPost("message")]
    public async Task<IActionResult> SendMessage([FromBody] ChatMessageRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest(new { message = "Escribe un mensaje." });

            var response = await _chatService.ProcessMessageAsync(request);
            return Ok(response);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio no está configurado. Contacta al administrador." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat message");
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
