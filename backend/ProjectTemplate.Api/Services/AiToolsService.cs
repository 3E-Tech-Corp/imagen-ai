using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
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
    /// Upload base64 images to FAL storage so all FAL APIs can use them.
    /// Uses FAL's storage/upload/initiate endpoint.
    /// </summary>
    private async Task<string> UploadToFalStorage(string base64DataUrl, string falKey)
    {
        // Extract mime type and base64 data
        var match = Regex.Match(base64DataUrl, @"data:([^;]+);base64,(.+)");
        if (!match.Success)
            throw new ArgumentException("Formato de imagen base64 inválido.");

        var mimeType = match.Groups[1].Value;
        var base64Data = match.Groups[2].Value;
        var imageBytes = Convert.FromBase64String(base64Data);

        var ext = mimeType switch
        {
            "image/jpeg" => "jpg",
            "image/jpg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            "image/gif" => "gif",
            _ => "png"
        };

        var fileName = $"upload-{Guid.NewGuid():N}.{ext}";

        _logger.LogInformation("Uploading {Size} bytes to FAL storage as {FileName}", imageBytes.Length, fileName);

        // Step 1: Initiate upload to get presigned URL
        SetAuthHeader(falKey);
        var initiateBody = new { file_name = fileName, content_type = mimeType };
        var initiateResponse = await _httpClient.PostAsync(
            "https://rest.alpha.fal.ai/storage/upload/initiate",
            new StringContent(JsonSerializer.Serialize(initiateBody), Encoding.UTF8, "application/json")
        );

        var initiateJson = await initiateResponse.Content.ReadAsStringAsync();
        _logger.LogInformation("FAL storage initiate response: {Status} {Body}",
            initiateResponse.StatusCode, initiateJson[..Math.Min(300, initiateJson.Length)]);

        if (!initiateResponse.IsSuccessStatusCode)
            throw new Exception($"Error al subir imagen a storage: {initiateResponse.StatusCode}");

        var initiateResult = JsonSerializer.Deserialize<FalStorageInitiate>(initiateJson);

        if (string.IsNullOrEmpty(initiateResult?.FileUrl))
            throw new Exception("No se pudo obtener URL de storage.");

        // Step 2: Upload the actual file bytes to the upload URL
        var uploadUrl = initiateResult.UploadUrl ?? initiateResult.FileUrl;

        using var uploadContent = new ByteArrayContent(imageBytes);
        uploadContent.Headers.ContentType = new MediaTypeHeaderValue(mimeType);

        var uploadResponse = await _httpClient.PutAsync(uploadUrl, uploadContent);

        if (!uploadResponse.IsSuccessStatusCode)
        {
            _logger.LogWarning("PUT upload failed ({Status}), trying POST...", uploadResponse.StatusCode);
            uploadResponse = await _httpClient.PostAsync(uploadUrl, uploadContent);
        }

        _logger.LogInformation("FAL storage upload result: {Status}", uploadResponse.StatusCode);

        // The file_url from initiate is the permanent URL
        return initiateResult.FileUrl;
    }

    /// <summary>
    /// Ensure we have a proper URL (not base64). Upload to FAL storage if needed.
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
            return await UploadToFalStorage(imageUrlOrBase64, falKey);
        }

        throw new ArgumentException("Formato de imagen no soportado. Usa una URL o sube un archivo.");
    }

    /// <summary>
    /// Call a FAL API synchronously (with built-in retry for slow models).
    /// For slow models like aura-sr, uses queue API with polling.
    /// </summary>
    private async Task<string> CallFalApiWithQueue(string model, object requestBody, string falKey, int maxWaitSeconds = 120)
    {
        SetAuthHeader(falKey);

        // Submit to queue
        var submitResponse = await _httpClient.PostAsync(
            $"https://queue.fal.run/{model}",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var submitBody = await submitResponse.Content.ReadAsStringAsync();

        if (!submitResponse.IsSuccessStatusCode)
        {
            _logger.LogError("FAL queue submit error for {Model}: {Status} {Body}",
                model, submitResponse.StatusCode, submitBody);
            throw new Exception($"Error al procesar la imagen: {submitBody}");
        }

        var queueResult = JsonSerializer.Deserialize<FalQueueResponse>(submitBody);
        if (string.IsNullOrEmpty(queueResult?.StatusUrl))
            throw new Exception("No se pudo iniciar el procesamiento.");

        _logger.LogInformation("FAL queue submitted for {Model}: requestId={RequestId}",
            model, queueResult.RequestId);

        // Poll for completion
        var startTime = DateTime.UtcNow;
        while ((DateTime.UtcNow - startTime).TotalSeconds < maxWaitSeconds)
        {
            await Task.Delay(3000);

            SetAuthHeader(falKey);
            var statusResponse = await _httpClient.GetAsync(queueResult.StatusUrl);
            var statusBody = await statusResponse.Content.ReadAsStringAsync();
            var status = JsonSerializer.Deserialize<FalQueueStatus>(statusBody);

            _logger.LogInformation("FAL queue status for {Model}: {Status} (elapsed: {Elapsed}s)",
                model, status?.Status, (DateTime.UtcNow - startTime).TotalSeconds);

            if (status?.Status == "COMPLETED")
            {
                // Get the result
                SetAuthHeader(falKey);
                var responseUrl = queueResult.ResponseUrl ?? queueResult.StatusUrl.Replace("/status", "");
                var resultResponse = await _httpClient.GetAsync(responseUrl);
                var resultBody = await resultResponse.Content.ReadAsStringAsync();

                if (!resultResponse.IsSuccessStatusCode)
                    throw new Exception("Error al obtener el resultado.");

                return resultBody;
            }

            if (status?.Status == "FAILED")
            {
                _logger.LogError("FAL processing failed for {Model}: {Body}", model, statusBody);
                throw new Exception("El procesamiento de la imagen falló. Intenta con otra imagen.");
            }
        }

        throw new Exception("El procesamiento tardó demasiado. Intenta con una imagen más pequeña.");
    }

    /// <summary>
    /// Call a FAL API synchronously (direct, for fast models).
    /// </summary>
    private async Task<string> CallFalApiDirect(string model, object requestBody, string falKey)
    {
        SetAuthHeader(falKey);

        var response = await _httpClient.PostAsync(
            $"https://fal.run/{model}",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("FAL API error for {Model}: {Status} {Body}",
                model, response.StatusCode, responseBody);
            throw new Exception($"Error al procesar la imagen. Intenta de nuevo.");
        }

        return responseBody;
    }

    /// <summary>
    /// Remove background from an image using fal-ai/birefnet
    /// </summary>
    public async Task<AiToolResult> RemoveBackgroundAsync(RemoveBackgroundRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Removing background from image");

        var imageUrl = await EnsureImageUrl(request.ImageUrl, falKey);
        _logger.LogInformation("Image URL for remove-bg: {Url}", imageUrl[..Math.Min(100, imageUrl.Length)]);

        var requestBody = new
        {
            image_url = imageUrl,
            model = "General Use (Light)",
            operating_resolution = "1024x1024",
            output_format = "png"
        };

        var responseBody = await CallFalApiDirect("fal-ai/birefnet", requestBody, falKey);

        var result = JsonSerializer.Deserialize<FalBirefnetResponse>(responseBody);
        var resultImageUrl = result?.Image?.Url
            ?? throw new Exception("No se pudo obtener la imagen sin fondo.");

        return new AiToolResult { Url = resultImageUrl, Type = "image" };
    }

    /// <summary>
    /// Upscale an image using fal-ai/aura-sr (uses queue API since it can be slow)
    /// </summary>
    public async Task<AiToolResult> UpscaleAsync(UpscaleRequest request)
    {
        var falKey = GetFalKey();
        _logger.LogInformation("Upscaling image with scale {Scale}x", request.Scale);

        var imageUrl = await EnsureImageUrl(request.ImageUrl, falKey);
        _logger.LogInformation("Image URL for upscale: {Url}", imageUrl[..Math.Min(100, imageUrl.Length)]);

        var requestBody = new
        {
            image_url = imageUrl
        };

        // Use queue API for aura-sr since it can be slow
        var responseBody = await CallFalApiWithQueue("fal-ai/aura-sr", requestBody, falKey);

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
        _logger.LogInformation("Reimagining image with prompt: {Prompt}, strength: {Strength}",
            request.Prompt, request.Strength);

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

        var responseBody = await CallFalApiDirect("fal-ai/flux/dev/image-to-image", requestBody, falKey);

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

        var responseBody = await CallFalApiDirect("fal-ai/flux/dev/image-to-image", requestBody, falKey);

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

        var responseBody = await CallFalApiDirect("fal-ai/flux/dev/image-to-image", requestBody, falKey);

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

public class FalStorageInitiate
{
    [JsonPropertyName("file_url")]
    public string? FileUrl { get; set; }

    [JsonPropertyName("upload_url")]
    public string? UploadUrl { get; set; }
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
