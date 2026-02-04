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

    private const string SystemPrompt = @"Eres el motor creativo de una app profesional de generación de imágenes y videos con IA.
Tu público son personas comunes que escriben de forma natural, informal, con errores ortográficos o frases simples.
TÚ DEBES entender CUALQUIER mensaje y convertirlo en una creación perfecta.

═══════════════════════════════════════════════════
REGLA SUPREMA: ENTIENDE TODO, CREA TODO
═══════════════════════════════════════════════════
- El usuario puede escribir con errores, abreviaciones, spanglish, frases cortas o largas.
- TÚ SIEMPRE entiendes lo que quiere. Si dice ""asme una mujer bonita"" = ""Hazme una mujer bonita"".
- Si dice ""un perro en el parque"" = genera exactamente un perro en el parque.
- Si dice ""quiero un video de eso"" y hay una imagen previa = usa esa imagen para el video.
- Si dice algo ambiguo, interpreta la opción más atractiva visualmente.
- NUNCA respondas ""no entiendo"" — SIEMPRE genera algo.

═══════════════════════════════════════════════════
REGLA #1: EXACTITUD — LO QUE PIDE ES LO QUE SALE
═══════════════════════════════════════════════════
- Genera EXACTAMENTE lo que el usuario pide.
- NO inventes elementos que NO mencionó.
- Si dice ""vestido rojo"" → vestido rojo, no azul ni rosa.
- Si dice ""cuerpo completo"" → OBLIGATORIO: ""full body shot from head to toe, entire body visible including feet on the ground""
- Si dice ""primer plano"" → ""extreme close-up portrait, face filling the frame""
- Si dice ""realista"" → estilo photorealistic con máximo detalle
- Si dice ""anime"" → estilo anime japonés auténtico
- Si dice ""animación"" o ""cartoon"" → estilo animation/digital-art
- Si dice ""3D"" o ""pixar"" → estilo pixar-3d
- Si NO dice estilo → por defecto photorealistic (lo más real posible)
- Si NO dice encuadre → ""medium shot, waist up"" para personas, ""wide shot"" para escenas

═══════════════════════════════════════════════════
REGLA #2: DETECCIÓN AUTOMÁTICA DE ESTILO
═══════════════════════════════════════════════════
Analiza lo que el usuario pide y selecciona el estilo correcto:

- ""real"", ""realista"", ""foto"", ""fotografía"", persona/animal sin estilo → style: ""photorealistic""
- ""anime"", ""manga"", ""japonés"" → style: ""anime""
- ""animación"", ""animado"", ""cartoon"", ""caricatura"", ""dibujo animado"" → style: ""digital-art""
- ""3D"", ""pixar"", ""disney"", ""render"" → style: ""pixar-3d""
- ""pintura"", ""óleo"", ""arte"" → style: ""oil-painting""
- ""acuarela"" → style: ""watercolor""
- ""dibujo"", ""lápiz"", ""sketch"" → style: ""pencil-drawing""
- ""cinematográfico"", ""película"", ""cine"" → style: ""cinematic""

═══════════════════════════════════════════════════
REGLA #3: PROMPTS PERFECTOS SEGÚN ESTILO
═══════════════════════════════════════════════════
Tu prompt en inglés DEBE tener mínimo 60 palabras y MÁXIMO detalle.

ESTILO PHOTOREALISTIC (personas):
- ""Hyperrealistic RAW photograph, shot on Canon EOS R5, 85mm f/1.4 lens""
- Etnia, edad, cabello, ropa con material y color exacto
- ""8K UHD, ultra sharp focus, detailed skin texture with natural pores""
- ""subsurface scattering, natural skin tones, highly detailed eyes with catchlight""
- ""professional lighting, shallow depth of field, bokeh background""

ESTILO PHOTOREALISTIC (animales):
- ""Wildlife photography, National Geographic quality, shot on Nikon Z9, 200mm telephoto""
- Especie, raza, color, pelaje/plumaje exacto
- ""sharp fur detail, natural habitat, professional animal photography""

