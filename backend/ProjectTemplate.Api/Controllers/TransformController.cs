using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Models;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("api/transform")]
public class TransformController : ControllerBase
{
    private readonly TransformService _transformService;
    private readonly ILogger<TransformController> _logger;

    public TransformController(TransformService transformService, ILogger<TransformController> logger)
    {
        _transformService = transformService;
        _logger = logger;
    }

    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze([FromBody] TransformAnalyzeRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Se requiere una imagen. Sube tu selfie para comenzar." });

            var result = await _transformService.AnalyzeAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio no está configurado. Contacta al administrador." });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument for transform analyze");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing transform: {Message}", ex.Message);
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
