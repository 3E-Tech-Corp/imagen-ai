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

    private async Task<HttpResponseMessage> SendFalRequest(HttpMethod method, string url, string falKey, HttpContent? content = null)
    {
        using var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Key", falKey);
        if (content != null) request.Content = content;
        return await _httpClient.SendAsync(request);
    }

    public async Task<GeneratedMedia> GenerateImageAsync(GenerationRequest request)
    {
        var falKey = GetFalKey();

        // Use the prompt DIRECTLY from GPT-4o (already optimized)
        // Only use PromptBuilder if the prompt is short (came from direct API, not chat)
        string fullPrompt;
        if (request.Prompt.Length > 100)
        {
            // Long prompt = already processed by GPT-4o, use directly
            fullPrompt = request.Prompt;
        }
        else
        {
            // Short prompt = from direct generation, enhance with PromptBuilder
            fullPrompt = PromptBuilder.BuildImagePrompt(
                request.Prompt, request.Style, request.Environment,
                request.TimePeriod, request.Lighting, request.Emotion, request.Quality);
        }

        var negativePrompt = PromptBuilder.BuildNegativePrompt(request.NegativePrompt);

        // Use aspect ratio from GPT-4o decision or default
        var imageSize = request.AspectRatio switch
        {
            "portrait_4_3" => "portrait_4_3",
            "landscape_16_9" => "landscape_16_9",
            "landscape_4_3" => "landscape_4_3",
            "square_hd" => "square_hd",
            "square" => "square",
            _ => request.Quality switch
            {
                "max" or "ultra" => "square_hd",
                _ => "square"
            }
        };

        var hasReference = request.ReferenceImages?.Any(r => !string.IsNullOrEmpty(r)) == true;
        string endpoint;
        string requestJson;

        if (hasReference)
        {
            var referenceUrl = request.ReferenceImages!.First(r => !string.IsNullOrEmpty(r));
            
            // Check if it's a data URL (base64) — use dev endpoint for those
            if (referenceUrl.StartsWith("data:"))
            {
                endpoint = "https://fal.run/fal-ai/flux/dev/image-to-image";
                var i2iBody = new
                {
                    prompt = fullPrompt,
                    image_url = referenceUrl,
                    strength = request.EditStrength,
                    image_size = imageSize,
                    num_inference_steps = 35, // Higher steps for better quality
                    guidance_scale = 4.0,     // Higher guidance for more prompt adherence
                    num_images = 1,
                    enable_safety_checker = true
                };
                requestJson = JsonSerializer.Serialize(i2iBody);
            }
            else
            {
                // URL reference — use Flux Pro with image_url
                endpoint = "https://fal.run/fal-ai/flux/dev/image-to-image";
                var i2iBody = new
                {
                    prompt = fullPrompt,
                    image_url = referenceUrl,
                    strength = request.EditStrength,
                    image_size = imageSize,
                    num_inference_steps = 35,
                    guidance_scale = 4.0,
                    num_images = 1,
                    enable_safety_checker = true
                };
                requestJson = JsonSerializer.Serialize(i2iBody);
            }
            _logger.LogInformation("Image-to-image: strength={Strength}, size={Size}, prompt_len={Len}",
                request.EditStrength, imageSize, fullPrompt.Length);
        }
        else
        {
            // Use Flux Pro 1.1 Ultra for highest quality text-to-image
            endpoint = "https://fal.run/fal-ai/flux-pro/v1.1";
            var t2iBody = new
            {
                prompt = fullPrompt,
                image_size = imageSize,
                num_images = 1,
                safety_tolerance = "2",
                output_format = "jpeg"
            };
            requestJson = JsonSerializer.Serialize(t2iBody);
            _logger.LogInformation("Text-to-image (Flux Pro 1.1): size={Size}, prompt_len={Len}",
                imageSize, fullPrompt.Length);
        }

        _logger.LogInformation("Full prompt: {Prompt}", fullPrompt[..Math.Min(300, fullPrompt.Length)]);

        var response = await SendFalRequest(
            HttpMethod.Post, endpoint, falKey,
            new StringContent(requestJson, Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("FAL image API error: {Status} {Body}", response.StatusCode, responseBody);
            
            // If Flux Pro fails, fallback to Flux Dev
            if (endpoint.Contains("flux-pro"))
            {
                _logger.LogWarning("Flux Pro failed, falling back to Flux Dev...");
                endpoint = "https://fal.run/fal-ai/flux/dev";
                var fallbackBody = new
                {
                    prompt = fullPrompt,
                    image_size = imageSize,
                    num_inference_steps = 35,
                    guidance_scale = 4.0,
                    num_images = 1,
                    enable_safety_checker = true
                };
                var fallbackJson = JsonSerializer.Serialize(fallbackBody);
                response = await SendFalRequest(
                    HttpMethod.Post, endpoint, falKey,
                    new StringContent(fallbackJson, Encoding.UTF8, "application/json")
                );
                responseBody = await response.Content.ReadAsStringAsync();
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Flux Dev fallback also failed: {Status} {Body}", response.StatusCode, responseBody);
                    throw new Exception("Error generando imagen. Por favor intenta con otra descripción.");
                }
            }
            else
            {
                throw new Exception("Error generando imagen. Intenta de nuevo.");
            }
        }

        var result = JsonSerializer.Deserialize<FalImageResponse>(responseBody);
        var imageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No se pudo obtener la imagen. Intenta de nuevo.");

        _logger.LogInformation("Image generated successfully: {Url}", imageUrl[..Math.Min(80, imageUrl.Length)]);

        return new GeneratedMedia { Url = imageUrl, Type = "image" };
    }

    /// <summary>
    /// Generate video using FAL API.
    /// Fast mode: MiniMax Video-01-Live — synchronous call (~30-60s)
    /// Quality mode: Kling via queue (~2-4min)
    /// </summary>
    public async Task<GeneratedMedia> GenerateVideoAsync(GenerationRequest request)
    {
        var falKey = GetFalKey();

        // Use prompt directly if it's long enough (from GPT-4o)
        string fullPrompt;
        if (request.Prompt.Length > 100)
        {
            fullPrompt = request.Prompt;
        }
        else
        {
            fullPrompt = PromptBuilder.BuildVideoPrompt(
                request.Prompt, request.Style, request.Environment,
                request.TimePeriod, request.Lighting, request.Emotion, request.Quality);
        }

        _logger.LogInformation("Video prompt (len={Len}): {Prompt}",
            fullPrompt.Length, fullPrompt[..Math.Min(200, fullPrompt.Length)]);

        var hasReference = request.ReferenceImages?.Any(r => !string.IsNullOrEmpty(r)) == true;
        var referenceUrl = hasReference ? request.ReferenceImages!.First(r => !string.IsNullOrEmpty(r)) : null;

        var useFastModel = request.VideoSpeed != "quality";

        if (useFastModel)
        {
            // ═══════════════════════════════════════════════════
            // FAST MODE: MiniMax Video-01-Live — synchronous (~30-60s)
            // Use fal.run (synchronous) instead of queue for speed
            // ═══════════════════════════════════════════════════
            object requestBody;
            if (hasReference)
            {
                requestBody = new
                {
                    prompt = fullPrompt,
                    prompt_optimizer = true,
                    first_frame_image = referenceUrl
                };
            }
            else
            {
                requestBody = new
                {
                    prompt = fullPrompt,
                    prompt_optimizer = true
                };
            }

            _logger.LogInformation("Using MiniMax Video-01-Live SYNC (fast+audio <1min), hasRef={HasRef}", hasReference);
            var startTime = DateTime.UtcNow;

            // Try synchronous endpoint first (fastest)
            var response = await SendFalRequest(
                HttpMethod.Post, "https://fal.run/fal-ai/minimax-video/video-01-live", falKey,
                new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
            );

            var responseBody = await response.Content.ReadAsStringAsync();
            var elapsed = (DateTime.UtcNow - startTime).TotalSeconds;

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Video completed synchronously in {Seconds}s", elapsed);
                var videoResult = JsonSerializer.Deserialize<FalVideoResponse>(responseBody);
                var videoUrl = videoResult?.Video?.Url;

                if (!string.IsNullOrEmpty(videoUrl))
                    return new GeneratedMedia { Url = videoUrl, Type = "video" };
            }

            _logger.LogWarning("Sync video failed ({Status}), falling back to queue. Body: {Body}",
                response.StatusCode, responseBody[..Math.Min(300, responseBody.Length)]);

            // Fallback to queue if sync fails
            return await GenerateVideoViaQueue("fal-ai/minimax-video/video-01-live", requestBody, falKey);
        }
        else
        {
            // ═══════════════════════════════════════════════════
            // QUALITY MODE: Kling via queue
            // ═══════════════════════════════════════════════════
            object requestBody;
            if (hasReference)
            {
                requestBody = new
                {
                    prompt = fullPrompt,
                    duration = "5",
                    aspect_ratio = "16:9",
                    image_url = referenceUrl
                };
            }
            else
            {
                requestBody = new
                {
                    prompt = fullPrompt,
                    duration = "5",
                    aspect_ratio = "16:9"
                };
            }

            _logger.LogInformation("Using Kling quality model via queue, hasRef={HasRef}", hasReference);
            return await GenerateVideoViaQueue("fal-ai/kling-video/v1/standard/text-to-video", requestBody, falKey);
        }
    }

    /// <summary>
    /// Queue-based video generation with polling (for quality mode or sync fallback)
    /// </summary>
    private async Task<GeneratedMedia> GenerateVideoViaQueue(string modelEndpoint, object requestBody, string falKey)
    {
        var submitResponse = await SendFalRequest(
            HttpMethod.Post, $"https://queue.fal.run/{modelEndpoint}", falKey,
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var submitBody = await submitResponse.Content.ReadAsStringAsync();
        _logger.LogInformation("FAL queue submit: {Body}", submitBody[..Math.Min(300, submitBody.Length)]);

        if (!submitResponse.IsSuccessStatusCode)
        {
            _logger.LogError("FAL queue submit error: {Status} {Body}", submitResponse.StatusCode, submitBody);
            throw new Exception("Error al iniciar generación de video. Intenta de nuevo.");
        }

        var queueResult = JsonSerializer.Deserialize<FalQueueResponse>(submitBody);
        var requestId = queueResult?.RequestId;
        var statusUrl = queueResult?.StatusUrl;
        var responseUrl = queueResult?.ResponseUrl;

        if (string.IsNullOrEmpty(requestId) || string.IsNullOrEmpty(statusUrl))
            throw new Exception("No se pudo iniciar la generación de video.");

        _logger.LogInformation("Video queued: id={RequestId}", requestId);

        // Poll aggressively — every 2 seconds for first minute, then every 4s
        var maxWait = TimeSpan.FromMinutes(5);
        var startTime = DateTime.UtcNow;

        while (DateTime.UtcNow - startTime < maxWait)
        {
            var elapsed = (DateTime.UtcNow - startTime).TotalSeconds;
            var pollInterval = elapsed < 60 ? 2000 : 4000; // Faster polling first minute
            await Task.Delay(pollInterval);

            var pollResponse = await SendFalRequest(HttpMethod.Get, statusUrl, falKey);
            var pollBody = await pollResponse.Content.ReadAsStringAsync();
            var status = JsonSerializer.Deserialize<FalQueueStatus>(pollBody);

            _logger.LogInformation("Video status {Elapsed}s: {Status}", elapsed, status?.Status ?? "unknown");

            if (status?.Status == "COMPLETED")
            {
                _logger.LogInformation("Video completed in {Seconds}s", elapsed);

                var resultUrl = responseUrl ?? statusUrl.Replace("/status", "");
                var resultResponse = await SendFalRequest(HttpMethod.Get, resultUrl, falKey);
                var resultBody = await resultResponse.Content.ReadAsStringAsync();

                if (!resultResponse.IsSuccessStatusCode)
                {
                    _logger.LogError("FAL result error: {Status} {Body}", resultResponse.StatusCode, resultBody);
                    throw new Exception("Error al obtener el video generado.");
                }

                var videoResult = JsonSerializer.Deserialize<FalVideoResponse>(resultBody);
                var videoUrl = videoResult?.Video?.Url
                    ?? throw new Exception("No se pudo obtener la URL del video.");

                return new GeneratedMedia { Url = videoUrl, Type = "video" };
            }

            if (status?.Status == "FAILED")
            {
                _logger.LogError("Video failed at {Elapsed}s: {Body}", elapsed, pollBody);
                throw new Exception("La generación de video falló. Intenta con una descripción diferente.");
            }
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

    [JsonPropertyName("response_url")]
    public string? ResponseUrl { get; set; }

    [JsonPropertyName("cancel_url")]
    public string? CancelUrl { get; set; }
}

public class FalQueueStatus
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("queue_position")]
    public int? QueuePosition { get; set; }
}
