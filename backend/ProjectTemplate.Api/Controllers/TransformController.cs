using System.Text.Json;
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
    private readonly IWebHostEnvironment _env;
    private static readonly JsonSerializerOptions _jsonOpts = new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public TransformController(TransformService transformService, ILogger<TransformController> logger, IWebHostEnvironment env)
    {
        _transformService = transformService;
        _logger = logger;
        _env = env;
    }

    private string HistoryDir => Path.Combine(_env.ContentRootPath, "wwwroot", "data", "transform-history");

    [HttpPost("analyze")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB for base64 selfies
    public async Task<IActionResult> Analyze([FromBody] TransformAnalyzeRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Se requiere una imagen. Sube tu selfie para comenzar." });

            var result = await _transformService.AnalyzeAsync(request);

            // Auto-save the analysis
            _ = Task.Run(async () =>
            {
                try
                {
                    Directory.CreateDirectory(HistoryDir);
                    var entry = new
                    {
                        id = Guid.NewGuid().ToString(),
                        date = DateTime.UtcNow.ToString("o"),
                        age = request.Age,
                        goal = request.Goal,
                        personality = request.Personality,
                        faceShape = result.FaceShape,
                        skinTone = result.SkinTone,
                        greeting = result.Greeting,
                        result
                    };
                    var json = JsonSerializer.Serialize(entry, _jsonOpts);
                    await System.IO.File.WriteAllTextAsync(
                        Path.Combine(HistoryDir, $"{entry.id}.json"), json);
                    _logger.LogInformation("Transform analysis saved: {Id}", entry.id);
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to save transform analysis"); }
            });

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

    /// <summary>Get saved analysis history (list view - without full results)</summary>
    [HttpGet("history")]
    public IActionResult GetHistory()
    {
        try
        {
            if (!Directory.Exists(HistoryDir))
                return Ok(Array.Empty<object>());

            var items = new List<object>();
            foreach (var file in Directory.GetFiles(HistoryDir, "*.json").OrderByDescending(f => f))
            {
                try
                {
                    var json = System.IO.File.ReadAllText(file);
                    var doc = JsonSerializer.Deserialize<JsonElement>(json);
                    items.Add(new
                    {
                        id = doc.GetProperty("id").GetString(),
                        date = doc.GetProperty("date").GetString(),
                        faceShape = doc.TryGetProperty("faceShape", out var fs) ? fs.GetString() : "",
                        skinTone = doc.TryGetProperty("skinTone", out var st) ? st.GetString() : "",
                        greeting = doc.TryGetProperty("greeting", out var gr) ? gr.GetString() : "",
                        goal = doc.TryGetProperty("goal", out var gl) ? gl.GetString() : "",
                    });
                }
                catch { /* skip corrupt files */ }
            }

            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get transform history");
            return StatusCode(500, new { message = "Error al cargar historial." });
        }
    }

    /// <summary>Get a specific saved analysis with full results</summary>
    [HttpGet("history/{id}")]
    public async Task<IActionResult> GetAnalysis(string id)
    {
        try
        {
            var path = Path.Combine(HistoryDir, $"{id}.json");
            if (!System.IO.File.Exists(path))
                return NotFound(new { message = "Análisis no encontrado." });

            var json = await System.IO.File.ReadAllTextAsync(path);
            var doc = JsonSerializer.Deserialize<JsonElement>(json);

            // Return only the result portion
            if (doc.TryGetProperty("result", out var result))
                return Ok(result);

            return Ok(doc);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get analysis {Id}", id);
            return StatusCode(500, new { message = "Error al cargar análisis." });
        }
    }

    /// <summary>Delete a saved analysis</summary>
    [HttpDelete("history/{id}")]
    public IActionResult DeleteAnalysis(string id)
    {
        try
        {
            var path = Path.Combine(HistoryDir, $"{id}.json");
            if (!System.IO.File.Exists(path))
                return NotFound(new { message = "Análisis no encontrado." });

            System.IO.File.Delete(path);
            return Ok(new { message = "Análisis eliminado." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete analysis {Id}", id);
            return StatusCode(500, new { message = "Error al eliminar." });
        }
    }
}
