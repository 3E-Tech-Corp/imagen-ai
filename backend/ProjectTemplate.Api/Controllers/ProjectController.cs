using Microsoft.AspNetCore.Mvc;
using ProjectTemplate.Api.Models;
using ProjectTemplate.Api.Services;

namespace ProjectTemplate.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class ProjectController : ControllerBase
{
    private readonly ProjectService _projectService;
    private readonly ILogger<ProjectController> _logger;

    public ProjectController(ProjectService projectService, ILogger<ProjectController> logger)
    {
        _projectService = projectService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var projects = await _projectService.GetAllProjectsAsync();
            return Ok(projects);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get projects");
            return StatusCode(500, new { message = "Error al cargar proyectos." });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        try
        {
            var project = await _projectService.GetProjectAsync(id);
            if (project == null) return NotFound(new { message = "Proyecto no encontrado." });
            return Ok(project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get project {Id}", id);
            return StatusCode(500, new { message = "Error al cargar el proyecto." });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "El nombre del proyecto es requerido." });

        try
        {
            var project = await _projectService.CreateProjectAsync(request);
            return Ok(project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create project");
            return StatusCode(500, new { message = "Error al crear proyecto." });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] CreateProjectRequest request)
    {
        try
        {
            var project = await _projectService.UpdateProjectAsync(id, request);
            if (project == null) return NotFound(new { message = "Proyecto no encontrado." });
            return Ok(project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update project {Id}", id);
            return StatusCode(500, new { message = "Error al actualizar proyecto." });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            var deleted = await _projectService.DeleteProjectAsync(id);
            if (!deleted) return NotFound(new { message = "Proyecto no encontrado." });
            return Ok(new { message = "Proyecto eliminado." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete project {Id}", id);
            return StatusCode(500, new { message = "Error al eliminar proyecto." });
        }
    }

    [HttpPost("{id}/items")]
    public async Task<IActionResult> AddItem(string id, [FromBody] AddItemToProjectRequest request)
    {
        try
        {
            request.ProjectId = id;
            var item = await _projectService.AddItemAsync(request);
            return Ok(item);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add item to project {Id}", id);
            return StatusCode(500, new { message = "Error al guardar en el proyecto." });
        }
    }

    [HttpDelete("items/{itemId}")]
    public async Task<IActionResult> RemoveItem(string itemId)
    {
        try
        {
            var deleted = await _projectService.RemoveItemAsync(itemId);
            if (!deleted) return NotFound(new { message = "Item no encontrado." });
            return Ok(new { message = "Item eliminado." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove item {Id}", itemId);
            return StatusCode(500, new { message = "Error al eliminar." });
        }
    }

    [HttpPost("{id}/reference")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB max
    public async Task<IActionResult> UploadReference(string id, IFormFile file, [FromForm] string? notes)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Selecciona una imagen." });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Solo se permiten imágenes (JPG, PNG, WebP, GIF)." });

        try
        {
            var url = await _projectService.SaveReferenceImageAsync(id, file.OpenReadStream(), file.FileName, notes);
            return Ok(new { url, message = "Imagen de referencia guardada." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload reference for project {Id}", id);
            return StatusCode(500, new { message = "Error al subir imagen." });
        }
    }
}