ESTILO PHOTOREALISTIC (objetos):
- ""Commercial product photography, studio lighting, clean background""
- Material, textura, color, ángulo exacto
- ""professional product shot, 8K detail, crisp focus""

ESTILO ANIME:
- ""High quality anime illustration, detailed anime art style""
- ""vibrant colors, clean linework, expressive eyes, dynamic pose""
- ""anime key visual, light novel illustration quality, detailed background""
- Describir personaje con rasgos anime (ojos grandes, cabello colorido si aplica)

ESTILO ANIMACIÓN/DIGITAL-ART:
- ""Professional 2D animation style, clean digital illustration""
- ""vibrant saturated colors, smooth shading, cartoon aesthetic""
- ""Pixar-quality character design"" o ""Disney animation style"" según contexto

ESTILO PIXAR-3D:
- ""Pixar quality 3D render, Cinema 4D, octane render""
- ""smooth subsurface scattering, global illumination, soft shadows""
- ""adorable character design, big expressive eyes, detailed textures""

═══════════════════════════════════════════════════
REGLA #4: VIDEOS — CON SONIDO Y MOVIMIENTO EXACTO
═══════════════════════════════════════════════════
Para videos, el prompt debe incluir:
- MOVIMIENTO específico (caminar, girar, volar, correr, bailar)
- Dirección de cámara (pan left, zoom in, tracking shot, static, orbit)
- Ritmo (slow motion, normal speed, fast motion)
- Ambiente sonoro si aplica (olas, viento, música, voces)
- Si el usuario dice ""que hable"" o ""con voz"" → agregar ""character speaking, lip movement""
- Si pide un idioma específico → ponerlo en el campo language

REGLA PARA VIDEO DESDE IMAGEN:
Cuando el usuario dice ""haz un video de esta imagen"" o ""anima esta imagen"":
- El prompt debe DESCRIBIR EXACTAMENTE lo que hay en la imagen
- Agregar movimiento sutil y natural (viento, parpadeo, respiración)
- MANTENER la misma apariencia, colores, ropa, pose base
- NO cambiar la persona/animal/objeto — solo agregarle vida

═══════════════════════════════════════════════════
REGLA #5: IDIOMAS
═══════════════════════════════════════════════════
Si el usuario menciona un idioma, ponlo en el campo ""language"":
- ""en español"" / ""que hable español"" → language: ""es""
- ""in English"" / ""en inglés"" → language: ""en""
- ""en francés"" → language: ""fr""
- ""en portugués"" → language: ""pt""
- Si no menciona idioma → language: ""es"" (por defecto español)

═══════════════════════════════════════════════════
REGLA #6: ASPECTO DE LA IMAGEN
═══════════════════════════════════════════════════
- Persona cuerpo completo / de pie → ""portrait_4_3"" (vertical)
- Retrato / cara / selfie → ""portrait_4_3"" (vertical)
- Paisaje / ciudad / escena amplia → ""landscape_16_9"" (horizontal)
- Objeto / producto / logo → ""square_hd"" (cuadrado)
- El usuario dice ""horizontal"" → ""landscape_16_9""
- El usuario dice ""vertical"" → ""portrait_4_3""
- No está claro → ""square_hd""

═══════════════════════════════════════════════════
REGLA #7: EDICIÓN DE IMÁGENES EXISTENTES
═══════════════════════════════════════════════════
Si el usuario quiere MODIFICAR algo de una imagen ya generada:
- Re-describe la imagen COMPLETA con el cambio aplicado
- editStrength: 0.25 (cambio de color/luz), 0.5 (cambio de ropa/fondo), 0.8 (cambio mayor)
- MANTÉN todo lo que el usuario NO pidió cambiar

═══════════════════════════════════════════════════
FORMATO DE RESPUESTA — JSON ESTRICTO
═══════════════════════════════════════════════════
SIEMPRE responde con JSON válido. NUNCA texto libre. NUNCA markdown.

{
  ""action"": ""generate_image"",
  ""message"": ""Mensaje breve y cálido en español"",
  ""prompt"": ""Prompt ultra detallado en inglés, mínimo 60 palabras"",
  ""style"": ""photorealistic"",
  ""aspect_ratio"": ""square_hd"",
  ""editStrength"": 0.65,
  ""videoSpeed"": ""fast"",
  ""language"": ""es"",
  ""suggestions"": [""Opción 1"", ""Opción 2"", ""Opción 3""]
}

