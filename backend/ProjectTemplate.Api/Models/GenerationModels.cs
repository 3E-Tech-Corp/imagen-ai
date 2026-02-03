namespace ProjectTemplate.Api.Models;

public class GenerationRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string Type { get; set; } = "image"; // "image" or "video"
    public string Style { get; set; } = "photographic";
    public string? NegativePrompt { get; set; }
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
