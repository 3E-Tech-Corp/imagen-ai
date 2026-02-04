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

    private const string SystemPrompt = @"Eres un director de arte y fotógrafo profesional experto en generación de imágenes y videos con IA.
Tu trabajo es convertir lo que el usuario pide en prompts PERFECTOS en inglés para modelos de generación de IA.

═══════════════════════════════════════════
REGLA #1: EXACTITUD ABSOLUTA
═══════════════════════════════════════════
- Genera EXACTAMENTE lo que el usuario pide. Ni más, ni menos.
- NO agregues elementos que el usuario NO mencionó.
- NO cambies colores, poses, ropa, fondo, ni ningún detalle.
- Si el usuario dice ""mujer con vestido rojo en la playa"", el prompt debe tener EXACTAMENTE eso.
- Si el usuario dice ""cuerpo completo"" → OBLIGATORIO incluir ""full body shot from head to toe, entire body visible, feet visible on ground""
- Si el usuario dice ""primer plano"" → ""extreme close-up portrait, face filling the frame""
- Si NO especifica encuadre, usa ""medium shot, waist up"" por defecto para personas.

═══════════════════════════════════════════
REGLA #2: PROMPTS ULTRA-DETALLADOS
═══════════════════════════════════════════
Tu prompt en inglés DEBE tener mínimo 80 palabras. Incluye SIEMPRE:

PARA PERSONAS:
- Etnia/apariencia exacta que el usuario describió
- Edad aproximada si se mencionó
- Descripción exacta de ropa (color, material, corte, ajuste)
- Expresión facial específica
- Pose corporal específica
- Tipo de cabello (color, largo, estilo)
- Fondo/ambiente exacto descrito
- Iluminación: ""professional studio lighting, soft key light, subtle fill light, natural skin tones""
- Técnico: ""shot on Canon EOS R5, 85mm f/1.4 lens, RAW photograph, 8K UHD, ultra sharp focus""
- Piel: ""detailed skin texture with natural pores, subsurface scattering, no airbrushing""
- Ojos: ""highly detailed eyes with natural reflections, catchlight""

PARA ANIMALES:
- Especie exacta, raza si aplica
- Color/patrón del pelaje o plumaje
- Postura y acción
- Ambiente/entorno
- ""wildlife photography, National Geographic quality, sharp fur/feather detail, natural habitat""
- ""shot on Nikon Z9, 200mm telephoto lens, shallow depth of field""

PARA OBJETOS:
- Material exacto, color, textura
- Ángulo de cámara
- Fondo (si no se especifica, usa fondo neutro)
- ""product photography, commercial quality, perfect lighting, studio setup""

PARA PAISAJES/ESCENAS:
- Elementos exactos del paisaje
- Hora del día, clima
- Atmósfera y mood
- ""landscape photography, ultra wide angle, 8K panoramic, dramatic composition""

═══════════════════════════════════════════
REGLA #3: ASPECTO DE LA IMAGEN
═══════════════════════════════════════════
Determina el aspect_ratio según lo que el usuario pide:
- Persona de cuerpo completo → ""portrait_4_3"" (vertical)
- Retrato/cara → ""portrait_4_3"" (vertical)
- Paisaje/escena amplia → ""landscape_16_9"" (horizontal)
- Objeto/producto → ""square_hd"" (cuadrado)
- Si el usuario pide un formato específico (horizontal, vertical) → respétalo
- Si no es claro → ""square_hd""

═══════════════════════════════════════════
REGLA #4: VIDEOS
═══════════════════════════════════════════
Para videos, el prompt debe describir:
- La ACCIÓN que ocurre (movimiento, cambio, transición)
- Dirección de cámara (pan, zoom, tracking shot, static)
- Ritmo (lento, rápido, dinámico)
- Sonido ambiente si aplica
- Si el usuario pide que hablen en un idioma, inclúyelo en language

═══════════════════════════════════════════
REGLA #5: EDICIÓN DE IMÁGENES
═══════════════════════════════════════════
Cuando el usuario quiere MODIFICAR una imagen existente:
- Describe la imagen completa incluyendo el cambio solicitado
- editStrength: 0.3 para cambios sutiles (color, iluminación), 0.5 para moderados (ropa, fondo), 0.8 para drásticos (pose, persona diferente)

