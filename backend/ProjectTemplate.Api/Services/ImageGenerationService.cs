using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

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
        _httpClient = new HttpClient();
    }

    /// <summary>
    /// Generate an image using FAL.ai Flux API
    /// </summary>
    public async Task<GeneratedMedia> GenerateImageAsync(string prompt, string style, string? negativePrompt)
    {
        var falKey = _config["FalAi:ApiKey"];
        if (string.IsNullOrEmpty(falKey))
            throw new InvalidOperationException("FAL.ai API key not configured");

        var stylePrompt = style switch
        {
            "photographic" => $"A highly detailed photographic image of {prompt}, professional photography, 8K resolution, sharp focus",
            "realistic" => $"Hyper-realistic depiction of {prompt}, extremely detailed, lifelike, cinematic lighting",
            "artistic" => $"An artistic painting of {prompt}, masterful brushwork, vibrant colors, gallery quality",
            "anime" => $"Anime style illustration of {prompt}, detailed anime art, vibrant colors, studio quality",
            "3d-render" => $"3D rendered scene of {prompt}, octane render, volumetric lighting, highly detailed",
            _ => prompt
        };

        var fullNegative = string.IsNullOrEmpty(negativePrompt)
            ? "blurry, low quality, distorted, deformed, watermark, text, bad anatomy"
            : $"{negativePrompt}, blurry, low quality, distorted, deformed, watermark, text";

        var requestBody = new
        {
            prompt = stylePrompt,
            negative_prompt = fullNegative,
            image_size = "square_hd",
            num_inference_steps = 28,
            guidance_scale = 3.5,
            num_images = 1,
            enable_safety_checker = true
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/flux/dev",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();
        _logger.LogInformation("FAL.ai response: {Status} {Body}", response.StatusCode, responseBody);

        if (!response.IsSuccessStatusCode)
            throw new Exception($"FAL.ai API error: {response.StatusCode} - {responseBody}");

        var result = JsonSerializer.Deserialize<FalImageResponse>(responseBody);
        var imageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No image URL in response");

        return new GeneratedMedia { Url = imageUrl, Type = "image" };
    }

    /// <summary>
    /// Generate a video using FAL.ai Kling API
    /// </summary>
    public async Task<GeneratedMedia> GenerateVideoAsync(string prompt, string style, string? negativePrompt)
    {
        var falKey = _config["FalAi:ApiKey"];
        if (string.IsNullOrEmpty(falKey))
            throw new InvalidOperationException("FAL.ai API key not configured");

        var stylePrompt = style switch
        {
            "photographic" => $"Photorealistic video of {prompt}, cinematic quality, smooth motion, 4K",
            "realistic" => $"Hyper-realistic video of {prompt}, natural movement, lifelike detail",
            "artistic" => $"Artistic animation of {prompt}, beautiful visual style, smooth motion",
            "anime" => $"Anime-style animation of {prompt}, fluid motion, vibrant colors",
            "3d-render" => $"3D animated video of {prompt}, cinematic rendering, smooth camera movement",
            _ => prompt
        };

        var requestBody = new
        {
            prompt = stylePrompt,
            duration = "5",
            aspect_ratio = "1:1"
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);

        // Submit the video generation request
        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/kling-video/v1/standard/text-to-video",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();
        _logger.LogInformation("FAL.ai video response: {Status} {Body}", response.StatusCode, responseBody);

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

// FAL.ai response models
public class FalImageResponse
{
    [JsonPropertyName("images")]
    public List<FalImage>? Images { get; set; }
}

public class FalImage
{
    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("width")]
    public int Width { get; set; }

    [JsonPropertyName("height")]
    public int Height { get; set; }
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
