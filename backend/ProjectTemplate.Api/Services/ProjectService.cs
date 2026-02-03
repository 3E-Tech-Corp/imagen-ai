using System.Text.Json;
using ProjectTemplate.Api.Models;

namespace ProjectTemplate.Api.Services;

/// <summary>
/// File-based project storage. Uses JSON files — no database dependency.
/// Projects stored in wwwroot/data/projects/
/// </summary>
public class ProjectService
{
    private readonly ILogger<ProjectService> _logger;
    private readonly string _dataDir;
    private readonly JsonSerializerOptions _jsonOptions;
    private static readonly SemaphoreSlim _lock = new(1, 1);

    public ProjectService(ILogger<ProjectService> logger, IWebHostEnvironment env)
    {
        _logger = logger;
        _dataDir = Path.Combine(env.ContentRootPath, "wwwroot", "data", "projects");
        Directory.CreateDirectory(_dataDir);
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    private string ProjectFile(string id) => Path.Combine(_dataDir, $"{id}.json");

    private async Task<ProjectDto?> ReadProjectAsync(string id)
    {
        var path = ProjectFile(id);
        if (!File.Exists(path)) return null;
        var json = await File.ReadAllTextAsync(path);
        return JsonSerializer.Deserialize<ProjectDto>(json, _jsonOptions);
    }

    private async Task WriteProjectAsync(ProjectDto project)
    {
        var json = JsonSerializer.Serialize(project, _jsonOptions);
        await File.WriteAllTextAsync(ProjectFile(project.Id), json);
    }

    public async Task<List<ProjectDto>> GetAllProjectsAsync()
    {
        await _lock.WaitAsync();
        try
        {
            var projects = new List<ProjectDto>();
            if (!Directory.Exists(_dataDir)) return projects;

            foreach (var file in Directory.GetFiles(_dataDir, "*.json"))
            {
                try
                {
                    var json = await File.ReadAllTextAsync(file);
                    var project = JsonSerializer.Deserialize<ProjectDto>(json, _jsonOptions);
                    if (project != null)
                    {
                        // Don't include items in list view
                        project.ItemCount = project.Items?.Count ?? 0;
                        if (project.Items?.Count > 0)
                            project.CoverUrl = project.Items.FirstOrDefault(i => i.Type != "reference")?.Url
                                ?? project.Items.FirstOrDefault()?.Url;
                        project.Items = null;
                        projects.Add(project);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to read project file: {File}", file);
                }
            }

            return projects.OrderByDescending(p => p.UpdatedAt).ToList();
        }
        finally { _lock.Release(); }
    }

    public async Task<ProjectDto?> GetProjectAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            var project = await ReadProjectAsync(id);
            if (project != null)
            {
                project.ItemCount = project.Items?.Count ?? 0;
            }
            return project;
        }
        finally { _lock.Release(); }
    }

    public async Task<ProjectDto> CreateProjectAsync(CreateProjectRequest request)
    {
        await _lock.WaitAsync();
        try
        {
            var project = new ProjectDto
            {
                Id = Guid.NewGuid().ToString(),
                Name = request.Name,
                Description = request.Description,
                Category = request.Category,
                CreatedAt = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o"),
                Items = new List<ProjectItemDto>(),
                ItemCount = 0
            };

            await WriteProjectAsync(project);
            _logger.LogInformation("Created project: {Id} - {Name}", project.Id, project.Name);
            return project;
        }
        finally { _lock.Release(); }
    }

    public async Task<ProjectDto?> UpdateProjectAsync(string id, CreateProjectRequest request)
    {
        await _lock.WaitAsync();
        try
        {
            var project = await ReadProjectAsync(id);
            if (project == null) return null;

            project.Name = request.Name;
            project.Description = request.Description;
            project.Category = request.Category;
            project.UpdatedAt = DateTime.UtcNow.ToString("o");

            await WriteProjectAsync(project);
            return project;
        }
        finally { _lock.Release(); }
    }

    public async Task<bool> DeleteProjectAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            var path = ProjectFile(id);
            if (!File.Exists(path)) return false;
            File.Delete(path);

            // Also delete reference images
            var refDir = Path.Combine(Directory.GetParent(_dataDir)!.Parent!.FullName, "references", id);
            if (Directory.Exists(refDir))
                Directory.Delete(refDir, true);

            return true;
        }
        finally { _lock.Release(); }
    }

    public async Task<ProjectItemDto> AddItemAsync(AddItemToProjectRequest request)
    {
        await _lock.WaitAsync();
        try
        {
            var project = await ReadProjectAsync(request.ProjectId);
            if (project == null) throw new Exception("Proyecto no encontrado");

            project.Items ??= new List<ProjectItemDto>();

            var item = new ProjectItemDto
            {
                Id = Guid.NewGuid().ToString(),
                ProjectId = request.ProjectId,
                Type = request.Type,
                Prompt = request.Prompt,
                Url = request.Url,
                ThumbnailUrl = request.ThumbnailUrl,
                Style = request.Style,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow.ToString("o")
            };

            project.Items.Insert(0, item);
            project.UpdatedAt = DateTime.UtcNow.ToString("o");
            project.ItemCount = project.Items.Count;
            project.CoverUrl ??= request.Url;

            await WriteProjectAsync(project);
            return item;
        }
        finally { _lock.Release(); }
    }

    public async Task<bool> RemoveItemAsync(string projectId, string itemId)
    {
        await _lock.WaitAsync();
        try
        {
            // Search all projects if projectId not given
            if (string.IsNullOrEmpty(projectId))
            {
                foreach (var file in Directory.GetFiles(_dataDir, "*.json"))
                {
                    var json = await File.ReadAllTextAsync(file);
                    var p = JsonSerializer.Deserialize<ProjectDto>(json, _jsonOptions);
                    if (p?.Items?.Any(i => i.Id == itemId) == true)
                    {
                        p.Items.RemoveAll(i => i.Id == itemId);
                        p.ItemCount = p.Items.Count;
                        p.UpdatedAt = DateTime.UtcNow.ToString("o");
                        await File.WriteAllTextAsync(file, JsonSerializer.Serialize(p, _jsonOptions));
                        return true;
                    }
                }
                return false;
            }

            var project = await ReadProjectAsync(projectId);
            if (project?.Items == null) return false;

            var removed = project.Items.RemoveAll(i => i.Id == itemId) > 0;
            if (removed)
            {
                project.ItemCount = project.Items.Count;
                project.UpdatedAt = DateTime.UtcNow.ToString("o");
                await WriteProjectAsync(project);
            }
            return removed;
        }
        finally { _lock.Release(); }
    }

    public async Task<string> SaveReferenceImageAsync(string projectId, Stream imageStream, string fileName, string? notes)
    {
        var refDir = Path.Combine(Directory.GetParent(_dataDir)!.Parent!.FullName, "references", projectId);
        Directory.CreateDirectory(refDir);

        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
        var savedName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(refDir, savedName);

        using (var fs = new FileStream(filePath, FileMode.Create))
        {
            await imageStream.CopyToAsync(fs);
        }

        var url = $"/references/{projectId}/{savedName}";

        await AddItemAsync(new AddItemToProjectRequest
        {
            ProjectId = projectId,
            Type = "reference",
            Prompt = notes ?? "Imagen de referencia",
            Url = url,
            Style = "reference",
            Notes = notes
        });

        return url;
    }
}
