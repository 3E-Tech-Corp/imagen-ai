namespace ProjectTemplate.Api.Services;

/// <summary>
/// Builds comprehensive AI prompts from user selections
/// </summary>
public static class PromptBuilder
{
    public static string BuildImagePrompt(string userPrompt, string style, string environment,
        string timePeriod, string lighting, string emotion, string quality)
    {
        var parts = new List<string>();

        // Style prefix
        var stylePrefix = style switch
        {
            "photorealistic" => "Photorealistic photograph of",
            "realistic" => "Highly realistic depiction of",
            "digital-illustration" => "Professional digital illustration of",
            "anime" => "High-quality anime-style illustration of",
            "manga" => "Detailed manga-style artwork of",
            "pixar-3d" => "Pixar-style 3D cinematic rendering of",
            "watercolor" => "Beautiful watercolor painting of",
            "oil-painting" => "Masterful oil painting of",
            "pencil-drawing" => "Detailed pencil drawing of",
            "3d-render" => "High-quality 3D render of",
            "cinematic" => "Cinematic film still of",
            "custom-mix" => "Creative artistic interpretation of",
            _ => "High-quality image of"
        };
        parts.Add($"{stylePrefix} {userPrompt}");

        // Environment
        if (environment != "any")
        {
            var envDesc = environment switch
            {
                "interior" => "set in a detailed interior space",
                "exterior" => "set in an outdoor environment",
                "urban" => "in an urban cityscape",
                "nature" => "surrounded by nature and natural elements",
                "underwater" => "in an underwater environment",
                "space" => "set in outer space",
                "fantasy" => "in a magical fantasy world",
                _ => ""
            };
            if (!string.IsNullOrEmpty(envDesc)) parts.Add(envDesc);
        }

        // Time period
        if (timePeriod != "any")
        {
            var timeDesc = timePeriod switch
            {
                "current" => "in modern contemporary setting",
                "medieval" => "in medieval era setting with period-appropriate details",
                "renaissance" => "in Renaissance era with classical architecture and fashion",
                "80s" => "with 1980s retro aesthetic, neon colors, synthwave vibe",
                "90s" => "with 1990s aesthetic, grunge and early digital era",
                "ancient" => "in ancient civilization setting",
                "futuristic" => "in a near-future sci-fi setting with advanced technology",
                "far-future" => "in a distant future with highly advanced alien technology",
                _ => ""
            };
            if (!string.IsNullOrEmpty(timeDesc)) parts.Add(timeDesc);
        }

        // Lighting
        if (lighting != "any")
        {
            var lightDesc = lighting switch
            {
                "day" => "bright daylight, natural sunlight",
                "night" => "nighttime setting, moonlight and artificial lights",
                "golden-hour" => "golden hour lighting, warm sunset tones",
                "blue-hour" => "blue hour twilight, cool atmospheric lighting",
                "dramatic" => "dramatic chiaroscuro lighting, strong contrast",
                "neon" => "neon lighting, vibrant glowing colors",
                "soft" => "soft diffused lighting, gentle and ethereal",
                _ => ""
            };
            if (!string.IsNullOrEmpty(lightDesc)) parts.Add(lightDesc);
        }

        // Emotion/atmosphere
        if (emotion != "any")
        {
            var emotionDesc = emotion switch
            {
                "happy" => "joyful and uplifting atmosphere, warm colors",
                "dark" => "dark moody atmosphere, deep shadows",
                "mystery" => "mysterious and enigmatic atmosphere, fog and intrigue",
                "epic" => "epic grandiose scale, awe-inspiring and powerful",
                "calm" => "serene and tranquil atmosphere, peaceful",
                "romance" => "romantic atmosphere, warm intimate feeling",
                "chaos" => "chaotic dynamic energy, explosive movement",
                "melancholy" => "melancholic bittersweet atmosphere, muted tones",
                "horror" => "unsettling horror atmosphere, eerie and disturbing",
                "wonder" => "sense of wonder and amazement, magical feeling",
                "nostalgia" => "nostalgic warm feeling, vintage memory quality",
                _ => ""
            };
            if (!string.IsNullOrEmpty(emotionDesc)) parts.Add(emotionDesc);
        }

        // Quality
        var qualityDesc = quality switch
        {
            "standard" => "HD quality, clean and detailed",
            "high" => "Full HD quality, highly detailed, sharp focus",
            "ultra" => "Ultra HD 4K quality, extremely detailed, professional grade, sharp focus",
            "max" => "8K resolution, maximum detail, masterpiece quality, perfect composition, award-winning",
            _ => "high quality, detailed"
        };
        parts.Add(qualityDesc);

        return string.Join(", ", parts);
    }

    public static string BuildVideoPrompt(string userPrompt, string style, string environment,
        string timePeriod, string lighting, string emotion, string quality)
    {
        var parts = new List<string>();

        var stylePrefix = style switch
        {
            "photorealistic" => "Photorealistic cinematic video of",
            "realistic" => "Realistic video footage of",
            "digital-illustration" => "Animated digital illustration of",
            "anime" => "Anime-style animated video of",
            "manga" => "Manga-inspired animated sequence of",
            "pixar-3d" => "Pixar-quality 3D animated video of",
            "watercolor" => "Watercolor animated style video of",
            "oil-painting" => "Oil painting animated style video of",
            "pencil-drawing" => "Pencil sketch animated video of",
            "3d-render" => "3D rendered animated video of",
            "cinematic" => "Cinematic quality video of",
            _ => "High-quality video of"
        };
        parts.Add($"{stylePrefix} {userPrompt}");

        // Add same modifiers as images
        if (environment != "any")
        {
            var envDesc = environment switch
            {
                "interior" => "interior setting",
                "exterior" => "outdoor environment",
                "urban" => "urban cityscape",
                "nature" => "natural environment",
                "underwater" => "underwater scene",
                "space" => "outer space",
                "fantasy" => "fantasy world",
                _ => ""
            };
            if (!string.IsNullOrEmpty(envDesc)) parts.Add(envDesc);
        }

        if (lighting != "any")
        {
            var lightDesc = lighting switch
            {
                "day" => "daylight",
                "night" => "nighttime",
                "golden-hour" => "golden hour lighting",
                "blue-hour" => "blue hour twilight",
                "dramatic" => "dramatic lighting",
                "neon" => "neon lighting",
                "soft" => "soft lighting",
                _ => ""
            };
            if (!string.IsNullOrEmpty(lightDesc)) parts.Add(lightDesc);
        }

        if (emotion != "any")
        {
            var emotionDesc = emotion switch
            {
                "happy" => "joyful atmosphere",
                "dark" => "dark moody atmosphere",
                "mystery" => "mysterious atmosphere",
                "epic" => "epic grandiose feeling",
                "calm" => "serene peaceful atmosphere",
                "romance" => "romantic atmosphere",
                "chaos" => "chaotic energy",
                _ => ""
            };
            if (!string.IsNullOrEmpty(emotionDesc)) parts.Add(emotionDesc);
        }

        parts.Add("smooth motion, cinematic quality, high detail");

        return string.Join(", ", parts);
    }

    public static string BuildNegativePrompt(string? userNegative)
    {
        var defaults = "blurry, low quality, distorted, deformed, watermark, text, bad anatomy, ugly, duplicate, error";
        return string.IsNullOrEmpty(userNegative) ? defaults : $"{userNegative}, {defaults}";
    }
}
