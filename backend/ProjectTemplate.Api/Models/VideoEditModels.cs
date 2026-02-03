namespace ProjectTemplate.Api.Models;

public class VideoEditRequest
{
    public string VideoUrl { get; set; } = string.Empty;
    public string VideoId { get; set; } = string.Empty;
    public double TrimStart { get; set; }
    public double TrimEnd { get; set; }
    public double Speed { get; set; } = 1;
    public string Filter { get; set; } = "none";
    public TextOverlayRequest? TextOverlay { get; set; }
    public VoiceoverRequest? Voiceover { get; set; }
}

public class TextOverlayRequest
{
    public string Text { get; set; } = string.Empty;
    public string Position { get; set; } = "bottom"; // top, center, bottom
    public int FontSize { get; set; } = 24;
    public string Color { get; set; } = "#ffffff";
}

public class VoiceoverRequest
{
    public string Text { get; set; } = string.Empty;
    public string Language { get; set; } = "es";
    public string Gender { get; set; } = "female";
}
