namespace ProjectTemplate.Api.Models;

public class ProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "general"; // images, videos, mixed
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public string? CoverUrl { get; set; }
    public List<ProjectItemDto>? Items { get; set; }
}

public class ProjectItemDto
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // image, video, voice, reference
    public string Prompt { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string Style { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class CreateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "general";
}

public class AddItemToProjectRequest
{
    public string ProjectId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string Style { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class UploadReferenceRequest
{
    public string ProjectId { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
