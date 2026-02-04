namespace ProjectTemplate.Api.Models;

public class TransformAnalyzeRequest
{
    public string ImageUrl { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Goal { get; set; }
    public string? Personality { get; set; }
}

public class TransformAnalyzeResponse
{
    public string Greeting { get; set; } = string.Empty;
    public string FaceShape { get; set; } = string.Empty;
    public string SkinTone { get; set; } = string.Empty;
    public string SkinSubtone { get; set; } = string.Empty;
    public ColorimetryResult Colorimetry { get; set; } = new();
    public ClothingResult Clothing { get; set; } = new();
    public HairResult Hair { get; set; } = new();
    public SkincareResult Skincare { get; set; } = new();
    public SocialMediaResult SocialMedia { get; set; } = new();
    public SelfEsteemResult SelfEsteem { get; set; } = new();
    public string DailyMessage { get; set; } = string.Empty;
}

public class ColorimetryResult
{
    public string Season { get; set; } = string.Empty;
    public List<string> BestColors { get; set; } = new();
    public List<string> AvoidColors { get; set; } = new();
    public string MakeupTips { get; set; } = string.Empty;
    public string AccessoryColors { get; set; } = string.Empty;
}

public class ClothingResult
{
    public string BodyType { get; set; } = string.Empty;
    public List<string> BestStyles { get; set; } = new();
    public List<string> BestCuts { get; set; } = new();
    public List<string> Fabrics { get; set; } = new();
    public List<string> Avoid { get; set; } = new();
    public string Tips { get; set; } = string.Empty;
}

public class HairResult
{
    public string CurrentType { get; set; } = string.Empty;
    public List<string> BestHairstyles { get; set; } = new();
    public List<string> BestCuts { get; set; } = new();
    public List<string> CareRoutine { get; set; } = new();
    public string Tips { get; set; } = string.Empty;
}

public class SkincareResult
{
    public List<string> GuaSha { get; set; } = new();
    public List<string> LymphaticDrainage { get; set; } = new();
    public List<string> FacialExercises { get; set; } = new();
    public List<string> DailyRoutine { get; set; } = new();
    public string AntiAging { get; set; } = string.Empty;
}

public class SocialMediaResult
{
    public string ContentType { get; set; } = string.Empty;
    public List<string> Platforms { get; set; } = new();
    public string VisualStyle { get; set; } = string.Empty;
    public List<string> VideoIdeas { get; set; } = new();
    public string Tips { get; set; } = string.Empty;
}

public class SelfEsteemResult
{
    public string Observation { get; set; } = string.Empty;
    public List<string> Strengths { get; set; } = new();
    public string Affirmation { get; set; } = string.Empty;
    public string DailyHabit { get; set; } = string.Empty;
    public string InnerDialogue { get; set; } = string.Empty;
}
