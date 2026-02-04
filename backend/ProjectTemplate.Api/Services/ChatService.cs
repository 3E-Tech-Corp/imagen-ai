using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ProjectTemplate.Api.Models;

namespace ProjectTemplate.Api.Services;

public class ChatService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ChatService> _logger;
    private readonly ImageGenerationService _imageService;
    private readonly VideoJobService _videoJobService;
    private readonly ProjectService _projectService;
    private readonly HttpClient _httpClient;

    private const string SystemPrompt = @"Eres un asistente creativo de IA que ayuda a crear imágenes y videos increíbles. 
Respondes siempre en español con entusiasmo y calidez.
Cuando el usuario pide crear algo, analiza su petición y responde con un JSON estructurado.
Mantén contexto de la conversación - si el usuario dice ""hazla más roja"" o ""cambia el fondo"", entiende que se refiere a la última imagen/video generado.
Si el usuario sube una imagen de referencia o hay una imagen previa en la conversación, úsala como base para ediciones.
Mejora los prompts del usuario para obtener mejores resultados con los modelos de IA, pero respeta su intención original.
Traduce siempre el prompt a inglés para los modelos de generación, ya que funcionan mejor en inglés.

Acciones disponibles:
- generate_image: Crear una nueva imagen desde cero
- generate_video: Crear un video (desde texto o desde una imagen existente)
- edit_image: Modificar una imagen existente (cambiar colores, estilo, elementos, etc.)
- text_only: Solo responder con texto (para preguntas, saludos, explicaciones)

