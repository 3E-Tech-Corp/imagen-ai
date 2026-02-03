using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ProjectTemplate.Api.Services;

public class RecipeService
{
    private readonly IConfiguration _config;
    private readonly ILogger<RecipeService> _logger;
    private readonly HttpClient _httpClient;

    public RecipeService(IConfiguration config, ILogger<RecipeService> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(2) };
    }

    public async Task<RecipeResult> GenerateRecipesAsync(string ingredients, string mealType, string dietPreference, int count = 3)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("__"))
            throw new InvalidOperationException("OpenAI API key not configured");

        var mealTypeText = mealType switch
        {
            "breakfast" => "desayuno",
            "lunch" => "almuerzo",
            "dinner" => "cena",
            "snack" => "merienda/snack",
            "dessert" => "postre",
            _ => "cualquier comida"
        };

        var dietText = dietPreference switch
        {
            "vegetarian" => "vegetariana",
            "vegan" => "vegana",
            "keto" => "keto/baja en carbohidratos",
            "gluten-free" => "sin gluten",
            "low-calorie" => "baja en calorías",
            "high-protein" => "alta en proteínas",
            _ => "saludable"
        };

        var systemPrompt = @"Eres un chef nutricionista experto. Genera recetas saludables, deliciosas y fáciles de preparar.
Responde SIEMPRE en formato JSON válido. No incluyas texto fuera del JSON.
El JSON debe tener esta estructura exacta:
{
  ""recipes"": [
    {
      ""name"": ""Nombre del plato"",
      ""description"": ""Descripción breve del plato"",
      ""prepTime"": ""15 min"",
      ""cookTime"": ""20 min"",
      ""servings"": 2,
      ""calories"": 350,
      ""difficulty"": ""Fácil"",
      ""ingredients"": [""ingrediente 1"", ""ingrediente 2""],
      ""steps"": [""Paso 1..."", ""Paso 2...""],
      ""tips"": ""Un consejo útil para esta receta"",
      ""imagePrompt"": ""A professional food photograph of [dish description], on a white plate, top-down view, natural lighting, appetizing""
    }
  ]
}";

        var userPrompt = $@"Con estos ingredientes: {ingredients}

Genera {count} recetas de tipo: {mealTypeText}
Preferencia: {dietText}

Reglas:
- Usa PRINCIPALMENTE los ingredientes dados (puedes agregar condimentos básicos como sal, pimienta, aceite)
- Las recetas deben ser saludables y nutritivas
- Incluye calorías aproximadas por porción
- Los pasos deben ser claros y fáciles de seguir
- El imagePrompt debe describir cómo se ve el plato terminado en inglés (para generar imagen)";

        var requestBody = new
        {
            model = "gpt-4o-mini",
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            temperature = 0.7,
            max_tokens = 3000,
            response_format = new { type = "json_object" }
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var response = await _httpClient.PostAsync(
            "https://api.openai.com/v1/chat/completions",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI recipe error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception("Error al generar recetas. Intenta de nuevo.");
        }

        var chatResult = JsonSerializer.Deserialize<ChatCompletionResponse>(responseBody);
        var content = chatResult?.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrEmpty(content))
            throw new Exception("No se pudieron generar recetas. Intenta de nuevo.");

        _logger.LogInformation("Recipe response: {Content}", content[..Math.Min(200, content.Length)]);

        var recipeResult = JsonSerializer.Deserialize<RecipeResult>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return recipeResult ?? throw new Exception("Error al procesar recetas.");
    }

    public async Task<MealAnalysisResult> AnalyzeMealAsync(string imageBase64, string goal, string? additionalInfo)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("__"))
            throw new InvalidOperationException("OpenAI API key not configured");

        var goalText = goal switch
        {
            "lose-fat" => "Perder grasa corporal",
            "maintain" => "Mantener peso actual",
            "gain-muscle" => "Aumentar masa muscular",
            _ => "Mantener una alimentación saludable"
        };

        var systemPrompt = @"Eres un nutricionista experto. Analiza la foto de este plato de comida y proporciona un análisis nutricional detallado.
Responde SIEMPRE en formato JSON válido con esta estructura exacta:
{
  ""foodName"": ""nombre del plato identificado"",
  ""description"": ""breve descripción de lo que ves en el plato"",
  ""estimatedCalories"": 450,
  ""macros"": {
    ""proteinGrams"": 35,
    ""carbsGrams"": 40,
    ""fatGrams"": 15,
    ""fiberGrams"": 8,
    ""sugarGrams"": 5
  },
  ""healthScore"": 7,
  ""goalVerdict"": ""Bueno para perder grasa - alto en proteína y fibra"",
  ""goalExplanation"": ""Este plato tiene un buen balance..."",
  ""pros"": [""Alto en proteína"", ""Buena fuente de fibra""],
  ""cons"": [""Podría tener menos carbohidratos refinados""],
  ""suggestions"": [""Agrega más vegetales verdes"", ""Reduce la porción de arroz""],
  ""portionSize"": ""Porción mediana (~350g)""
}

