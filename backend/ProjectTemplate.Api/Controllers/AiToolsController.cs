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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing background");
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

            if (request.Scale != 2 && request.Scale != 4)
                return BadRequest(new { message = "La escala debe ser 2 o 4." });

            var result = await _aiToolsService.UpscaleAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upscaling image");
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reimagining image");
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error converting sketch to image");
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retouching image");
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