═══════════════════════════════════════════
FORMATO DE RESPUESTA (JSON ESTRICTO)
═══════════════════════════════════════════
Responde SIEMPRE con JSON válido. SIN markdown, SIN ```json, SIN texto extra.

{
  ""action"": ""generate_image"",
  ""message"": ""Tu mensaje al usuario en español, breve y profesional"",
  ""prompt"": ""El prompt completo en inglés, mínimo 80 palabras, ultra detallado"",
  ""style"": ""photorealistic"",
  ""aspect_ratio"": ""square_hd"",
  ""editStrength"": 0.65,
  ""videoSpeed"": ""fast"",
  ""language"": ""es"",
  ""suggestions"": [""Sugerencia 1"", ""Sugerencia 2"", ""Sugerencia 3""]
}

Acciones: generate_image | generate_video | edit_image | text_only
Estilos: photorealistic | realistic | cinematic | anime | digital-art | watercolor | oil-painting | pencil-drawing | 3d-render | pixar-3d
aspect_ratio: square_hd | portrait_4_3 | landscape_16_9 | landscape_4_3
Idiomas: es | en | fr | de | pt | it | zh | ja | ko | ar | hi | ru
videoSpeed: fast (~1-2min con audio) | quality (alta calidad ~3-5min)

EJEMPLO para ""una mujer latina con vestido rojo cuerpo completo en la playa"":
{
  ""action"": ""generate_image"",
  ""message"": ""¡Creando tu imagen! Una mujer latina con vestido rojo en la playa, cuerpo completo. 🏖️"",
  ""prompt"": ""Full body photograph from head to toe of a beautiful young Latina woman, approximately 25 years old, with long flowing dark brown hair cascading over her shoulders, warm olive skin with natural sun-kissed glow, wearing an elegant flowing red silk dress that moves gently in the ocean breeze, the dress has a V-neckline and reaches just above her ankles, she is standing barefoot on golden sand with gentle waves lapping at her feet, warm golden hour sunset lighting casting long shadows, the sky behind her is painted in shades of orange pink and purple, she has a confident natural smile with subtle makeup, her entire body is visible from head to feet, shot on Canon EOS R5 with 85mm f/1.4 lens, professional fashion photography, 8K UHD resolution, ultra sharp focus, detailed skin texture with natural pores, highly detailed eyes with catchlight, shallow depth of field with soft bokeh background, magazine quality editorial photograph"",
  ""style"": ""photorealistic"",
  ""aspect_ratio"": ""portrait_4_3"",
  ""suggestions"": [""Cambiar vestido a azul"", ""Agregar viento en el cabello"", ""Crear video de esta imagen""]
}

Responde en español al usuario. Prompt SIEMPRE en inglés.";

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
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(3) };
    }

    public async Task<ChatMessageResponse> ProcessMessageAsync(ChatMessageRequest request)
    {
        var conversationId = request.ConversationId ?? Guid.NewGuid().ToString();

        // Step 1: Get AI decision from OpenAI
        var decision = await GetAiDecisionAsync(request);

        _logger.LogInformation("AI decision: action={Action}, aspect={Aspect}, prompt_length={Len}",
            decision.Action, decision.AspectRatio ?? "default",
            decision.Prompt?.Length ?? 0);

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
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing action {Action}, attempting retry...", decision.Action);
            
            // RETRY ONCE on failure
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
                }
                // Clear error from first attempt
                response.Message = decision.Message;
            }
            catch (Exception retryEx)
            {
                _logger.LogError(retryEx, "Retry also failed for action {Action}", decision.Action);
                response.Message = $"{decision.Message}\n\n⚠️ Hubo un error al generar. Por favor intenta de nuevo con una descripción diferente.";
            }
        }

        return response;
    }

    private async Task HandleGenerateImage(AiDecision decision, ChatMessageRequest request, ChatMessageResponse response)
    {
        var genRequest = new GenerationRequest
        {
            // Use the GPT-4o prompt DIRECTLY — it's already perfect
            Prompt = decision.Prompt ?? request.Message,
            Type = "image",
            Style = decision.Style ?? "photorealistic",
            Quality = "ultra",
            AspectRatio = decision.AspectRatio ?? "square_hd"
        };

        if (request.Attachments?.Any() == true)
        {
            genRequest.ReferenceImages = request.Attachments;
        }

        var media = await _imageService.GenerateImageAsync(genRequest);
        response.MediaUrl = media.Url;
        response.MediaType = "image";

        _ = _projectService.AutoSaveAsync("image", decision.Prompt ?? request.Message, media.Url, decision.Style ?? "photorealistic");
    }

    private Task HandleGenerateVideo(AiDecision decision, ChatMessageRequest request, ChatMessageResponse response)
    {
        var genRequest = new GenerationRequest
        {
            Prompt = decision.Prompt ?? request.Message,
            Type = "video",
            Style = decision.Style ?? "cinematic",
            VideoSpeed = decision.VideoSpeed ?? "fast",
            Language = decision.Language ?? "es"
        };

        if (request.PreviousResults?.Any() == true)
        {
            genRequest.ReferenceImages = request.PreviousResults;
        }
        else if (request.Attachments?.Any() == true)
        {
            genRequest.ReferenceImages = request.Attachments;
        }

        var job = _videoJobService.CreateJob(genRequest.Prompt, genRequest.Style);

        var projectService = _projectService;
        var prompt = decision.Prompt ?? request.Message;
        var style = decision.Style ?? "cinematic";
        _ = Task.Run(async () =>
        {
            try
            {
                var media = await _imageService.GenerateVideoAsync(genRequest);
                _videoJobService.CompleteJob(job.Id, media.Url);
                await projectService.AutoSaveAsync("video", prompt, media.Url, style);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Video generation failed for job {JobId}, retrying...", job.Id);
                
                // Retry once
                try
                {
                    var media = await _imageService.GenerateVideoAsync(genRequest);
                    _videoJobService.CompleteJob(job.Id, media.Url);
                    await projectService.AutoSaveAsync("video", prompt, media.Url, style);
                }
                catch (Exception retryEx)
                {
                    _logger.LogError(retryEx, "Video retry also failed for job {JobId}", job.Id);
                    _videoJobService.FailJob(job.Id, retryEx.Message);
                }
            }
        });

        response.MediaType = "video_pending";
        response.JobId = job.Id;
        response.Message += "\n\n⏳ Tu video se está generando. Te avisaré cuando esté listo...";

        return Task.CompletedTask;
    }

    private async Task HandleEditImage(AiDecision decision, ChatMessageRequest request, ChatMessageResponse response)
    {
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
            EditStrength = decision.EditStrength ?? 0.65,
            ReferenceImages = new List<string> { imageToEdit }
        };

        var media = await _imageService.GenerateImageAsync(genRequest);
        response.MediaUrl = media.Url;
        response.MediaType = "image";

        _ = _projectService.AutoSaveAsync("image", decision.Prompt ?? request.Message, media.Url, decision.Style ?? "photorealistic");
    }

    private async Task<AiDecision> GetAiDecisionAsync(ChatMessageRequest request)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("__"))
            throw new InvalidOperationException("OpenAI API key not configured");

        var messages = new List<object>();
        messages.Add(new { role = "system", content = SystemPrompt });

        // Add conversation history for context (last 12 messages)
        if (request.History != null)
        {
            var recentHistory = request.History.TakeLast(12);
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

        var userMessage = request.Message;
        if (request.PreviousResults?.Any() == true)
        {
            userMessage += $"\n\n[CONTEXTO: La última imagen/video generado está disponible como referencia: {request.PreviousResults.Last()}]";
        }
        if (request.Attachments?.Any() == true)
        {
            userMessage += $"\n\n[El usuario adjuntó {request.Attachments.Count} imagen(es) como referencia visual]";
        }

        messages.Add(new { role = "user", content = userMessage });

        var requestBody = new
        {
            model = "gpt-4o",
            messages,
            temperature = 0.25, // LOW temperature for PRECISION — no improvising
            max_tokens = 1500,  // More tokens for detailed prompts
            response_format = new { type = "json_object" } // Force JSON output
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

        _logger.LogInformation("GPT-4o response (len={Len}): {Content}",
            content.Length, content[..Math.Min(400, content.Length)]);

        // Clean up response
        content = content.Trim();
        if (content.StartsWith("```json")) content = content[7..];
        else if (content.StartsWith("```")) content = content[3..];
        if (content.EndsWith("```")) content = content[..^3];
        content = content.Trim();

        try
        {
            var decision = JsonSerializer.Deserialize<AiDecision>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (decision != null)
            {
                // Validate prompt length for generation actions
                if (decision.Action is "generate_image" or "generate_video" or "edit_image"
                    && (string.IsNullOrEmpty(decision.Prompt) || decision.Prompt.Length < 30))
                {
                    _logger.LogWarning("GPT-4o generated a short prompt ({Len} chars), regenerating...",
                        decision.Prompt?.Length ?? 0);
                    // Fallback: use user's message enhanced
                    decision.Prompt = $"Professional {decision.Style ?? "photorealistic"} photograph of {request.Message}, "
                        + "8K UHD resolution, ultra sharp focus, professional photography, detailed textures, "
                        + "natural lighting, shot on Canon EOS R5 with 85mm f/1.4 lens";
                }
            }

            return decision ?? new AiDecision
            {
                Action = "text_only",
                Message = "Lo siento, no pude procesar tu solicitud. ¿Puedes intentar de nuevo?"
            };
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse AI response: {Content}", content[..Math.Min(200, content.Length)]);
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
