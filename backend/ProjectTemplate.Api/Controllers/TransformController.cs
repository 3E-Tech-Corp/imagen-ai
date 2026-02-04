using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Models;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("[controller]")]
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
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB for base64 selfies
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
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException || ex.CancellationToken.IsCancellationRequested == false)
        {
            _logger.LogError(ex, "Transform analyze timed out");
            return StatusCode(504, new { message = "El análisis tomó demasiado tiempo. Intenta con una foto más pequeña o simple." });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Transform analyze HTTP error: {Message}", ex.Message);
            return StatusCode(502, new { message = "Error de conexión con el servicio de IA. Intenta de nuevo en unos segundos." });
        }
        catch (System.Text.Json.JsonException ex)
        {
            _logger.LogError(ex, "Transform analyze JSON parse error: {Message}", ex.Message);
            return StatusCode(500, new { message = "Error al procesar la respuesta de la IA. Intenta de nuevo." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing transform: {Message}", ex.Message);
            return StatusCode(500, new { message = "Error al analizar. Intenta de nuevo. Si el problema persiste, prueba con otra foto." });
        }
    }
}
