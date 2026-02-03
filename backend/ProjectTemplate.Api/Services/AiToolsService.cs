using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ProjectTemplate.Api.Models;

namespace ProjectTemplate.Api.Services;

public class AiToolsService
{
    private readonly IConfiguration _config;
    private readonly ILogger<AiToolsService> _logger;
    private readonly HttpClient _httpClient;

    public AiToolsService(IConfiguration config, ILogger<AiToolsService> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
    }

    private string GetFalKey()
    {
        var falKey = _config["FalAi:ApiKey"];
        if (string.IsNullOrEmpty(falKey) || falKey.Contains("__"))
            throw new InvalidOperationException("FAL.ai API key not configured");
        return falKey;
    }

    private void SetAuthHeader(string falKey)
    {
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falKey);
    }

    /// <summary>
    /// Remove background from an image using fal-ai/birefnet
    /// </summary>
    public async Task<AiToolResult> RemoveBackgroundAsync(RemoveBackgroundRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Removing background from image");

        var requestBody = new
        {
            image_url = request.ImageUrl,
            model = "General Use (Light)",
            operating_resolution = "1024x1024",
            output_format = "png"
        };

        SetAuthHeader(falKey);

        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/birefnet",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("FAL remove-bg error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception("Error al quitar el fondo. Intenta de nuevo.");
        }

        _logger.LogInformation("Remove background response: {Body}", responseBody[..Math.Min(500, responseBody.Length)]);

        var result = JsonSerializer.Deserialize<FalBirefnetResponse>(responseBody);
        var imageUrl = result?.Image?.Url
            ?? throw new Exception("No se pudo obtener la imagen sin fondo.");

        return new AiToolResult { Url = imageUrl, Type = "image" };
    }

    /// <summary>
    /// Upscale an image using fal-ai/aura-sr
    /// </summary>
    public async Task<AiToolResult> UpscaleAsync(UpscaleRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Upscaling image with scale {Scale}x", request.Scale);

        var requestBody = new
        {
            image_url = request.ImageUrl,
            upscaling_factor = request.Scale
        };

        SetAuthHeader(falKey);

        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/aura-sr",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("FAL upscale error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception("Error al mejorar la imagen. Intenta de nuevo.");
        }

        _logger.LogInformation("Upscale response: {Body}", responseBody[..Math.Min(500, responseBody.Length)]);

        var result = JsonSerializer.Deserialize<FalUpscaleResponse>(responseBody);
        var imageUrl = result?.Image?.Url
            ?? throw new Exception("No se pudo obtener la imagen mejorada.");

        return new AiToolResult { Url = imageUrl, Type = "image" };
    }

    /// <summary>
    /// Reimagine an image using fal-ai/flux/dev/image-to-image
    /// </summary>
    public async Task<AiToolResult> ReimagineAsync(ReimagineRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Reimagining image with prompt: {Prompt}, strength: {Strength}", request.Prompt, request.Strength);

        var requestBody = new
        {
            image_url = request.ImageUrl,
            prompt = request.Prompt,
            strength = request.Strength,
            num_inference_steps = 28,
            guidance_scale = 3.5,
            num_images = 1,
            enable_safety_checker = true
        };

        SetAuthHeader(falKey);

        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/flux/dev/image-to-image",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("FAL reimagine error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception("Error al reimaginar la imagen. Intenta de nuevo.");
        }

        _logger.LogInformation("Reimagine response: {Body}", responseBody[..Math.Min(500, responseBody.Length)]);

        var result = JsonSerializer.Deserialize<FalImageResponse>(responseBody);
        var imageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No se pudo obtener la imagen reimaginada.");

        return new AiToolResult { Url = imageUrl, Type = "image" };
    }

    /// <summary>
    /// Convert a sketch to a full image using fal-ai/flux/dev/image-to-image with high strength
    /// </summary>
    public async Task<AiToolResult> SketchToImageAsync(SketchToImageRequest request)
    {
        var falKey = GetFalKey();

        var stylePrompt = request.Style switch
        {
            "photorealistic" => "photorealistic, highly detailed, professional photography",
            "anime" => "anime style, vibrant colors, detailed illustration",
            "digital-art" => "digital art, concept art, highly detailed",
            "oil-painting" => "oil painting, classical art style, rich textures",
            "watercolor" => "watercolor painting, soft colors, artistic",
            _ => "photorealistic, highly detailed"
        };

        var fullPrompt = $"{request.Prompt}, {stylePrompt}";
        _logger.LogInformation("Sketch to image with prompt: {Prompt}", fullPrompt);

        var requestBody = new
        {
            image_url = request.ImageUrl,
            prompt = fullPrompt,
            strength = 0.85,
            num_inference_steps = 28,
            guidance_scale = 3.5,
            num_images = 1,
            enable_safety_checker = true
        };

        SetAuthHeader(falKey);

        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/flux/dev/image-to-image",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("FAL sketch-to-image error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception("Error al convertir el boceto. Intenta de nuevo.");
        }

        _logger.LogInformation("Sketch-to-image response: {Body}", responseBody[..Math.Min(500, responseBody.Length)]);

        var result = JsonSerializer.Deserialize<FalImageResponse>(responseBody);
        var imageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No se pudo obtener la imagen del boceto.");

        return new AiToolResult { Url = imageUrl, Type = "image" };
    }

    /// <summary>
    /// Retouch an image with AI using fal-ai/flux/dev/image-to-image with lower strength
    /// </summary>
    public async Task<AiToolResult> RetouchAsync(RetouchRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Retouching image with prompt: {Prompt}", request.Prompt);

        var requestBody = new
        {
            image_url = request.ImageUrl,
            prompt = request.Prompt,
            strength = 0.4,
            num_inference_steps = 28,
            guidance_scale = 3.5,
            num_images = 1,
            enable_safety_checker = true
        };

        SetAuthHeader(falKey);

        var response = await _httpClient.PostAsync(
            "https://fal.run/fal-ai/flux/dev/image-to-image",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("FAL retouch error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception("Error al retocar la imagen. Intenta de nuevo.");
        }

        _logger.LogInformation("Retouch response: {Body}", responseBody[..Math.Min(500, responseBody.Length)]);

        var result = JsonSerializer.Deserialize<FalImageResponse>(responseBody);
        var imageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No se pudo obtener la imagen retocada.");

        return new AiToolResult { Url = imageUrl, Type = "image" };
    }
}

// Response models for FAL.ai endpoints
public class FalBirefnetResponse
{
    [JsonPropertyName("image")]
    public FalSingleImage? Image { get; set; }
}

public class FalUpscaleResponse
{
    [JsonPropertyName("image")]
    public FalSingleImage? Image { get; set; }
}

public class FalSingleImage
{
    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("width")]
    public int? Width { get; set; }

    [JsonPropertyName("height")]
    public int? Height { get; set; }
}