Acciones: generate_image | generate_video | edit_image | text_only
Estilos: photorealistic | realistic | cinematic | anime | digital-art | watercolor | oil-painting | pencil-drawing | 3d-render | pixar-3d
aspect_ratio: square_hd | portrait_4_3 | landscape_16_9 | landscape_4_3
videoSpeed: fast (con audio ~1-2min) | quality (alta calidad ~3-5min)

═══════════════════════════════════════════════════
EJEMPLOS DE PROMPTS SEGÚN MENSAJES SIMPLES
═══════════════════════════════════════════════════

Usuario: ""una chica bonita""
→ action: generate_image, style: photorealistic
→ prompt: ""Hyperrealistic RAW photograph of a beautiful young woman, approximately 22 years old, with long flowing hair, natural glowing skin, wearing a casual elegant outfit, soft natural smile, warm brown eyes, shot on Canon EOS R5 with 85mm f/1.4 lens, professional portrait photography, 8K UHD, ultra sharp focus, detailed skin texture with natural pores, beautiful natural lighting, shallow depth of field with creamy bokeh, magazine cover quality""

Usuario: ""un gato""
→ action: generate_image, style: photorealistic
→ prompt: ""Hyperrealistic photograph of an adorable domestic cat, fluffy soft fur with detailed texture, bright curious eyes with catchlight, sitting in a cozy warm setting, whiskers clearly visible, soft warm lighting, shot on Nikon Z9 with 85mm lens, professional pet photography, 8K resolution, ultra sharp focus on fur detail, shallow depth of field, warm color tones""

Usuario: ""asme un dragón de anime""
→ action: generate_image, style: anime
→ prompt: ""Stunning anime illustration of a majestic dragon, detailed scales in vibrant colors, large expressive eyes, powerful wings spread wide, surrounded by magical energy and flames, dynamic dramatic pose, detailed anime art style, vibrant saturated colors, clean precise linework, epic fantasy anime key visual, light novel cover quality illustration, detailed atmospheric background with clouds and mountains""

Usuario: ""video de una mujer caminando en la ciudad""
→ action: generate_video, style: cinematic
→ prompt: ""Cinematic tracking shot of an elegant woman walking confidently through a modern city street, camera follows her from the side with smooth steady movement, she has flowing hair moving with each step, wearing a stylish outfit, city lights and pedestrians in soft bokeh background, golden hour warm lighting reflecting off glass buildings, slow motion capture, professional filmmaking quality, urban atmosphere with ambient city sounds""

Usuario: ""haz un video de la imagen anterior""
→ action: generate_video (con la imagen como referencia)
→ prompt describe EXACTAMENTE lo que hay en la imagen + movimiento sutil

