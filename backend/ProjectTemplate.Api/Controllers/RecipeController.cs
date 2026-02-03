using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class RecipeController : ControllerBase
{
    private readonly RecipeService _recipeService;
    private readonly ImageGenerationService _imageService;
    private readonly ILogger<RecipeController> _logger;

    public RecipeController(
        RecipeService recipeService,
        ImageGenerationService imageService,
        ILogger<RecipeController> logger)
    {
        _recipeService = recipeService;
        _imageService = imageService;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateRecipes([FromBody] RecipeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Ingredients))
            return BadRequest(new { message = "Por favor escribe los ingredientes que tienes." });

        try
        {
            _logger.LogInformation("Generating recipes for: {Ingredients}", request.Ingredients);

            var result = await _recipeService.GenerateRecipesAsync(
                request.Ingredients,
                request.MealType ?? "any",
                request.DietPreference ?? "healthy",
                request.Count > 0 ? Math.Min(request.Count, 5) : 3
            );

            // Generate images for each recipe (in parallel)
            if (result.Recipes != null && request.IncludeImages)
            {
                var imageTasks = result.Recipes.Select(async recipe =>
                {
                    try
                    {
                        var imageRequest = new Models.GenerationRequest
                        {
                            Prompt = recipe.ImagePrompt,
                            Type = "image",
                            Style = "photorealistic",
                            Environment = "interior",
                            TimePeriod = "any",
                            Lighting = "soft",
                            Emotion = "any",
                            Quality = "standard"
                        };
                        var media = await _imageService.GenerateImageAsync(imageRequest);
                        recipe.ImageUrl = media.Url;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to generate image for recipe: {Name}", recipe.Name);
                        // Image is optional — don't fail the whole recipe
                    }
                });

                await Task.WhenAll(imageTasks);
            }

            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key") || ex.Message.Contains("not configured"))
        {
            return StatusCode(503, new { message = "El servicio de recetas necesita ser configurado. Contacta al administrador." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Recipe generation failed");
            return StatusCode(500, new { message = "No se pudieron generar recetas. Intenta de nuevo." });
        }
    }
}

public class RecipeRequest
{
    public string Ingredients { get; set; } = "";
    public string? MealType { get; set; }
    public string? DietPreference { get; set; }
    public int Count { get; set; } = 3;
    public bool IncludeImages { get; set; } = true;
}
