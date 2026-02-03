using System.Collections.Concurrent;

namespace ProjectTemplate.Api.Services;

public class VideoGenerationJob
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = "generating"; // "generating", "completed", "failed"
    public string? Url { get; set; }
    public string? Error { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string Type { get; set; } = "video";
    public string Style { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public DateTime InternalCreatedAt { get; set; }
}

public class VideoJobService
{
    private readonly ConcurrentDictionary<string, VideoGenerationJob> _jobs = new();
    private readonly ILogger<VideoJobService> _logger;
    private Timer? _cleanupTimer;

    public VideoJobService(ILogger<VideoJobService> logger)
    {
        _logger = logger;
        // Clean up old jobs every 5 minutes
        _cleanupTimer = new Timer(CleanupOldJobs, null, TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
    }

    public VideoGenerationJob CreateJob(string prompt, string style)
    {
        var job = new VideoGenerationJob
        {
            Id = Guid.NewGuid().ToString(),
            Status = "generating",
            Prompt = prompt,
            Type = "video",
            Style = style,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            InternalCreatedAt = DateTime.UtcNow
        };

        _jobs[job.Id] = job;
        _logger.LogInformation("Video job created: {JobId}", job.Id);
        return job;
    }

    public VideoGenerationJob? GetJob(string jobId)
    {
        _jobs.TryGetValue(jobId, out var job);
        return job;
    }

    public void CompleteJob(string jobId, string videoUrl)
    {
        if (_jobs.TryGetValue(jobId, out var job))
        {
            job.Status = "completed";
            job.Url = videoUrl;
            _logger.LogInformation("Video job completed: {JobId}", jobId);
        }
    }

    public void FailJob(string jobId, string error)
    {
        if (_jobs.TryGetValue(jobId, out var job))
        {
            job.Status = "failed";
            job.Error = error;
            _logger.LogError("Video job failed: {JobId} - {Error}", jobId, error);
        }
    }

    private void CleanupOldJobs(object? state)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-30);
        var keysToRemove = _jobs
            .Where(kvp => kvp.Value.InternalCreatedAt < cutoff)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in keysToRemove)
        {
            _jobs.TryRemove(key, out _);
        }

        if (keysToRemove.Count > 0)
            _logger.LogInformation("Cleaned up {Count} old video jobs", keysToRemove.Count);
    }
}
