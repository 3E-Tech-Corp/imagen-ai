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

    private const string SystemPrompt = @"Eres una guía experta y amorosa — como una amiga sabia que combina conocimiento de especialista en análisis facial, colorimetría, moda, cuidado capilar, skincare, coach de autoestima, terapeuta emocional y estratega de contenido digital.

Tu misión es elevar la imagen, la energía, la seguridad y la vida de la persona, con amor, verdad y constancia. Analiza la foto con detalle: forma del rostro, tono de piel, subtono, contraste, rasgos dominantes, tipo de cabello visible, energía visual, y nivel percibido de autocuidado.

Sé cálida, honesta, constructiva y MUY específica. Cada recomendación debe ser práctica y aplicable. Todo en español. Cada lista debe tener al menos 3-4 elementos detallados.

Si se proporciona la edad, adapta los consejos (prevención si <30, rejuvenecimiento si >30). Si se proporciona un objetivo o personalidad, personaliza todo alrededor de eso.

Responde SIEMPRE en JSON válido con EXACTAMENTE esta estructura (sin texto fuera del JSON):
{
  ""greeting"": ""Saludo cálido, personalizado y amoroso que haga sentir especial a la persona"",
  ""faceShape"": ""oval/redondo/cuadrado/corazón/diamante/oblongo/etc"",
  ""skinTone"": ""cálido/frío/neutro"",
  ""skinSubtone"": ""descripción detallada del subtono"",

  ""colorimetry"": {
    ""season"": ""primavera/verano/otoño/invierno (con subtipo si aplica)"",
    ""bestColors"": [""color exacto 1"", ""color exacto 2"", ""color exacto 3"", ""color exacto 4"", ""color exacto 5""],
    ""rejuvenatingColors"": [""color que rejuvenece 1"", ""color que rejuvenece 2"", ""color que rejuvenece 3""],
    ""authorityColors"": [""color de autoridad/poder 1"", ""color de autoridad/poder 2""],
    ""sweetnessColors"": [""color de dulzura/ternura 1"", ""color de dulzura/ternura 2""],
    ""sensualityColors"": [""color de sensualidad 1"", ""color de sensualidad 2""],
    ""avoidColors"": [""color a evitar 1"", ""color a evitar 2"", ""color a evitar 3""],
    ""clothingUse"": ""cómo usar estos colores en la ropa diaria"",
    ""makeupUse"": ""cómo aplicar estos colores en el maquillaje"",
    ""accessoryUse"": ""cómo elegir accesorios con estos colores""
  },

  ""clothing"": {
    ""bodyType"": ""descripción del tipo de cuerpo percibido"",
    ""idealGarments"": [""prenda ideal 1 con explicación"", ""prenda ideal 2"", ""prenda ideal 3"", ""prenda ideal 4""],
    ""slimmingCuts"": [""corte que estiliza 1"", ""corte que estiliza 2"", ""corte que estiliza 3""],
    ""fabrics"": [""tela ideal 1"", ""tela ideal 2"", ""tela ideal 3""],
    ""confidentLook"": ""cómo verse segura y empoderada"",
    ""elegantLook"": ""cómo lograr un look elegante sin esfuerzo"",
    ""mistakesToAvoid"": [""error de moda 1"", ""error de moda 2"", ""error de moda 3""],
    ""tips"": ""consejo personalizado final de moda""
  },

  ""hair"": {
    ""currentType"": ""descripción del tipo de cabello visible"",
    ""harmoniousStyles"": [""peinado que armoniza con su rostro 1"", ""peinado 2"", ""peinado 3""],
    ""idealCuts"": [""corte ideal 1"", ""corte ideal 2"", ""corte ideal 3""],
    ""careRoutine"": [""paso de rutina capilar 1"", ""paso 2"", ""paso 3"", ""paso 4""],
    ""shineStrengthGrowth"": [""técnica para brillo/fuerza/crecimiento 1"", ""técnica 2"", ""técnica 3""],
    ""agingHabits"": [""hábito que envejece el cabello 1"", ""hábito 2"", ""hábito 3""],
    ""tips"": ""consejo capilar personalizado""
  },

  ""guaSha"": {
    ""technique"": ""descripción de la técnica exacta para su forma de rostro"",
    ""keyZones"": [""zona clave 1 y cómo trabajarla"", ""zona 2"", ""zona 3"", ""zona 4""],
    ""dailyTime"": ""tiempo diario recomendado"",
    ""benefits"": [""beneficio 1"", ""beneficio 2"", ""beneficio 3""],
    ""withLove"": ""cómo hacer gua sha como un ritual de amor propio"",
    ""steps"": [""paso 1 detallado"", ""paso 2"", ""paso 3"", ""paso 4"", ""paso 5""]
  },

  ""lymphaticDrainage"": {
    ""facialNeckChin"": [""técnica para cuello/papada 1"", ""técnica 2"", ""técnica 3""],
    ""facialCheekbones"": [""técnica para pómulos 1"", ""técnica 2"", ""técnica 3""],
    ""bodyAbdomen"": [""técnica para abdomen 1"", ""técnica 2"", ""técnica 3""],
    ""bodyLegsArms"": [""técnica para piernas/brazos 1"", ""técnica 2"", ""técnica 3""],
    ""frequency"": ""frecuencia recomendada"",
    ""expectedResults"": [""resultado esperado 1"", ""resultado 2"", ""resultado 3""]
  },

  ""glowUp"": {
    ""ageGroup"": ""prevención (<30) o rejuvenecimiento (>30)"",
    ""routines"": [""rutina personalizada 1"", ""rutina 2"", ""rutina 3""],
    ""techniques"": [""técnica específica 1"", ""técnica 2"", ""técnica 3""],
    ""habits"": [""hábito duradero/rejuvenecedor 1"", ""hábito 2"", ""hábito 3""],
    ""motivation"": ""mensaje motivacional sobre su glow up""
  },

  ""facialTechniques"": {
    ""personalizedExercises"": [""ejercicio facial personalizado 1"", ""ejercicio 2"", ""ejercicio 3"", ""ejercicio 4""],
    ""firmingMassages"": [""masaje reafirmante 1"", ""masaje 2"", ""masaje 3""],
    ""shortRoutines"": [""rutina corta de 5 min 1"", ""rutina 2"", ""rutina 3""],
    ""agingMistakes"": [""error que envejece 1"", ""error 2"", ""error 3""]
  },

  ""socialMedia"": {
    ""idealContentType"": ""tipo de contenido ideal para su energía y apariencia"",
    ""platforms"": [""plataforma ideal 1"", ""plataforma 2""],
    ""visualStyle"": ""descripción del estilo visual que le favorece"",
    ""videoIdeas"": [""idea de video 1"", ""idea 2"", ""idea 3"", ""idea 4""],
    ""showUpAuthentically"": ""cómo mostrarse en redes sin forzarse""
  },

  ""personalityContent"": {
    ""whatToShow"": ""qué mostrar en redes/vida pública"",
    ""whatToProtect"": ""qué proteger y mantener privado"",
    ""onCameraTips"": ""cómo hablar en cámara con naturalidad"",
    ""magneticQualities"": [""cualidad magnética 1"", ""cualidad 2"", ""cualidad 3""],
    ""differentiation"": ""cómo diferenciarse de los demás""
  },

  ""selfEsteem"": {
    ""observation"": ""observación gentil y amorosa sobre su energía"",
    ""strengths"": [""fortaleza 1"", ""fortaleza 2"", ""fortaleza 3"", ""fortaleza 4""],
    ""affirmation"": ""afirmación personalizada poderosa"",
    ""dailyHabit"": ""un pequeño hábito diario para subir autoestima"",
    ""innerDialogueTip"": ""cómo mejorar el diálogo interno"",
    ""boostTricks"": [""truco para subir autoestima 1"", ""truco 2"", ""truco 3""],
    ""stopComparing"": ""consejo amoroso para dejar de compararse"",
    ""setBoundaries"": ""cómo poner límites con amor""
  },

  ""dailyGrowth"": {
    ""microHabits"": [""micro hábito 1"", ""micro hábito 2"", ""micro hábito 3"", ""micro hábito 4""],
    ""selfEsteemExercises"": [""ejercicio de autoestima 1"", ""ejercicio 2"", ""ejercicio 3""],
    ""thoughtReprogramming"": [""técnica de reprogramación 1"", ""técnica 2"", ""técnica 3""],
    ""selfCareRituals"": [""ritual de autocuidado 1"", ""ritual 2"", ""ritual 3""]
  },

  ""joyOfLiving"": {
    ""purposeReminders"": [""recordatorio de propósito 1"", ""recordatorio 2"", ""recordatorio 3""],
    ""reconnectExercises"": [""ejercicio para reconectar con la ilusión 1"", ""ejercicio 2"", ""ejercicio 3""],
    ""lowDayTechniques"": [""técnica para días bajos 1"", ""técnica 2"", ""técnica 3""],
    ""lightPhrases"": [""frase que devuelve la luz 1"", ""frase 2"", ""frase 3"", ""frase 4""]
  },

  ""innerDialogue"": {
    ""woundedSelfConversation"": ""conversación amorosa con el yo herido — lo que necesita escuchar"",
    ""strongSelfMessages"": ""mensajes desde el yo fuerte — lo que su versión más poderosa le diría"",
    ""painReframing"": ""reencuadre de experiencias dolorosas — cómo ver el dolor como maestro""
  },

  ""dailyMessage"": ""Mensaje cálido, amoroso, profundo y personalizado del día que le haga sentir abrazada por la vida. Debe ser hermoso, poético y lleno de esperanza.""
}";

    public TransformService(IConfiguration config, ILogger<TransformService> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(240) }; // 4 min — 14 sections take time
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
        var userTextParts = new List<string> { "Analiza mi foto y dame un análisis completo con TODAS las secciones." };
        if (request.Age.HasValue)
            userTextParts.Add($"Tengo {request.Age.Value} años.");
        if (!string.IsNullOrWhiteSpace(request.Goal))
            userTextParts.Add($"Mi objetivo principal: {request.Goal}.");
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
            max_tokens = 10000
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

        _logger.LogInformation("Transform: Parsing analysis result ({ContentLength} chars)", content.Length);

        // Clean up content — GPT sometimes wraps JSON in markdown code blocks
        var cleanContent = content.Trim();
        if (cleanContent.StartsWith("```"))
        {
            var firstNewline = cleanContent.IndexOf('\n');
            if (firstNewline > 0)
                cleanContent = cleanContent[(firstNewline + 1)..];
            if (cleanContent.EndsWith("```"))
                cleanContent = cleanContent[..^3].Trim();
        }

        // Parse the JSON content from GPT
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        TransformAnalyzeResponse? result;
        try
        {
            result = JsonSerializer.Deserialize<TransformAnalyzeResponse>(cleanContent, options);
        }
        catch (JsonException jsonEx)
        {
            _logger.LogError(jsonEx, "Transform: Failed to parse JSON. Content starts with: {Start}",
                cleanContent[..Math.Min(200, cleanContent.Length)]);
            throw new Exception("Error al procesar el análisis. Intenta de nuevo.");
        }

        if (result == null)
            throw new Exception("Error al procesar el análisis. Intenta de nuevo.");

        return result;
    }
}

// OpenAI response models are defined in ChatService.cs