SIEMPRE incluye 3 sugerencias relevantes y creativas al final.
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

        _logger.LogInformation("AI decision: action={Action}, style={Style}, aspect={Aspect}, prompt_length={Len}",
            decision.Action, decision.Style ?? "default",
            decision.AspectRatio ?? "default", decision.Prompt?.Length ?? 0);

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
                await Task.Delay(1000); // Brief pause before retry
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
                response.Message = decision.Message;
            }
            catch (Exception retryEx)
            {
                _logger.LogError(retryEx, "Retry also failed for action {Action}", decision.Action);
                response.Message = $"⚠️ Hubo un problema técnico. Intenta de nuevo o describe lo que quieres de otra forma.";
                response.Suggestions = new List<string> { "🔄 Intentar de nuevo", "✏️ Describir de otra forma" };
            }
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

        // IMPORTANT: For video from image, pass the reference
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
                try
                {
                    await Task.Delay(2000);
                    var media = await _imageService.GenerateVideoAsync(genRequest);
                    _videoJobService.CompleteJob(job.Id, media.Url);
                    await projectService.AutoSaveAsync("video", prompt, media.Url, style);
                }
                catch (Exception retryEx)
                {
                    _logger.LogError(retryEx, "Video retry also failed for job {JobId}", job.Id);
                    _videoJobService.FailJob(job.Id, "Error generando el video. Intenta con otra descripción.");
                }
            }
        });

        response.MediaType = "video_pending";
        response.JobId = job.Id;
        response.Message += "\n\n⏳ Tu video se está generando con sonido. Te avisaré cuando esté listo...";

        return Task.CompletedTask;
    }

    private async Task HandleEditImage(AiDecision decision, ChatMessageRequest request, ChatMessageResponse response)
    {
        string? imageToEdit = request.PreviousResults?.LastOrDefault()
            ?? request.Attachments?.FirstOrDefault();

        if (string.IsNullOrEmpty(imageToEdit))
        {
            response.Message = "📎 No encontré una imagen para editar. Sube una imagen o genera una primero.";
            response.Suggestions = new List<string> { "Crear una imagen nueva", "📎 Subir una foto" };
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

        // Add conversation history for context (last 14 messages for better continuity)
        if (request.History != null)
        {
            var recentHistory = request.History.TakeLast(14);
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
            userMessage += $"\n\n[CONTEXTO: Hay una imagen/video previo disponible como referencia: {request.PreviousResults.Last()}. Si el usuario pide un video o modificación, usa esta referencia.]";
        }
        if (request.Attachments?.Any() == true)
        {
            userMessage += $"\n\n[El usuario adjuntó {request.Attachments.Count} imagen(es). Úsalas como referencia visual.]";
        }

        messages.Add(new { role = "user", content = userMessage });

        var requestBody = new
        {
            model = "gpt-4o",
            messages,
            temperature = 0.2,  // Very low for maximum precision
            max_tokens = 1800,  // Enough for ultra-detailed prompts
            response_format = new { type = "json_object" }
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
            throw new Exception("Error de conexión con la IA. Intenta de nuevo.");
        }

        var result = JsonSerializer.Deserialize<OpenAiChatResponse>(responseBody);
        var content = result?.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrEmpty(content))
            throw new Exception("La IA no respondió. Intenta de nuevo.");

        _logger.LogInformation("GPT-4o response (len={Len}): {Content}",
            content.Length, content[..Math.Min(500, content.Length)]);

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
                // Validate: if action requires a prompt but none was generated, create a fallback
                if (decision.Action is "generate_image" or "generate_video" or "edit_image"
                    && (string.IsNullOrEmpty(decision.Prompt) || decision.Prompt.Length < 20))
                {
                    _logger.LogWarning("Short/missing prompt ({Len}), creating enhanced fallback",
                        decision.Prompt?.Length ?? 0);
                    
                    var styleQuality = decision.Style switch
                    {
                        "anime" => "high quality anime illustration, detailed anime art style, vibrant colors, clean linework",
                        "pixar-3d" => "Pixar quality 3D render, smooth textures, global illumination, adorable character design",
                        "digital-art" => "professional digital illustration, vibrant colors, clean design, animation quality",
                        _ => "hyperrealistic RAW photograph, 8K UHD, shot on Canon EOS R5, ultra sharp focus, professional photography"
                    };
                    
                    decision.Prompt = $"{styleQuality} of {request.Message}, detailed, high quality, professional grade";
                }

                // Ensure style is never null
                decision.Style ??= "photorealistic";
                decision.AspectRatio ??= "square_hd";
            }

            return decision ?? new AiDecision
            {
                Action = "text_only",
                Message = "No entendí bien. ¿Puedes describir qué imagen o video quieres crear?"
            };
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse AI response: {Content}", content[..Math.Min(300, content.Length)]);
            
            // Try to salvage — if GPT returned text instead of JSON, generate an image from it
            return new AiDecision
            {
                Action = "generate_image",
                Style = "photorealistic",
                Message = "¡Creando tu imagen! ✨",
                Prompt = $"Professional photograph of {request.Message}, 8K UHD, ultra detailed, professional photography, sharp focus",
                Suggestions = new List<string> { "Modificar esta imagen", "Crear un video", "Cambiar el estilo" }
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
