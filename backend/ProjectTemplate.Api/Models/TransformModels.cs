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

    // 1. Colorimetría
    public ColorimetryResult Colorimetry { get; set; } = new();
    // 2. Ropa Perfecta
    public ClothingResult Clothing { get; set; } = new();
    // 3. Peinados + Cuidado Capilar
    public HairResult Hair { get; set; } = new();
    // 4. Rutina de Gua Sha
    public GuaShaResult GuaSha { get; set; } = new();
    // 5. Drenaje Linfático
    public LymphaticDrainageResult LymphaticDrainage { get; set; } = new();
    // 6. Glow Up
    public GlowUpResult GlowUp { get; set; } = new();
    // 7. Técnicas Faciales Rejuvenecedoras
    public FacialTechniquesResult FacialTechniques { get; set; } = new();
    // 8. Crecimiento en Redes
    public SocialMediaResult SocialMedia { get; set; } = new();
    // 9. Contenido según Personalidad
    public PersonalityContentResult PersonalityContent { get; set; } = new();
    // 10. Autoestima y Amor Propio
    public SelfEsteemResult SelfEsteem { get; set; } = new();
    // 11. Rutinas Diarias de Crecimiento
    public DailyGrowthResult DailyGrowth { get; set; } = new();
    // 12. Ganas de Vivir
    public JoyOfLivingResult JoyOfLiving { get; set; } = new();
    // 13. Diálogos Internos Guiados
    public InnerDialogueResult InnerDialogue { get; set; } = new();
    // 14. Mensaje del Día
    public string DailyMessage { get; set; } = string.Empty;
}

// 1. Colorimetría
public class ColorimetryResult
{
    public string Season { get; set; } = string.Empty;
    public List<string> BestColors { get; set; } = new();
    public List<string> RejuvenatingColors { get; set; } = new();
    public List<string> AuthorityColors { get; set; } = new();
    public List<string> SweetnessColors { get; set; } = new();
    public List<string> SensualityColors { get; set; } = new();
    public List<string> AvoidColors { get; set; } = new();
    public string ClothingUse { get; set; } = string.Empty;
    public string MakeupUse { get; set; } = string.Empty;
    public string AccessoryUse { get; set; } = string.Empty;
}

// 2. Ropa Perfecta
public class ClothingResult
{
    public string BodyType { get; set; } = string.Empty;
    public List<string> IdealGarments { get; set; } = new();
    public List<string> SlimmingCuts { get; set; } = new();
    public List<string> Fabrics { get; set; } = new();
    public string ConfidentLook { get; set; } = string.Empty;
    public string ElegantLook { get; set; } = string.Empty;
    public List<string> MistakesToAvoid { get; set; } = new();
    public string Tips { get; set; } = string.Empty;
}

// 3. Peinados + Cuidado Capilar
public class HairResult
{
    public string CurrentType { get; set; } = string.Empty;
    public List<string> HarmoniousStyles { get; set; } = new();
    public List<string> IdealCuts { get; set; } = new();
    public List<string> CareRoutine { get; set; } = new();
    public List<string> ShineStrengthGrowth { get; set; } = new();
    public List<string> AgingHabits { get; set; } = new();
    public string Tips { get; set; } = string.Empty;
}

// 4. Rutina de Gua Sha
public class GuaShaResult
{
    public string Technique { get; set; } = string.Empty;
    public List<string> KeyZones { get; set; } = new();
    public string DailyTime { get; set; } = string.Empty;
    public List<string> Benefits { get; set; } = new();
    public string WithLove { get; set; } = string.Empty;
    public List<string> Steps { get; set; } = new();
}

// 5. Drenaje Linfático
public class LymphaticDrainageResult
{
    public List<string> FacialNeckChin { get; set; } = new();
    public List<string> FacialCheekbones { get; set; } = new();
    public List<string> BodyAbdomen { get; set; } = new();
    public List<string> BodyLegsArms { get; set; } = new();
    public string Frequency { get; set; } = string.Empty;
    public List<string> ExpectedResults { get; set; } = new();
}

// 6. Glow Up
public class GlowUpResult
{
    public string AgeGroup { get; set; } = string.Empty;
    public List<string> Routines { get; set; } = new();
    public List<string> Techniques { get; set; } = new();
    public List<string> Habits { get; set; } = new();
    public string Motivation { get; set; } = string.Empty;
}

// 7. Técnicas Faciales Rejuvenecedoras
public class FacialTechniquesResult
{
    public List<string> PersonalizedExercises { get; set; } = new();
    public List<string> FirmingMassages { get; set; } = new();
    public List<string> ShortRoutines { get; set; } = new();
    public List<string> AgingMistakes { get; set; } = new();
}

// 8. Crecimiento en Redes
public class SocialMediaResult
{
    public string IdealContentType { get; set; } = string.Empty;
    public List<string> Platforms { get; set; } = new();
    public string VisualStyle { get; set; } = string.Empty;
    public List<string> VideoIdeas { get; set; } = new();
    public string ShowUpAuthentically { get; set; } = string.Empty;
}

// 9. Contenido según Personalidad
public class PersonalityContentResult
{
    public string WhatToShow { get; set; } = string.Empty;
    public string WhatToProtect { get; set; } = string.Empty;
    public string OnCameraTips { get; set; } = string.Empty;
    public List<string> MagneticQualities { get; set; } = new();
    public string Differentiation { get; set; } = string.Empty;
}

// 10. Autoestima y Amor Propio
public class SelfEsteemResult
{
    public string Observation { get; set; } = string.Empty;
    public List<string> Strengths { get; set; } = new();
    public string Affirmation { get; set; } = string.Empty;
    public string DailyHabit { get; set; } = string.Empty;
    public string InnerDialogueTip { get; set; } = string.Empty;
    public List<string> BoostTricks { get; set; } = new();
    public string StopComparing { get; set; } = string.Empty;
    public string SetBoundaries { get; set; } = string.Empty;
}

// 11. Rutinas Diarias de Crecimiento
public class DailyGrowthResult
{
    public List<string> MicroHabits { get; set; } = new();
    public List<string> SelfEsteemExercises { get; set; } = new();
    public List<string> ThoughtReprogramming { get; set; } = new();
    public List<string> SelfCareRituals { get; set; } = new();
}

// 12. Ganas de Vivir
public class JoyOfLivingResult
{
    public List<string> PurposeReminders { get; set; } = new();
    public List<string> ReconnectExercises { get; set; } = new();
    public List<string> LowDayTechniques { get; set; } = new();
    public List<string> LightPhrases { get; set; } = new();
}

// 13. Diálogos Internos Guiados
public class InnerDialogueResult
{
    public string WoundedSelfConversation { get; set; } = string.Empty;
    public string StrongSelfMessages { get; set; } = string.Empty;
    public string PainReframing { get; set; } = string.Empty;
}
