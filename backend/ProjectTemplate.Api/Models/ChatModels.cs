using System.Text.Json.Serialization;

namespace ProjectTemplate.Api.Models;

public class ChatMessageRequest
{
    public string Message { get; set; } = string.Empty;
    public string? ConversationId { get; set; }
    public List<string>? Attachments { get; set; }
    public List<string>? PreviousResults { get; set; }
    public List<ChatHistoryItem>? History { get; set; }
}

public class ChatHistoryItem
{
    public string Role { get; set; } = string.Empty; // "user" or "assistant"
    public string Content { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; }
}

public class ChatMessageResponse
{
    public string ConversationId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; } // "image", "video", "video_pending", null
    public string? JobId { get; set; }
    public List<string>? Suggestions { get; set; }
}

// GPT-4o structured response
public class AiDecision
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = "text_only"; // generate_image, generate_video, edit_image, text_only

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("prompt")]
    public string? Prompt { get; set; }

    [JsonPropertyName("style")]
    public string? Style { get; set; }

    [JsonPropertyName("editStrength")]
    public double? EditStrength { get; set; }

    [JsonPropertyName("videoSpeed")]
    public string? VideoSpeed { get; set; }

    [JsonPropertyName("language")]
    public string? Language { get; set; }

    [JsonPropertyName("suggestions")]
    public List<string>? Suggestions { get; set; }

    [JsonPropertyName("aspect_ratio")]
    public string? AspectRatio { get; set; }
}
