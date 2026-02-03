using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ProjectTemplate.Api.Models;

namespace ProjectTemplate.Api.Services;

public class ImageGenerationService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ImageGenerationService> _logger;
    private readonly HttpClient _httpClient;

    public ImageGenerationService(IConfiguration config, ILogger<ImageGenerationService> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(10) };
    }

    private string GetFalKey()
    {
        var falKey = _config["FalAi:ApiKey"];
        if (string.IsNullOrEmpty(falKey) || falKey.Contains("__"))
            throw new InvalidOperationException("FAL.ai API key not configured");
        return falKey;
    }

    public async Task<GeneratedMedia> GenerateImageAsync(GenerationRequest request)
    {
        var falKey = GetFalKey();

        var fullPrompt = PromptBuilder.BuildImagePrompt(
            request.Prompt, request.Style, request.Environment,
            request.TimePeriod, request.Lighting, request.Emotion, request.Quality);

        var negativePrompt = PromptBuilder.BuildNegativePrompt(request.NegativePrompt);

        var imageSize = request.Quality switch
        {
            "max" => "square_hd",
            "ultra" => "square_hd",
            "high" => "square",
            _ => "square"
        };

        var requestBody = new
        {
            prompt = fullPrompt,
            negative_prompt = negativePrompt,
            image_size = imageSize,
            num_inference_steps = 28,
            guidance_scale = 3.5,
            num_images = 1,
            enable_safety_checker = true
        };

        _logger.LogInformation("Image prompt: {Prompt}", fullPrompt);

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/flux/dev",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("FAL image API error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception($"Error generando imagen. Intenta de nuevo.");
        }

        var result = JsonSerializer.Deserialize<FalImageResponse>(responseBody);
        var imageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No se pudo obtener la imagen. Intenta de nuevo.");

        return new GeneratedMedia { Url = imageUrl, Type = "image" };
    }

    /// <summary>
    /// Generate video using FAL's async queue API to avoid timeouts.
    /// Flow: submit job → poll status → get result URL.
    /// </summary>
    public async Task<GeneratedMedia> GenerateVideoAsync(GenerationRequest request)
    {
        var falKey = GetFalKey();

        var fullPrompt = PromptBuilder.BuildVideoPrompt(
            request.Prompt, request.Style, request.Environment,
            request.TimePeriod, request.Lighting, request.Emotion, request.Quality);

        _logger.LogInformation("Video prompt: {Prompt}", fullPrompt);

        var requestBody = new
        {
            prompt = fullPrompt,
            duration = "5",
            aspect_ratio = "16:9"
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

        // Step 1: Submit to queue
        _logger.LogInformation("Submitting video to FAL queue...");
        var submitResponse = await _httpClient.PostAsync(
            "https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var submitBody = await submitResponse.Content.ReadAsStringAsync();
        if (!submitResponse.IsSuccessStatusCode)
        {
            _logger.LogError("FAL queue submit error: {Status} {Body}", submitResponse.StatusCode, submitBody);
            throw new Exception("Error al iniciar generación de video. Intenta de nuevo.");
        }

        var queueResult = JsonSerializer.Deserialize<FalQueueResponse>(submitBody);
        var requestId = queueResult?.RequestId;
        if (string.IsNullOrEmpty(requestId))
            throw new Exception("No se pudo iniciar la generación de video.");

        _logger.LogInformation("Video queued with request_id: {RequestId}", requestId);

        // Step 2: Poll for completion (max ~8 minutes)
        var maxWait = TimeSpan.FromMinutes(8);
        var pollInterval = TimeSpan.FromSeconds(5);
        var startTime = DateTime.UtcNow;

        while (DateTime.UtcNow - startTime < maxWait)
        {
            await Task.Delay(pollInterval);

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

            var statusResponse = await _httpClient.GetAsync(
                $"https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video/requests/{requestId}/status"
            );

            var statusBody = await statusResponse.Content.ReadAsStringAsync();
            _logger.LogDebug("Queue status: {Body}", statusBody);

            var status = JsonSerializer.Deserialize<FalQueueStatus>(statusBody);

            if (status?.Status == "COMPLETED")
            {
                _logger.LogInformation("Video generation completed after {Seconds}s", (DateTime.UtcNow - startTime).TotalSeconds);

                // Step 3: Get the result
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

                var resultResponse = await _httpClient.GetAsync(
                    $"https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video/requests/{requestId}"
                );

                var resultBody = await resultResponse.Content.ReadAsStringAsync();
                if (!resultResponse.IsSuccessStatusCode)
                {
                    _logger.LogError("FAL result fetch error: {Status} {Body}", resultResponse.StatusCode, resultBody);
                    throw new Exception("Error al obtener el video generado.");
                }

                var videoResult = JsonSerializer.Deserialize<FalVideoResponse>(resultBody);
                var videoUrl = videoResult?.Video?.Url
                    ?? throw new Exception("No se pudo obtener la URL del video.");

                return new GeneratedMedia { Url = videoUrl, Type = "video" };
            }

            if (status?.Status == "FAILED")
            {
                _logger.LogError("Video generation failed: {Body}", statusBody);
                throw new Exception("La generación de video falló. Intenta con una descripción diferente.");
            }

            // IN_QUEUE or IN_PROGRESS — keep polling
            var elapsed = (DateTime.UtcNow - startTime).TotalSeconds;
            _logger.LogInformation("Video still processing... ({Elapsed}s elapsed, status: {Status})",
                elapsed, status?.Status ?? "unknown");
        }

        throw new Exception("La generación de video tardó demasiado. Intenta con una descripción más simple.");
    }
}

public class GeneratedMedia
{
    public string Url { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

public class FalImageResponse
{
    [JsonPropertyName("images")]
    public List<FalImage>? Images { get; set; }
}

public class FalImage
{
    [JsonPropertyName("url")]
    public string? Url { get; set; }
}

public class FalVideoResponse
{
    [JsonPropertyName("video")]
    public FalVideo? Video { get; set; }
}

public class FalVideo
{
    [JsonPropertyName("url")]
    public string? Url { get; set; }
}

public class FalQueueResponse
{
    [JsonPropertyName("request_id")]
    public string? RequestId { get; set; }

    [JsonPropertyName("status_url")]
    public string? StatusUrl { get; set; }
}

public class FalQueueStatus
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("queue_position")]
    public int? QueuePosition { get; set; }
}
