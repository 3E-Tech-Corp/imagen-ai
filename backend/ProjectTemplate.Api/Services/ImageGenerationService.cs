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
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
    }

    public async Task<GeneratedMedia> GenerateImageAsync(GenerationRequest request)
    {
        var falKey = _config["FalAi:ApiKey"];
        if (string.IsNullOrEmpty(falKey))
            throw new InvalidOperationException("FAL.ai API key not configured. Set __FAL_API_KEY__ in appsettings.json");

        var fullPrompt = PromptBuilder.BuildImagePrompt(
            request.Prompt, request.Style, request.Environment,
            request.TimePeriod, request.Lighting, request.Emotion, request.Quality);

        var negativePrompt = PromptBuilder.BuildNegativePrompt(request.NegativePrompt);

        // Use best resolution based on quality setting
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
            throw new Exception($"FAL.ai API error: {response.StatusCode} - {responseBody}");

        var result = JsonSerializer.Deserialize<FalImageResponse>(responseBody);
        var imageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No image URL in response");

        return new GeneratedMedia { Url = imageUrl, Type = "image" };
    }

    public async Task<GeneratedMedia> GenerateVideoAsync(GenerationRequest request)
    {
        var falKey = _config["FalAi:ApiKey"];
        if (string.IsNullOrEmpty(falKey))
            throw new InvalidOperationException("FAL.ai API key not configured. Set __FAL_API_KEY__ in appsettings.json");

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

        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/kling-video/v1/standard/text-to-video",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new Exception($"FAL.ai API error: {response.StatusCode} - {responseBody}");

        var result = JsonSerializer.Deserialize<FalVideoResponse>(responseBody);
        var videoUrl = result?.Video?.Url
            ?? throw new Exception("No video URL in response");

        return new GeneratedMedia { Url = videoUrl, Type = "video" };
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
