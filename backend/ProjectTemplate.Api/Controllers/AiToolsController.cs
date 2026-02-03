using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Models;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("ai-tools")]
public class AiToolsController : ControllerBase
{
    private readonly AiToolsService _aiToolsService;
    private readonly ILogger<AiToolsController> _logger;

    public AiToolsController(AiToolsService aiToolsService, ILogger<AiToolsController> logger)
    {
        _aiToolsService = aiToolsService;
        _logger = logger;
    }

    [HttpPost("remove-background")]
    public async Task<IActionResult> RemoveBackground([FromBody] RemoveBackgroundRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Se requiere una imagen." });

            var result = await _aiToolsService.RemoveBackgroundAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio no está configurado. Contacta al administrador." });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument for remove-background");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing background: {Message}", ex.Message);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("upscale")]
    public async Task<IActionResult> Upscale([FromBody] UpscaleRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Se requiere una imagen." });

            var result = await _aiToolsService.UpscaleAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio no está configurado. Contacta al administrador." });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument for upscale");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upscaling image: {Message}", ex.Message);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("reimagine")]
    public async Task<IActionResult> Reimagine([FromBody] ReimagineRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Se requiere una imagen." });
            if (string.IsNullOrWhiteSpace(request.Prompt))
                return BadRequest(new { message = "Se requiere una descripción de la transformación." });

            var result = await _aiToolsService.ReimagineAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio no está configurado. Contacta al administrador." });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument for reimagine");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reimagining image: {Message}", ex.Message);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("sketch-to-image")]
    public async Task<IActionResult> SketchToImage([FromBody] SketchToImageRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Se requiere un boceto." });
            if (string.IsNullOrWhiteSpace(request.Prompt))
                return BadRequest(new { message = "Se requiere una descripción de lo que quieres generar." });

            var result = await _aiToolsService.SketchToImageAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio no está configurado. Contacta al administrador." });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument for sketch-to-image");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error converting sketch to image: {Message}", ex.Message);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("lip-sync")]
    public async Task<IActionResult> LipSync([FromBody] LipSyncRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Se requiere una imagen de un rostro." });
            if (string.IsNullOrWhiteSpace(request.Text))
                return BadRequest(new { message = "Se requiere el texto que quieres que diga." });

            var result = await _aiToolsService.LipSyncAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio no está configurado. Contacta al administrador." });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument for lip-sync");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating lip-sync video: {Message}", ex.Message);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("retouch")]
    public async Task<IActionResult> Retouch([FromBody] RetouchRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Se requiere una imagen." });
            if (string.IsNullOrWhiteSpace(request.Prompt))
                return BadRequest(new { message = "Se requiere una descripción de los cambios." });

            var result = await _aiToolsService.RetouchAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio no está configurado. Contacta al administrador." });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument for retouch");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retouching image: {Message}", ex.Message);
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
