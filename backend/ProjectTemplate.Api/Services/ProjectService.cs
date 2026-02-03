using Dapper;
using Microsoft.Data.SqlClient;
using ProjectTemplate.Api.Models;

namespace ProjectTemplate.Api.Services;

public class ProjectService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ProjectService> _logger;

    public ProjectService(IConfiguration config, ILogger<ProjectService> logger)
    {
        _config = config;
        _logger = logger;
    }

    private SqlConnection GetConnection()
    {
        var connStr = _config.GetConnectionString("DefaultConnection");
        return new SqlConnection(connStr);
    }

    public async Task EnsureTablesAsync()
    {
        try
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            await conn.ExecuteAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
                BEGIN
                    CREATE TABLE Projects (
                        Id NVARCHAR(50) PRIMARY KEY,
                        Name NVARCHAR(200) NOT NULL,
                        Description NVARCHAR(500) NULL,
                        Category NVARCHAR(50) NOT NULL DEFAULT 'general',
                        CoverUrl NVARCHAR(2000) NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                END

                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectItems')
                BEGIN
                    CREATE TABLE ProjectItems (
                        Id NVARCHAR(50) PRIMARY KEY,
                        ProjectId NVARCHAR(50) NOT NULL,
                        Type NVARCHAR(20) NOT NULL,
                        Prompt NVARCHAR(2000) NOT NULL DEFAULT '',
                        Url NVARCHAR(2000) NOT NULL,
                        ThumbnailUrl NVARCHAR(2000) NULL,
                        Style NVARCHAR(50) NOT NULL DEFAULT '',
                        Notes NVARCHAR(500) NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_ProjectItems_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE
                    );
                END");
            _logger.LogInformation("Project tables ensured");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to ensure project tables");
        }
    }

    public async Task<List<ProjectDto>> GetAllProjectsAsync()
    {
        using var conn = GetConnection();
        await conn.OpenAsync();

        var projects = (await conn.QueryAsync<ProjectDto>(@"
            SELECT p.Id, p.Name, p.Description, p.Category, p.CoverUrl,
                   FORMAT(p.CreatedAt, 'o') AS CreatedAt,
                   FORMAT(p.UpdatedAt, 'o') AS UpdatedAt,
                   (SELECT COUNT(*) FROM ProjectItems WHERE ProjectId = p.Id) AS ItemCount
            FROM Projects p
            ORDER BY p.UpdatedAt DESC")).ToList();

        return projects;
    }

    public async Task<ProjectDto?> GetProjectAsync(string id)
    {
        using var conn = GetConnection();
        await conn.OpenAsync();

        var project = await conn.QueryFirstOrDefaultAsync<ProjectDto>(@"
            SELECT p.Id, p.Name, p.Description, p.Category, p.CoverUrl,
                   FORMAT(p.CreatedAt, 'o') AS CreatedAt,
                   FORMAT(p.UpdatedAt, 'o') AS UpdatedAt,
                   (SELECT COUNT(*) FROM ProjectItems WHERE ProjectId = p.Id) AS ItemCount
            FROM Projects p WHERE p.Id = @Id", new { Id = id });

        if (project == null) return null;

        project.Items = (await conn.QueryAsync<ProjectItemDto>(@"
            SELECT Id, ProjectId, Type, Prompt, Url, ThumbnailUrl, Style, Notes,
                   FORMAT(CreatedAt, 'o') AS CreatedAt
            FROM ProjectItems WHERE ProjectId = @Id
            ORDER BY CreatedAt DESC", new { Id = id })).ToList();

        return project;
    }

    public async Task<ProjectDto> CreateProjectAsync(CreateProjectRequest request)
    {
        var id = Guid.NewGuid().ToString();
        using var conn = GetConnection();
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
            INSERT INTO Projects (Id, Name, Description, Category)
            VALUES (@Id, @Name, @Description, @Category)",
            new { Id = id, request.Name, request.Description, request.Category });

        return (await GetProjectAsync(id))!;
    }

    public async Task<ProjectDto?> UpdateProjectAsync(string id, CreateProjectRequest request)
    {
        using var conn = GetConnection();
        await conn.OpenAsync();

        var rows = await conn.ExecuteAsync(@"
            UPDATE Projects SET Name = @Name, Description = @Description,
                   Category = @Category, UpdatedAt = GETUTCDATE()
            WHERE Id = @Id",
            new { Id = id, request.Name, request.Description, request.Category });

        return rows > 0 ? await GetProjectAsync(id) : null;
    }

    public async Task<bool> DeleteProjectAsync(string id)
    {
        using var conn = GetConnection();
        await conn.OpenAsync();
        var rows = await conn.ExecuteAsync("DELETE FROM Projects WHERE Id = @Id", new { Id = id });
        return rows > 0;
    }

    public async Task<ProjectItemDto> AddItemAsync(AddItemToProjectRequest request)
    {
        var id = Guid.NewGuid().ToString();
        using var conn = GetConnection();
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
            INSERT INTO ProjectItems (Id, ProjectId, Type, Prompt, Url, ThumbnailUrl, Style, Notes)
            VALUES (@Id, @ProjectId, @Type, @Prompt, @Url, @ThumbnailUrl, @Style, @Notes);
            UPDATE Projects SET UpdatedAt = GETUTCDATE(),
                   CoverUrl = COALESCE(CoverUrl, @Url)
            WHERE Id = @ProjectId",
            new { Id = id, request.ProjectId, request.Type, request.Prompt,
                  request.Url, request.ThumbnailUrl, request.Style, request.Notes });

        return new ProjectItemDto
        {
            Id = id,
            ProjectId = request.ProjectId,
            Type = request.Type,
            Prompt = request.Prompt,
            Url = request.Url,
            ThumbnailUrl = request.ThumbnailUrl,
            Style = request.Style,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
    }

    public async Task<bool> RemoveItemAsync(string itemId)
    {
        using var conn = GetConnection();
        await conn.OpenAsync();
        var rows = await conn.ExecuteAsync("DELETE FROM ProjectItems WHERE Id = @Id", new { Id = itemId });
        return rows > 0;
    }

    public async Task<string> SaveReferenceImageAsync(string projectId, Stream imageStream, string fileName, string? notes)
    {
        // Save to wwwroot/references/{projectId}/
        var refDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "references", projectId);
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

        // Add as project item
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
