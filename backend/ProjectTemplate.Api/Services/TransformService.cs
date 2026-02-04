using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ProjectTemplate.Api.Models;

namespace ProjectTemplate.Api.Services;

public class TransformService
{
    private readonly IConfiguration _config;
    private readonly ILogger<TransformService> _logger;
    private readonly HttpClient _httpClient;

    private const string SystemPrompt = @"Eres una guía experta y amorosa, combinación de especialista en análisis facial, colorimetría, moda, cuidado capilar, coach de autoestima y estratega de contenido.

Analiza la foto de la persona y proporciona un análisis completo. Sé cálida, honesta y constructiva. Todo en español.

Tu misión es elevar la imagen, la energía, la seguridad y la vida de la persona, con amor, verdad y constancia.

Analiza: forma del rostro, tono de piel, subtono, contraste, rasgos dominantes, tipo de cabello visible, energía visual, y nivel percibido de autocuidado.

Responde SIEMPRE en JSON válido con exactamente esta estructura (sin texto adicional fuera del JSON):
{
  ""greeting"": ""Saludo cálido y personalizado"",
  ""faceShape"": ""oval/redondo/cuadrado/corazón/etc"",
  ""skinTone"": ""cálido/frío/neutro"",
  ""skinSubtone"": ""descripción del subtono"",
  ""colorimetry"": {
    ""season"": ""primavera/verano/otoño/invierno"",
    ""bestColors"": [""color1"", ""color2"", ""color3"", ""color4"", ""color5""],
    ""avoidColors"": [""color1"", ""color2"", ""color3""],
    ""makeupTips"": ""recomendaciones de maquillaje"",
    ""accessoryColors"": ""colores de accesorios recomendados""
  },
  ""clothing"": {
    ""bodyType"": ""descripción del tipo de cuerpo"",
    ""bestStyles"": [""estilo1"", ""estilo2"", ""estilo3""],
    ""bestCuts"": [""corte1"", ""corte2""],
    ""fabrics"": [""tela1"", ""tela2""],
    ""avoid"": [""qué evitar""],
    ""tips"": ""consejos personalizados""
  },
  ""hair"": {
    ""currentType"": ""descripción del tipo actual"",
    ""bestHairstyles"": [""estilo1"", ""estilo2""],
    ""bestCuts"": [""corte1"", ""corte2""],
    ""careRoutine"": [""paso1"", ""paso2"", ""paso3""],
    ""tips"": ""consejos personalizados""
  },
  ""skincare"": {
    ""guaSha"": [""paso1"", ""paso2"", ""paso3""],
    ""lymphaticDrainage"": [""paso1"", ""paso2"", ""paso3""],
    ""facialExercises"": [""ejercicio1"", ""ejercicio2"", ""ejercicio3""],
    ""dailyRoutine"": [""paso1"", ""paso2"", ""paso3"", ""paso4""],
    ""antiAging"": ""consejos anti-edad basados en la edad aparente""
  },
  ""socialMedia"": {
    ""contentType"": ""tipo de contenido que le va"",
    ""platforms"": [""plataforma1"", ""plataforma2""],
    ""visualStyle"": ""descripción del estilo visual"",
    ""videoIdeas"": [""idea1"", ""idea2"", ""idea3""],
    ""tips"": ""cómo mostrarse auténticamente""
  },
  ""selfEsteem"": {
    ""observation"": ""observación gentil sobre su energía"",
    ""strengths"": [""fortaleza1"", ""fortaleza2"", ""fortaleza3""],
    ""affirmation"": ""afirmación personalizada"",
    ""dailyHabit"": ""un pequeño hábito diario"",
    ""innerDialogue"": ""un mensaje desde su yo fuerte""
  },
  ""dailyMessage"": ""Un mensaje cálido, amoroso y motivador del día""
}

Sé específica y práctica en cada recomendación. Usa un tono cálido y motivador. Cada lista debe tener al menos 3 elementos.";

    public TransformService(IConfiguration config, ILogger<TransformService> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(90) };
    }

    private string GetOpenAiKey()
    {
        var key = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(key) || key.Contains("__"))
            throw new InvalidOperationException("OpenAI API key not configured");
        return key;
    }

    public async Task<TransformAnalyzeResponse> AnalyzeAsync(TransformAnalyzeRequest request)
    {
        var apiKey = GetOpenAiKey();

        _logger.LogInformation("Transform: Analyzing selfie (age={Age}, goal={Goal})",
            request.Age, request.Goal);

        // Build user message text
        var userTextParts = new List<string> { "Analiza mi foto y dame un análisis completo." };
        if (request.Age.HasValue)
            userTextParts.Add($"Edad: {request.Age.Value} años.");
        if (!string.IsNullOrWhiteSpace(request.Goal))
            userTextParts.Add($"Mi objetivo: {request.Goal}.");
        if (!string.IsNullOrWhiteSpace(request.Personality))
            userTextParts.Add($"Sobre mí: {request.Personality}.");

        var userText = string.Join(" ", userTextParts);

        // Build OpenAI Vision request
        var openAiRequest = new
        {
            model = "gpt-4o",
            messages = new object[]
            {
                new { role = "system", content = SystemPrompt },
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = userText },
                        new { type = "image_url", image_url = new { url = request.ImageUrl } }
                    }
                }
            },
            response_format = new { type = "json_object" },
            max_tokens = 4000
        };

        var jsonPayload = JsonSerializer.Serialize(openAiRequest);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI Vision API error: {Status} {Body}",
                response.StatusCode, responseBody[..Math.Min(500, responseBody.Length)]);
            throw new Exception("Error al analizar la imagen. Intenta de nuevo.");
        }

        _logger.LogInformation("Transform: OpenAI response received ({Length} chars)", responseBody.Length);

        // Parse the OpenAI response
        var openAiResponse = JsonSerializer.Deserialize<OpenAiChatResponse>(responseBody);
        var content = openAiResponse?.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrEmpty(content))
            throw new Exception("No se recibió análisis. Intenta de nuevo.");

        _logger.LogInformation("Transform: Parsing analysis result");

        // Parse the JSON content from GPT
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        var result = JsonSerializer.Deserialize<TransformAnalyzeResponse>(content, options);
        if (result == null)
            throw new Exception("Error al procesar el análisis. Intenta de nuevo.");

        return result;
    }
}

// OpenAI response models are defined in ChatService.cs
