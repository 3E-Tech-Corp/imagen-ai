using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Models;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GenerationController : ControllerBase
{
    private readonly ImageGenerationService _generationService;
    private readonly ILogger<GenerationController> _logger;

    public GenerationController(ImageGenerationService generationService, ILogger<GenerationController> logger)
    {
        _generationService = generationService;
        _logger = logger;
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] GenerationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest(new { message = "El prompt es requerido" });

        try
        {
            _logger.LogInformation("Generating {Type} with prompt: {Prompt}", request.Type, request.Prompt);

            GeneratedMedia media;
            if (request.Type == "video")
            {
                media = await _generationService.GenerateVideoAsync(
                    request.Prompt, request.Style, request.NegativePrompt);
            }
            else
            {
                media = await _generationService.GenerateImageAsync(
                    request.Prompt, request.Style, request.NegativePrompt);
            }

            var response = new GenerationResponse
            {
                Id = Guid.NewGuid().ToString(),
                Prompt = request.Prompt,
                Type = request.Type,
                Style = request.Style,
                Url = media.Url,
                CreatedAt = DateTime.UtcNow.ToString("o"),
                Status = "completed"
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Generation failed for prompt: {Prompt}", request.Prompt);
            return StatusCode(500, new { message = $"Error al generar: {ex.Message}" });
        }
    }
}