Responde SIEMPRE con JSON válido (sin markdown, sin ```json):
{
  ""action"": ""generate_image"",
  ""message"": ""Tu mensaje al usuario en español, cálido y entusiasta"",
  ""prompt"": ""Detailed English prompt for the AI model (only if action is not text_only)"",
  ""style"": ""photorealistic"",
  ""editStrength"": 0.65,
  ""videoSpeed"": ""fast"",
  ""suggestions"": [""Sugerencia 1"", ""Sugerencia 2"", ""Sugerencia 3""]
}

Para edit_image, editStrength controla cuánto cambiar (0.3=sutil, 0.5=moderado, 0.8=drástico).
Para generate_video, videoSpeed puede ser ""fast"" (rápido, ~1min) o ""quality"" (alta calidad, ~3-5min).
styles: photorealistic, realistic, cinematic, anime, digital-art, watercolor, oil-painting, pencil-drawing, 3d-render, pixar-3d
Siempre incluye 3 sugerencias relevantes para continuar la conversación creativa.";

    public ChatService(
        IConfiguration config,
        ILogger<ChatService> logger,
        ImageGenerationService imageService,
        VideoJobService videoJobService,
        ProjectService projectService)
    {
        _config = config;
        _logger = logger;
        _imageService = imageService;
        _videoJobService = videoJobService;
        _projectService = projectService;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(2) };
    }

    public async Task<ChatMessageResponse> ProcessMessageAsync(ChatMessageRequest request)
    {
        var conversationId = request.ConversationId ?? Guid.NewGuid().ToString();

        // Step 1: Get AI decision from OpenAI
        var decision = await GetAiDecisionAsync(request);

        _logger.LogInformation("AI decision: action={Action}, prompt={Prompt}",
            decision.Action, decision.Prompt?[..Math.Min(80, decision.Prompt?.Length ?? 0)]);

        // Step 2: Execute the action
        var response = new ChatMessageResponse
        {
            ConversationId = conversationId,
            Message = decision.Message,
            Suggestions = decision.Suggestions ?? new List<string> { "Crear otra imagen", "Hacer un video", "Cambiar el estilo" }
        };

        try
        {
            switch (decision.Action)
            {
                case "generate_image":
                    await HandleGenerateImage(decision, request, response);
                    break;

                case "generate_video":
                    await HandleGenerateVideo(decision, request, response);
                    break;

                case "edit_image":
                    await HandleEditImage(decision, request, response);
                    break;

                case "text_only":
                default:
                    // Just text response, no media
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing action {Action}", decision.Action);
            response.Message = $"{decision.Message}\n\n⚠️ Hubo un problema al procesar tu solicitud: {ex.Message}";
        }

        return response;
    }

    private async Task HandleGenerateImage(AiDecision decision, ChatMessageRequest request, ChatMessageResponse response)
    {
        var genRequest = new GenerationRequest
        {
            Prompt = decision.Prompt ?? request.Message,
            Type = "image",
            Style = decision.Style ?? "photorealistic",
            Quality = "ultra"
        };

        // If there are attachments, use them as reference
        if (request.Attachments?.Any() == true)
        {
            genRequest.ReferenceImages = request.Attachments;
        }

        var media = await _imageService.GenerateImageAsync(genRequest);
        response.MediaUrl = media.Url;
        response.MediaType = "image";

        // Auto-save to "Mis Creaciones" project
        _ = _projectService.AutoSaveAsync("image", decision.Prompt ?? request.Message, media.Url, decision.Style ?? "photorealistic");
    }

    private Task HandleGenerateVideo(AiDecision decision, ChatMessageRequest request, ChatMessageResponse response)
    {
        var genRequest = new GenerationRequest
        {
            Prompt = decision.Prompt ?? request.Message,
            Type = "video",
            Style = decision.Style ?? "cinematic",
            VideoSpeed = decision.VideoSpeed ?? "fast"
        };

        // Use previous results or attachments as reference for image-to-video
        if (request.PreviousResults?.Any() == true)
        {
            genRequest.ReferenceImages = request.PreviousResults;
        }
        else if (request.Attachments?.Any() == true)
        {
            genRequest.ReferenceImages = request.Attachments;
        }

        // Create async job (videos take too long for synchronous response)
        var job = _videoJobService.CreateJob(genRequest.Prompt, genRequest.Style);

        // Fire-and-forget with auto-save
        var projectService = _projectService;
        var prompt = decision.Prompt ?? request.Message;
        var style = decision.Style ?? "cinematic";
        _ = Task.Run(async () =>
        {
            try
            {
                var media = await _imageService.GenerateVideoAsync(genRequest);
                _videoJobService.CompleteJob(job.Id, media.Url);
                
                // Auto-save video to "Mis Creaciones"
                await projectService.AutoSaveAsync("video", prompt, media.Url, style);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background video generation failed for chat job {JobId}", job.Id);
                _videoJobService.FailJob(job.Id, ex.Message);
            }
        });

        response.MediaType = "video_pending";
        response.JobId = job.Id;
        response.Message += "\n\n⏳ Tu video se está generando. Te avisaré cuando esté listo...";

        return Task.CompletedTask;
    }

    private async Task HandleEditImage(AiDecision decision, ChatMessageRequest request, ChatMessageResponse response)
    {
        // Find the image to edit: first from previousResults, then from attachments
        string? imageToEdit = request.PreviousResults?.LastOrDefault()
            ?? request.Attachments?.FirstOrDefault();

        if (string.IsNullOrEmpty(imageToEdit))
        {
            response.Message = "No encontré una imagen para editar. Por favor sube una imagen o genera una primero.";
            return;
        }

        var genRequest = new GenerationRequest
        {
            Prompt = decision.Prompt ?? request.Message,
            Type = "image",
            Style = decision.Style ?? "photorealistic",
            Quality = "ultra",
            ReferenceImages = new List<string> { imageToEdit }
        };

        var media = await _imageService.GenerateImageAsync(genRequest);
        response.MediaUrl = media.Url;
        response.MediaType = "image";

        // Auto-save edited image to "Mis Creaciones"
        _ = _projectService.AutoSaveAsync("image", decision.Prompt ?? request.Message, media.Url, decision.Style ?? "photorealistic");
    }

    private async Task<AiDecision> GetAiDecisionAsync(ChatMessageRequest request)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("__"))
            throw new InvalidOperationException("OpenAI API key not configured");

        // Build conversation messages for context
        var messages = new List<object>();
        messages.Add(new { role = "system", content = SystemPrompt });

        // Add conversation history (last 10 messages for context)
        if (request.History != null)
        {
            var recentHistory = request.History.TakeLast(10);
            foreach (var item in recentHistory)
            {
                var historyContent = item.Content;
                if (!string.IsNullOrEmpty(item.MediaUrl))
                {
                    historyContent += $"\n[Se generó {item.MediaType}: {item.MediaUrl}]";
                }
                messages.Add(new { role = item.Role, content = historyContent });
            }
        }

        // Add context about available previous results
        var userMessage = request.Message;
        if (request.PreviousResults?.Any() == true)
        {
            userMessage += $"\n\n[Contexto: La última imagen/video generado es: {request.PreviousResults.Last()}]";
        }
        if (request.Attachments?.Any() == true)
        {
            userMessage += $"\n\n[El usuario adjuntó {request.Attachments.Count} imagen(es) como referencia]";
        }

        messages.Add(new { role = "user", content = userMessage });

        var requestBody = new
        {
            model = "gpt-4o",
            messages,
            temperature = 0.7,
            max_tokens = 800
        };

        var json = JsonSerializer.Serialize(requestBody);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI API error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception("Error al comunicarse con la IA. Intenta de nuevo.");
        }

        var result = JsonSerializer.Deserialize<OpenAiChatResponse>(responseBody);
        var content = result?.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrEmpty(content))
            throw new Exception("La IA no generó una respuesta. Intenta de nuevo.");

        _logger.LogInformation("GPT-4o raw response: {Content}", content[..Math.Min(300, content.Length)]);

        // Parse the JSON response from GPT-4o
        // Strip markdown code blocks if present
        content = content.Trim();
        if (content.StartsWith("```json"))
            content = content[7..];
        else if (content.StartsWith("```"))
            content = content[3..];
        if (content.EndsWith("```"))
            content = content[..^3];
        content = content.Trim();

        try
        {
            var decision = JsonSerializer.Deserialize<AiDecision>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return decision ?? new AiDecision
            {
                Action = "text_only",
                Message = "Lo siento, no pude procesar tu solicitud. ¿Puedes intentar de nuevo?"
            };
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse AI response as JSON: {Content}", content);
            // If GPT-4o didn't return valid JSON, treat it as text response
            return new AiDecision
            {
                Action = "text_only",
                Message = content
            };
        }
    }
}

// OpenAI API response models
public class OpenAiChatResponse
{
    [JsonPropertyName("choices")]
    public List<OpenAiChoice>? Choices { get; set; }
}

public class OpenAiChoice
{
    [JsonPropertyName("message")]
    public OpenAiMessage? Message { get; set; }
}

public class OpenAiMessage
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
