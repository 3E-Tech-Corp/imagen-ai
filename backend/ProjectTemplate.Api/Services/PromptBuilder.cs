namespace ProjectTemplate.Api.Services;

/// <summary>
/// Builds precise AI prompts following strict rules:
/// 1. Literal interpretation - only what the user describes
/// 2. Zero errors - always produce a valid result
/// 3. No added elements not requested by the user
/// </summary>
public static class PromptBuilder
{
    /// <summary>
    /// System instructions that ensure precise, error-free generation
    /// </summary>
    private const string SYSTEM_RULES =
        "Generate EXACTLY what is described. Do not add, omit, or modify elements not explicitly requested. " +
        "If the instruction is ambiguous, resolve it in the most neutral way without inventing additional information. " +
        "Always produce a valid, high-quality result. Maintain visual coherence and consistent style.";

    public static string BuildImagePrompt(string userPrompt, string style, string environment,
        string timePeriod, string lighting, string emotion, string quality)
    {
        var parts = new List<string>();

        // Core: user's exact description comes first
        var stylePrefix = GetStylePrefix(style, "image");
        parts.Add($"{stylePrefix} {userPrompt}");

        // Only add context modifiers if user selected them (not "any")
        AddEnvironment(parts, environment);
        AddTimePeriod(parts, timePeriod);
        AddLighting(parts, lighting);
        AddEmotion(parts, emotion);
        AddQuality(parts, quality);

        // System rules appended
        parts.Add(SYSTEM_RULES);

        return string.Join(", ", parts);
    }

    public static string BuildVideoPrompt(string userPrompt, string style, string environment,
        string timePeriod, string lighting, string emotion, string quality)
    {
        var parts = new List<string>();

        var stylePrefix = GetStylePrefix(style, "video");
        parts.Add($"{stylePrefix} {userPrompt}");

        AddEnvironment(parts, environment);
        AddTimePeriod(parts, timePeriod);
        AddLighting(parts, lighting);
        AddEmotion(parts, emotion);

        parts.Add("smooth motion, cinematic quality, fluid animation");
        AddQuality(parts, quality);

        return string.Join(", ", parts);
    }

    public static string BuildNegativePrompt(string? userNegative)
    {
        var defaults = "blurry, low quality, distorted, deformed, watermark, text overlay, bad anatomy, ugly, duplicate, error, artifacts, noise, pixelated";
        return string.IsNullOrEmpty(userNegative) ? defaults : $"{userNegative}, {defaults}";
    }

    private static string GetStylePrefix(string style, string mediaType)
    {
        if (mediaType == "video")
        {
            return style switch
            {
                "photorealistic" => "Photorealistic cinematic video of",
                "realistic" => "Realistic high-fidelity video of",
                "digital-illustration" => "Animated digital illustration video of",
                "anime" => "High-quality anime-style animated video of",
                "manga" => "Manga-inspired animated sequence of",
                "pixar-3d" => "Pixar-quality 3D animated video of",
                "watercolor" => "Watercolor animation style video of",
                "oil-painting" => "Oil painting animation style video of",
                "pencil-drawing" => "Pencil sketch animation video of",
                "3d-render" => "3D rendered animated video of",
                "cinematic" => "Professional cinematic video of",
                "custom-mix" => "Creative mixed-style video of",
                _ => "High-quality video of"
            };
        }

        return style switch
        {
            "photorealistic" => "Photorealistic high-resolution photograph of",
            "realistic" => "Hyper-realistic detailed depiction of",
            "digital-illustration" => "Professional digital illustration of",
            "anime" => "High-quality detailed anime illustration of",
            "manga" => "Detailed manga-style artwork of",
            "pixar-3d" => "Pixar-quality 3D cinematic rendering of",
            "watercolor" => "Beautiful detailed watercolor painting of",
            "oil-painting" => "Masterful oil painting of",
            "pencil-drawing" => "Detailed pencil drawing of",
            "3d-render" => "High-quality 3D render of",
            "cinematic" => "Cinematic film still of",
            "custom-mix" => "Creative artistic interpretation of",
            _ => "High-quality detailed image of"
        };
    }

    private static void AddEnvironment(List<string> parts, string environment)
    {
        if (environment == "any") return;
        var desc = environment switch
        {
            "interior" => "set in a detailed interior space",
            "exterior" => "set in an outdoor environment",
            "urban" => "in an urban cityscape",
            "nature" => "surrounded by nature",
            "underwater" => "in an underwater environment",
            "space" => "set in outer space",
            "fantasy" => "in a magical fantasy world",
            _ => null
        };
        if (desc != null) parts.Add(desc);
    }

    private static void AddTimePeriod(List<string> parts, string timePeriod)
    {
        if (timePeriod == "any") return;
        var desc = timePeriod switch
        {
            "current" => "modern contemporary setting",
            "medieval" => "medieval era with period-accurate details",
            "renaissance" => "Renaissance era with classical elements",
            "80s" => "1980s retro aesthetic, neon colors, synthwave",
            "90s" => "1990s aesthetic, grunge and early digital era",
            "ancient" => "ancient civilization setting",
            "futuristic" => "near-future sci-fi with advanced technology",
            "far-future" => "distant future with highly advanced technology",
            _ => null
        };
        if (desc != null) parts.Add(desc);
    }

    private static void AddLighting(List<string> parts, string lighting)
    {
        if (lighting == "any") return;
        var desc = lighting switch
        {
            "day" => "bright natural daylight",
            "night" => "nighttime with moonlight",
            "golden-hour" => "golden hour warm sunset lighting",
            "blue-hour" => "blue hour twilight lighting",
            "dramatic" => "dramatic chiaroscuro lighting",
            "neon" => "vibrant neon lighting",
            "soft" => "soft diffused ethereal lighting",
            _ => null
        };
        if (desc != null) parts.Add(desc);
    }

    private static void AddEmotion(List<string> parts, string emotion)
    {
        if (emotion == "any") return;
        var desc = emotion switch
        {
            "happy" => "joyful uplifting atmosphere",
            "dark" => "dark moody atmosphere",
            "mystery" => "mysterious enigmatic atmosphere",
            "epic" => "epic grandiose awe-inspiring scale",
            "calm" => "serene tranquil peaceful atmosphere",
            "romance" => "romantic warm intimate atmosphere",
            "chaos" => "chaotic dynamic explosive energy",
            "melancholy" => "melancholic bittersweet atmosphere",
            "horror" => "eerie unsettling horror atmosphere",
            "wonder" => "sense of wonder and amazement",
            "nostalgia" => "nostalgic warm vintage feeling",
            _ => null
        };
        if (desc != null) parts.Add(desc);
    }

    private static void AddQuality(List<string> parts, string quality)
    {
        var desc = quality switch
        {
            "standard" => "HD quality, clean detailed",
            "high" => "Full HD, highly detailed, sharp focus",
            "ultra" => "Ultra HD 4K, extremely detailed, professional grade, sharp focus, masterful composition",
            "max" => "8K maximum resolution, masterpiece quality, extraordinary detail, perfect composition, award-winning",
            _ => "high quality, detailed"
        };
        parts.Add(desc);
    }
}
