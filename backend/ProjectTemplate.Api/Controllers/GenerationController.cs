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

    [HttpGet("status")]
    public IActionResult Status()
    {
        var config = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var falKey = config["FalAi:ApiKey"];
        var openaiKey = config["OpenAI:ApiKey"];

        return Ok(new
        {
            imageGeneration = !string.IsNullOrEmpty(falKey) && !falKey.Contains("__"),
            videoGeneration = !string.IsNullOrEmpty(falKey) && !falKey.Contains("__"),
            voiceGeneration = !string.IsNullOrEmpty(openaiKey) && !openaiKey.Contains("__"),
            message = (string.IsNullOrEmpty(falKey) || falKey.Contains("__"))
                ? "API keys pendientes de configurar"
                : "Todo listo"
        });
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] GenerationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest(new { message = "Por favor escribe una descripción de lo que quieres crear." });

        // Retry up to 2 times on transient failures
        const int maxRetries = 2;
        Exception? lastError = null;

        for (int attempt = 0; attempt <= maxRetries; attempt++)
        {
            try
            {
                if (attempt > 0)
                    _logger.LogInformation("Retry attempt {Attempt} for prompt: {Prompt}", attempt, request.Prompt);
                else
                    _logger.LogInformation("Generating {Type} with prompt: {Prompt}", request.Type, request.Prompt);

                GeneratedMedia media;
                if (request.Type == "video")
                {
                    media = await _generationService.GenerateVideoAsync(request);
                }
                else
                {
                    media = await _generationService.GenerateImageAsync(request);
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
            catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
            {
                // Config error — don't retry
                _logger.LogError(ex, "API key not configured");
                return StatusCode(503, new { message = "El servicio de generación necesita ser configurado. Contacta al administrador." });
            }
            catch (Exception ex)
            {
                lastError = ex;
                _logger.LogWarning(ex, "Generation attempt {Attempt} failed", attempt);
                if (attempt < maxRetries)
                    await Task.Delay(1000 * (attempt + 1)); // Wait before retry
            }
        }

        _logger.LogError(lastError, "All generation attempts failed for prompt: {Prompt}", request.Prompt);
        return StatusCode(500, new { message = "No se pudo generar el contenido. Por favor intenta de nuevo con una descripción diferente." });
    }

    [HttpPost("voice")]
    public async Task<IActionResult> GenerateVoice([FromBody] VoiceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { message = "Por favor escribe el texto que quieres convertir en voz." });

        try
        {
            _logger.LogInformation("Generating voice: lang={Lang}, gender={Gender}, text={Text}",
                request.Language, request.Gender, request.Text[..Math.Min(50, request.Text.Length)]);

            var audioBytes = await _ttsService.GenerateSpeechAsync(
                request.Text, request.Language, request.Gender);

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
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return StatusCode(503, new { message = "El servicio de voz necesita ser configurado. Contacta al administrador." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Voice generation failed");
            return StatusCode(500, new { message = "No se pudo generar la voz. Por favor intenta de nuevo." });
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
