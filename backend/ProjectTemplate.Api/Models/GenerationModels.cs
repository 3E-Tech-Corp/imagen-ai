namespace ProjectTemplate.Api.Models;

public class GenerationRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string Type { get; set; } = "image"; // "image" or "video"
    public string Style { get; set; } = "photorealistic";
    public string Environment { get; set; } = "any";
    public string TimePeriod { get; set; } = "any";
    public string Lighting { get; set; } = "any";
    public string Emotion { get; set; } = "any";
    public string Quality { get; set; } = "ultra";
    public string UseCase { get; set; } = "any";
    public string? NegativePrompt { get; set; }
    public string VideoSpeed { get; set; } = "fast"; // "fast" (MiniMax ~30s) or "quality" (Kling ~3-5min)
    public List<string>? ReferenceImages { get; set; }
}

public class GenerationResponse
{
    public string Id { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Style { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string Status { get; set; } = "completed";
    public string? Error { get; set; }
}
