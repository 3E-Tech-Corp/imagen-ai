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

        // Check if we have reference images for image-to-image generation
        var hasReference = request.ReferenceImages?.Any(r => !string.IsNullOrEmpty(r)) == true;
        string endpoint;
        string requestJson;

        if (hasReference)
        {
            // Use image-to-image endpoint with the first reference
            endpoint = "https://fal.run/fal-ai/flux/dev/image-to-image";
            var referenceUrl = request.ReferenceImages!.First(r => !string.IsNullOrEmpty(r));

            var i2iBody = new
            {
                prompt = fullPrompt,
                image_url = referenceUrl,
                strength = 0.65,
                image_size = imageSize,
                num_inference_steps = 28,
                guidance_scale = 3.5,
                num_images = 1,
                enable_safety_checker = true
            };
            requestJson = JsonSerializer.Serialize(i2iBody);
            _logger.LogInformation("Image-to-image prompt: {Prompt} (with reference)", fullPrompt);
        }
        else
        {
            // Standard text-to-image
            endpoint = "https://fal.run/fal-ai/flux/dev";
            var t2iBody = new
            {
                prompt = fullPrompt,
                negative_prompt = negativePrompt,
                image_size = imageSize,
                num_inference_steps = 28,
                guidance_scale = 3.5,
                num_images = 1,
                enable_safety_checker = true
            };
            requestJson = JsonSerializer.Serialize(t2iBody);
            _logger.LogInformation("Image prompt: {Prompt}", fullPrompt);
        }

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

        var response = await _httpClient.PostAsync(
            endpoint,
            new StringContent(requestJson, Encoding.UTF8, "application/json")
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
    /// Generate video using FAL's async queue API.
    /// Fast mode: MiniMax Hailuo Live (~30-60s)
    /// Quality mode: Kling (~3-5min)
    /// </summary>
    public async Task<GeneratedMedia> GenerateVideoAsync(GenerationRequest request)
    {
        var falKey = GetFalKey();

        var fullPrompt = PromptBuilder.BuildVideoPrompt(
            request.Prompt, request.Style, request.Environment,
            request.TimePeriod, request.Lighting, request.Emotion, request.Quality);

        _logger.LogInformation("Video prompt: {Prompt}", fullPrompt);

        // Check if we have reference images for image-to-video
        var hasReference = request.ReferenceImages?.Any(r => !string.IsNullOrEmpty(r)) == true;
        var referenceUrl = hasReference ? request.ReferenceImages!.First(r => !string.IsNullOrEmpty(r)) : null;

        // Choose model based on speed preference
        var useFastModel = request.VideoSpeed != "quality";
        string modelEndpoint;
        object requestBody;

        if (useFastModel)
        {
            // MiniMax Hailuo Live — fast, ~30-60 seconds
            modelEndpoint = "fal-ai/minimax-video/video-01-live";
            if (hasReference)
            {
                requestBody = new
                {
                    prompt = fullPrompt,
                    prompt_optimizer = true,
                    first_frame_image = referenceUrl
                };
                _logger.LogInformation("Using FAST model: MiniMax Hailuo Live (with reference image)");
            }
            else
            {
                requestBody = new
                {
                    prompt = fullPrompt,
                    prompt_optimizer = true
                };
                _logger.LogInformation("Using FAST model: MiniMax Hailuo Live");
            }
        }
        else
        {
            // Kling — high quality, 3-5 minutes
            modelEndpoint = "fal-ai/kling-video/v1/standard/text-to-video";
            if (hasReference)
            {
                requestBody = new
                {
                    prompt = fullPrompt,
                    duration = "5",
                    aspect_ratio = "16:9",
                    image_url = referenceUrl
                };
                _logger.LogInformation("Using QUALITY model: Kling (with reference image)");
            }
            else
            {
                requestBody = new
                {
                    prompt = fullPrompt,
                    duration = "5",
                    aspect_ratio = "16:9"
                };
                _logger.LogInformation("Using QUALITY model: Kling");
            }
        }

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

        // Step 1: Submit to queue
        _logger.LogInformation("Submitting video to FAL queue ({Model})...", modelEndpoint);
        var submitResponse = await _httpClient.PostAsync(
            $"https://queue.fal.run/{modelEndpoint}",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var submitBody = await submitResponse.Content.ReadAsStringAsync();
        _logger.LogInformation("FAL queue submit response: {Body}", submitBody);

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

        _logger.LogInformation("Video queued: request_id={RequestId}, status_url={StatusUrl}, response_url={ResponseUrl}",
            requestId, statusUrl, responseUrl);

        // Step 2: Poll status URL for completion (max ~8 minutes)
        var maxWait = TimeSpan.FromMinutes(8);
        var pollInterval = TimeSpan.FromSeconds(5);
        var startTime = DateTime.UtcNow;

        while (DateTime.UtcNow - startTime < maxWait)
        {
            await Task.Delay(pollInterval);

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

            var pollResponse = await _httpClient.GetAsync(statusUrl);
            var pollBody = await pollResponse.Content.ReadAsStringAsync();

            var status = JsonSerializer.Deserialize<FalQueueStatus>(pollBody);
            var elapsed = (DateTime.UtcNow - startTime).TotalSeconds;

            _logger.LogInformation("Video status after {Elapsed}s: {Status} (queue_position: {Pos})",
                elapsed, status?.Status ?? "unknown", status?.QueuePosition);

            if (status?.Status == "COMPLETED")
            {
                _logger.LogInformation("Video generation completed after {Seconds}s", elapsed);

                // Step 3: Get the result from response URL
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

                var resultUrl = responseUrl ?? statusUrl.Replace("/status", "");
                var resultResponse = await _httpClient.GetAsync(resultUrl);
                var resultBody = await resultResponse.Content.ReadAsStringAsync();

                _logger.LogInformation("FAL result response: {Body}", resultBody[..Math.Min(500, resultBody.Length)]);

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
                _logger.LogError("Video generation failed after {Elapsed}s: {Body}", elapsed, pollBody);
                throw new Exception("La generación de video falló. Intenta con una descripción diferente.");
            }

            // IN_QUEUE or IN_PROGRESS — keep polling
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
