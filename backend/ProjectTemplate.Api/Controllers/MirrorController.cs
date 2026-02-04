using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class MirrorController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<MirrorController> _logger;
    private readonly HttpClient _httpClient;

    private const string SystemPrompt = @"Eres una guía personal amorosa, cálida y experta. Eres como la mejor amiga que también es estilista, coach de imagen y terapeuta emocional suave. Tu nombre es ""Tu Espejo"".

Tu rol:
- Analizar fotos del rostro de la persona: expresiones, energía, estado emocional visible, colorimetría, qué le favorece
- Escuchar cómo se siente y darle consejos prácticos con amor
- Si se siente triste, sola o fea: validar sus emociones Y darle tácticas concretas para mejorar cómo se siente
- Si tiene dudas sobre ropa o colores: aconsejar qué le queda mejor según su tono de piel, forma de rostro, energía del día
- Si sube fotos de su ropa: diseñar el mejor outfit combinando esas prendas
- Si sube foto de su cara: aconsejar qué peinado le quedaría mejor HOY basándose en cómo se ve y se siente
- Dar consejos de maquillaje, accesorios, actitud

Tu tono:
- Siempre en español
- Cálido, amoroso, honesto pero gentil
- Como una amiga sabia que te quiere ver brillar
- Nunca cruel, nunca frío, nunca genérico
- Personalizado a lo que ves en la foto y lo que la persona escribe
- Usa emojis con moderación para dar calidez

Reglas:
- Si hay foto: SIEMPRE comenta lo que ves (expresión, energía, colores, qué destaca)
- Si la persona escribe cómo se siente: SIEMPRE valida primero, luego aconseja
- Da consejos PRÁCTICOS y ESPECÍFICOS, no genéricos
- Si hay ropa en la foto: sugiere cómo combinarla, qué agregar, qué cambiar
- Incluye siempre al menos un consejo de imagen Y uno emocional
- Termina siempre con algo que la haga sentir mejor sobre sí misma

Formato de respuesta:
Responde de forma natural y conversacional. Usa párrafos cortos. Puedes usar listas si es útil pero no fuerces estructura. Sé genuina.";

    public MirrorController(IConfiguration config, ILogger<MirrorController> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(120) };
    }

    public class MirrorChatRequest
    {
        public string Message { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public List<MirrorHistoryItem>? History { get; set; }
    }

    public class MirrorHistoryItem
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool HasImage { get; set; }
    }

    public class MirrorChatResponse
    {
        public string Message { get; set; } = string.Empty;
        public List<string>? Suggestions { get; set; }
    }

    [HttpPost("chat")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<IActionResult> Chat([FromBody] MirrorChatRequest request)
    {
        try
        {
            var apiKey = _config["OpenAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("__"))
                return StatusCode(503, new { message = "El servicio no está configurado." });

            if (string.IsNullOrWhiteSpace(request.Message) && string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest(new { message = "Escribe algo o sube una foto para comenzar." });

            // Build messages
            var messages = new List<object> { new { role = "system", content = SystemPrompt } };

            // Add conversation history (last 10 messages)
            if (request.History != null)
            {
                foreach (var item in request.History.TakeLast(10))
                {
                    messages.Add(new { role = item.Role, content = item.Content });
                }
            }

            // Build current user message
            var userContent = new List<object>();

            if (!string.IsNullOrWhiteSpace(request.Message))
                userContent.Add(new { type = "text", text = request.Message });

            if (!string.IsNullOrWhiteSpace(request.ImageUrl))
                userContent.Add(new { type = "image_url", image_url = new { url = request.ImageUrl } });

            // If only image, add instruction
            if (string.IsNullOrWhiteSpace(request.Message) && !string.IsNullOrWhiteSpace(request.ImageUrl))
                userContent.Insert(0, new { type = "text", text = "Analiza mi foto. ¿Cómo me veo? ¿Qué me recomiendas hoy?" });

            messages.Add(new { role = "user", content = userContent });

            var openAiRequest = new
            {
                model = "gpt-4o",
                messages,
                max_tokens = 2000,
                temperature = 0.8
            };

            var jsonPayload = JsonSerializer.Serialize(openAiRequest);

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            httpRequest.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(httpRequest);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Mirror chat API error: {Status} {Body}", response.StatusCode, responseBody[..Math.Min(300, responseBody.Length)]);
                return StatusCode(500, new { message = "Error al procesar. Intenta de nuevo." });
            }

            var openAiResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var content = openAiResponse.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";

            // Generate contextual suggestions
            var suggestions = GenerateSuggestions(request.Message, request.ImageUrl);

            return Ok(new MirrorChatResponse
            {
                Message = content,
                Suggestions = suggestions
            });
        }
        catch (TaskCanceledException)
        {
            return StatusCode(504, new { message = "La respuesta tardó demasiado. Intenta con un mensaje más corto." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Mirror chat error");
            return StatusCode(500, new { message = "Error al responder. Intenta de nuevo." });
        }
    }

    private static List<string> GenerateSuggestions(string? message, string? imageUrl)
    {
        var suggestions = new List<string>();
        var hasImage = !string.IsNullOrWhiteSpace(imageUrl);
        var msgLower = (message ?? "").ToLower();

        if (hasImage)
        {
            suggestions.Add("¿Qué peinado me queda hoy?");
            suggestions.Add("¿Qué colores me favorecen?");
            suggestions.Add("¿Qué maquillaje me recomiendas?");
        }
        else if (msgLower.Contains("trist") || msgLower.Contains("mal") || msgLower.Contains("sol"))
        {
            suggestions.Add("Dame un ritual de autocuidado para hoy");
            suggestions.Add("¿Qué puedo hacer para sentirme mejor?");
            suggestions.Add("Necesito una afirmación poderosa");
        }
        else if (msgLower.Contains("ropa") || msgLower.Contains("vest") || msgLower.Contains("outfit"))
        {
            suggestions.Add("Sube una foto de tu ropa para armar un outfit");
            suggestions.Add("¿Qué estilo me recomiendas para hoy?");
            suggestions.Add("¿Qué accesorios combinan?");
        }
        else
        {
            suggestions.Add("📸 Sube tu selfie del día");
            suggestions.Add("¿Cómo me veo hoy?");
            suggestions.Add("Necesito consejos de imagen");
            suggestions.Add("¿Cómo puedo mejorar mi look?");
        }

        return suggestions.Take(4).ToList();
    }
}