El objetivo del usuario es: " + goalText + @"
" + (string.IsNullOrEmpty(additionalInfo) ? "" : $"Contexto adicional del usuario: {additionalInfo}\n") + @"
Sé preciso pero tiende a sobreestimar ligeramente las calorías (mejor prevenir).
Todo el texto DEBE estar en español.";

        var userContent = new List<object>
        {
            new { type = "text", text = "Analiza este plato de comida y proporciona el análisis nutricional completo." },
            new { type = "image_url", image_url = new { url = $"data:image/jpeg;base64,{imageBase64}" } }
        };

        var requestBody = new
        {
            model = "gpt-4o",
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userContent }
            },
            temperature = 0.3,
            max_tokens = 2000,
            response_format = new { type = "json_object" }
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var response = await _httpClient.PostAsync(
            "https://api.openai.com/v1/chat/completions",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI meal analysis error: {Status} {Body}", response.StatusCode, responseBody);
            throw new Exception("Error al analizar el plato. Intenta de nuevo.");
        }

        var chatResult = JsonSerializer.Deserialize<ChatCompletionResponse>(responseBody);
        var content = chatResult?.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrEmpty(content))
            throw new Exception("No se pudo analizar el plato. Intenta de nuevo.");

        _logger.LogInformation("Meal analysis response: {Content}", content[..Math.Min(200, content.Length)]);

        var result = JsonSerializer.Deserialize<MealAnalysisResult>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return result ?? throw new Exception("Error al procesar el análisis nutricional.");
    }
}

// OpenAI Chat response models
public class ChatCompletionResponse
{
    [JsonPropertyName("choices")]
    public List<ChatChoice>? Choices { get; set; }
}

public class ChatChoice
{
    [JsonPropertyName("message")]
    public ChatMessage? Message { get; set; }
}

public class ChatMessage
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}

// Recipe models
public class RecipeResult
{
    [JsonPropertyName("recipes")]
    public List<Recipe>? Recipes { get; set; }
}

public class Recipe
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("prepTime")]
    public string PrepTime { get; set; } = "";

    [JsonPropertyName("cookTime")]
    public string CookTime { get; set; } = "";

    [JsonPropertyName("servings")]
    public int Servings { get; set; }

    [JsonPropertyName("calories")]
    public int Calories { get; set; }

    [JsonPropertyName("difficulty")]
    public string Difficulty { get; set; } = "";

    [JsonPropertyName("ingredients")]
    public List<string>? Ingredients { get; set; }

    [JsonPropertyName("steps")]
    public List<string>? Steps { get; set; }

    [JsonPropertyName("tips")]
    public string Tips { get; set; } = "";

    [JsonPropertyName("imagePrompt")]
    public string ImagePrompt { get; set; } = "";

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }
}

// Meal Analysis models
public class AnalyzeMealRequest
{
    public string ImageBase64 { get; set; } = "";
    public string Goal { get; set; } = "lose-fat";
    public string? AdditionalInfo { get; set; }
}

public class MealAnalysisResult
{
    [JsonPropertyName("foodName")]
    public string FoodName { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("estimatedCalories")]
    public int EstimatedCalories { get; set; }

    [JsonPropertyName("macros")]
    public MacroBreakdown Macros { get; set; } = new();

    [JsonPropertyName("healthScore")]
    public int HealthScore { get; set; }

    [JsonPropertyName("goalVerdict")]
    public string GoalVerdict { get; set; } = "";

    [JsonPropertyName("goalExplanation")]
    public string GoalExplanation { get; set; } = "";

    [JsonPropertyName("pros")]
    public List<string> Pros { get; set; } = new();

    [JsonPropertyName("cons")]
    public List<string> Cons { get; set; } = new();

    [JsonPropertyName("suggestions")]
    public List<string> Suggestions { get; set; } = new();

    [JsonPropertyName("portionSize")]
    public string PortionSize { get; set; } = "";
}

public class MacroBreakdown
{
    [JsonPropertyName("proteinGrams")]
    public int ProteinGrams { get; set; }

    [JsonPropertyName("carbsGrams")]
    public int CarbsGrams { get; set; }

    [JsonPropertyName("fatGrams")]
    public int FatGrams { get; set; }

    [JsonPropertyName("fiberGrams")]
    public int FiberGrams { get; set; }

    [JsonPropertyName("sugarGrams")]
    public int SugarGrams { get; set; }
}
