namespace ProjectTemplate.Api.Models;

public class RemoveBackgroundRequest
{
    public string ImageUrl { get; set; } = string.Empty;
}

public class UpscaleRequest
{
    public string ImageUrl { get; set; } = string.Empty;
    public int Scale { get; set; } = 2;
}

public class ReimagineRequest
{
    public string ImageUrl { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public double Strength { get; set; } = 0.75;
}

public class SketchToImageRequest
{
    public string ImageUrl { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string Style { get; set; } = "photorealistic";
}

public class RetouchRequest
{
    public string ImageUrl { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
}

public class LipSyncRequest
{
    public string ImageUrl { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Language { get; set; } = "es";
    public string Gender { get; set; } = "female";
}

public class AiToolResult
{
    public string Url { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}
