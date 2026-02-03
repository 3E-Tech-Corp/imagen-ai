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
    /// If the image is a base64 data URL, upload it to FAL storage first.
    /// FAL.ai APIs work better with actual URLs than with large base64 strings.
    /// </summary>
    private async Task<string> EnsureImageUrl(string imageUrlOrBase64, string falKey)
    {
        if (string.IsNullOrEmpty(imageUrlOrBase64))
            throw new ArgumentException("Se requiere una imagen.");

        // If it's already a URL, return as-is
        if (imageUrlOrBase64.StartsWith("http://") || imageUrlOrBase64.StartsWith("https://"))
            return imageUrlOrBase64;

        // If it's a data URL, upload to FAL storage
        if (imageUrlOrBase64.StartsWith("data:"))
        {
            _logger.LogInformation("Uploading base64 image to FAL storage...");

            // Extract the base64 content and mime type
            var parts = imageUrlOrBase64.Split(',');
            if (parts.Length != 2)
                throw new ArgumentException("Formato de imagen inválido.");

            var mimeMatch = System.Text.RegularExpressions.Regex.Match(parts[0], @"data:([^;]+)");
            var mimeType = mimeMatch.Success ? mimeMatch.Groups[1].Value : "image/png";
            var base64Data = parts[1];
            var imageBytes = Convert.FromBase64String(base64Data);

            var ext = mimeType switch
            {
                "image/jpeg" => "jpg",
                "image/png" => "png",
                "image/webp" => "webp",
                "image/gif" => "gif",
                _ => "png"
            };

            SetAuthHeader(falKey);

            var content = new ByteArrayContent(imageBytes);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);

            var uploadResponse = await _httpClient.PostAsync(
                $"https://fal.run/fal-ai/flux/dev?fal_file=true",
                content
            );

            // Try alternative upload method - just use the data URL directly
            // Some FAL endpoints accept data URLs
            if (!uploadResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("FAL storage upload failed, using data URL directly");
                return imageUrlOrBase64;
            }

            var uploadBody = await uploadResponse.Content.ReadAsStringAsync();
            var uploadResult = JsonSerializer.Deserialize<FalUploadResult>(uploadBody);

            if (!string.IsNullOrEmpty(uploadResult?.Url))
            {
                _logger.LogInformation("Image uploaded to FAL: {Url}", uploadResult.Url);
                return uploadResult.Url;
            }

            // Fallback to data URL
            return imageUrlOrBase64;
        }

        return imageUrlOrBase64;
    }

    /// <summary>
    /// Remove background from an image using fal-ai/birefnet
    /// </summary>
    public async Task<AiToolResult> RemoveBackgroundAsync(RemoveBackgroundRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Removing background from image");

        var imageUrl = await EnsureImageUrl(request.ImageUrl, falKey);

        var requestBody = new
        {
            image_url = imageUrl,
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
        var resultImageUrl = result?.Image?.Url
            ?? throw new Exception("No se pudo obtener la imagen sin fondo.");

        return new AiToolResult { Url = resultImageUrl, Type = "image" };
    }

    /// <summary>
    /// Upscale an image using fal-ai/aura-sr
    /// </summary>
    public async Task<AiToolResult> UpscaleAsync(UpscaleRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Upscaling image with scale {Scale}x", request.Scale);

        var imageUrl = await EnsureImageUrl(request.ImageUrl, falKey);

        // aura-sr always upscales 4x, it only needs image_url
        var requestBody = new
        {
            image_url = imageUrl
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
        var resultImageUrl = result?.Image?.Url
            ?? throw new Exception("No se pudo obtener la imagen mejorada.");

        return new AiToolResult { Url = resultImageUrl, Type = "image" };
    }

    /// <summary>
    /// Reimagine an image using fal-ai/flux/dev/image-to-image
    /// </summary>
    public async Task<AiToolResult> ReimagineAsync(ReimagineRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Reimagining image with prompt: {Prompt}, strength: {Strength}", request.Prompt, request.Strength);

        var imageUrl = await EnsureImageUrl(request.ImageUrl, falKey);

        var requestBody = new
        {
            image_url = imageUrl,
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
        var resultImageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No se pudo obtener la imagen reimaginada.");

        return new AiToolResult { Url = resultImageUrl, Type = "image" };
    }

    /// <summary>
    /// Convert a sketch to a full image using fal-ai/flux/dev/image-to-image with high strength
    /// </summary>
    public async Task<AiToolResult> SketchToImageAsync(SketchToImageRequest request)
    {
        var falKey = GetFalKey();
        var imageUrl = await EnsureImageUrl(request.ImageUrl, falKey);

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
            image_url = imageUrl,
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
        var resultImageUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No se pudo obtener la imagen del boceto.");

        return new AiToolResult { Url = resultImageUrl, Type = "image" };
    }

    /// <summary>
    /// Retouch an image with AI using fal-ai/flux/dev/image-to-image with lower strength
    /// </summary>
    public async Task<AiToolResult> RetouchAsync(RetouchRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Retouching image with prompt: {Prompt}", request.Prompt);

        var imageUrl = await EnsureImageUrl(request.ImageUrl, falKey);

        var requestBody = new
        {
            image_url = imageUrl,
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
        var retouchUrl = result?.Images?.FirstOrDefault()?.Url
            ?? throw new Exception("No se pudo obtener la imagen retocada.");

        return new AiToolResult { Url = retouchUrl, Type = "image" };
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

public class FalUploadResult
{
    [JsonPropertyName("url")]
    public string? Url { get; set; }
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
