namespace ProjectTemplate.Api.Models;

public class VoiceRequest
{
    public string Text { get; set; } = string.Empty;
    public string Language { get; set; } = "es";
    public string Gender { get; set; } = "female"; // "male" or "female"
}
