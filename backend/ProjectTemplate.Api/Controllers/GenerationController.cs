using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Models;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GenerationController : ControllerBase
{
    private readonly ImageGenerationService _generationService;
    private readonly TtsService _ttsService;
    private readonly VideoEditService _videoEditService;
    private readonly ILogger<GenerationController> _logger;
    private readonly IWebHostEnvironment _env;

    public GenerationController(
        ImageGenerationService generationService,
        TtsService ttsService,
        VideoEditService videoEditService,
        ILogger<GenerationController> logger,
        IWebHostEnvironment env)
    {
        _generationService = generationService;
        _ttsService = ttsService;
        _videoEditService = videoEditService;
        _logger = logger;
        _env = env;
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

    [HttpPost("voice")]
    public async Task<IActionResult> GenerateVoice([FromBody] VoiceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { message = "El texto es requerido" });

        try
        {
            _logger.LogInformation("Generating voice: lang={Lang}, gender={Gender}, text={Text}",
                request.Language, request.Gender, request.Text[..Math.Min(50, request.Text.Length)]);

            var audioBytes = await _ttsService.GenerateSpeechAsync(
                request.Text, request.Language, request.Gender);

            // Save audio file and return URL
            var fileName = $"{Guid.NewGuid()}.mp3";
            var audioDir = Path.Combine(_env.ContentRootPath, "wwwroot", "audio");
            Directory.CreateDirectory(audioDir);
            var filePath = Path.Combine(audioDir, fileName);
            await System.IO.File.WriteAllBytesAsync(filePath, audioBytes);

            var audioUrl = $"/audio/{fileName}";

            var response = new GenerationResponse
            {
                Id = Guid.NewGuid().ToString(),
                Prompt = request.Text,
                Type = "voice",
                Style = "realistic",
                Url = audioUrl,
                CreatedAt = DateTime.UtcNow.ToString("o"),
                Status = "completed"
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Voice generation failed");
            return StatusCode(500, new { message = $"Error al generar voz: {ex.Message}" });
        }
    }

    [HttpPost("edit-video")]
    public async Task<IActionResult> EditVideo([FromBody] VideoEditRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.VideoUrl))
            return BadRequest(new { message = "La URL del video es requerida" });

        try
        {
            _logger.LogInformation("Editing video: {VideoId}", request.VideoId);

            var outputUrl = await _videoEditService.EditVideoAsync(request);

            return Ok(new { url = outputUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Video editing failed");
            return StatusCode(500, new { message = $"Error al editar video: {ex.Message}" });
        }
    }
}
