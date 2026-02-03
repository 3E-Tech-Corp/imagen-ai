using System.Diagnostics;
using ProjectTemplate.Api.Models;

namespace ProjectTemplate.Api.Services;

public class VideoEditService
{
    private readonly TtsService _ttsService;
    private readonly ILogger<VideoEditService> _logger;
    private readonly IWebHostEnvironment _env;

    public VideoEditService(TtsService ttsService, ILogger<VideoEditService> logger, IWebHostEnvironment env)
    {
        _ttsService = ttsService;
        _logger = logger;
        _env = env;
    }

    public async Task<string> EditVideoAsync(VideoEditRequest request)
    {
        var outputDir = Path.Combine(_env.ContentRootPath, "wwwroot", "videos");
        Directory.CreateDirectory(outputDir);

        var tempDir = Path.Combine(Path.GetTempPath(), $"imagen-ai-{Guid.NewGuid()}");
        Directory.CreateDirectory(tempDir);

        try
        {
            // Download original video
            var inputPath = Path.Combine(tempDir, "input.mp4");
            using (var httpClient = new HttpClient())
            {
                var videoBytes = await httpClient.GetByteArrayAsync(request.VideoUrl);
                await File.WriteAllBytesAsync(inputPath, videoBytes);
            }

            var currentInput = inputPath;
            var stepIndex = 0;

            // Step 1: Trim
            if (request.TrimStart > 0 || (request.TrimEnd > 0 && request.TrimEnd != request.TrimStart))
            {
                var trimOutput = Path.Combine(tempDir, $"step{++stepIndex}_trim.mp4");
                var duration = request.TrimEnd - request.TrimStart;
                await RunFfmpeg($"-i \"{currentInput}\" -ss {request.TrimStart:F2} -t {duration:F2} -c copy \"{trimOutput}\"");
                currentInput = trimOutput;
            }

            // Step 2: Speed
            if (request.Speed != 1 && request.Speed > 0)
            {
                var speedOutput = Path.Combine(tempDir, $"step{++stepIndex}_speed.mp4");
                var videoSpeed = 1.0 / request.Speed;
                var audioSpeed = request.Speed;
                await RunFfmpeg($"-i \"{currentInput}\" -filter_complex \"[0:v]setpts={videoSpeed:F4}*PTS[v];[0:a]atempo={audioSpeed:F4}[a]\" -map \"[v]\" -map \"[a]\" \"{speedOutput}\"");
                currentInput = speedOutput;
            }

            // Step 3: Filter
            if (request.Filter != "none")
            {
                var filterOutput = Path.Combine(tempDir, $"step{++stepIndex}_filter.mp4");
                var ffmpegFilter = request.Filter switch
                {
                    "grayscale" => "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3",
                    "sepia" => "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
                    "contrast" => "eq=contrast=1.5",
                    "brightness" => "eq=brightness=0.1",
                    "blur" => "boxblur=2:1",
                    "saturate" => "eq=saturation=2",
                    "vintage" => "curves=vintage",
                    _ => ""
                };

                if (!string.IsNullOrEmpty(ffmpegFilter))
                {
                    await RunFfmpeg($"-i \"{currentInput}\" -vf \"{ffmpegFilter}\" -c:a copy \"{filterOutput}\"");
                    currentInput = filterOutput;
                }
            }

            // Step 4: Text overlay
            if (request.TextOverlay != null && !string.IsNullOrEmpty(request.TextOverlay.Text))
            {
                var textOutput = Path.Combine(tempDir, $"step{++stepIndex}_text.mp4");
                var escapedText = request.TextOverlay.Text.Replace("'", "\\'").Replace(":", "\\:");
                var yPos = request.TextOverlay.Position switch
                {
                    "top" => "y=30",
                    "center" => "y=(h-text_h)/2",
                    _ => "y=h-th-30"
                };
                var color = request.TextOverlay.Color.Replace("#", "");

                await RunFfmpeg(
                    $"-i \"{currentInput}\" -vf \"drawtext=text='{escapedText}':" +
                    $"fontsize={request.TextOverlay.FontSize}:fontcolor=0x{color}:" +
                    $"x=(w-text_w)/2:{yPos}:borderw=2:bordercolor=black\" " +
                    $"-c:a copy \"{textOutput}\"");
                currentInput = textOutput;
            }

            // Step 5: Voiceover
            if (request.Voiceover != null && !string.IsNullOrEmpty(request.Voiceover.Text))
            {
                var audioBytes = await _ttsService.GenerateSpeechAsync(
                    request.Voiceover.Text, request.Voiceover.Language, request.Voiceover.Gender);
                var audioPath = Path.Combine(tempDir, "voiceover.mp3");
                await File.WriteAllBytesAsync(audioPath, audioBytes);

                var voiceOutput = Path.Combine(tempDir, $"step{++stepIndex}_voice.mp4");
                // Mix original audio (if any) with voiceover
                await RunFfmpeg(
                    $"-i \"{currentInput}\" -i \"{audioPath}\" " +
                    $"-filter_complex \"[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]\" " +
                    $"-map 0:v -map \"[a]\" -c:v copy -shortest \"{voiceOutput}\"");
                currentInput = voiceOutput;
            }

            // Copy final result to output directory
            var outputFileName = $"{Guid.NewGuid()}.mp4";
            var outputPath = Path.Combine(outputDir, outputFileName);
            File.Copy(currentInput, outputPath);

            return $"/videos/{outputFileName}";
        }
        finally
        {
            // Clean up temp directory
            try { Directory.Delete(tempDir, true); } catch { /* ignore */ }
        }
    }

    private async Task RunFfmpeg(string arguments)
    {
        _logger.LogInformation("Running FFmpeg: {Args}", arguments);

        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = $"-y {arguments}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            }
        };

        process.Start();
        var stderr = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            _logger.LogError("FFmpeg failed: {Error}", stderr);
            throw new Exception($"FFmpeg failed with exit code {process.ExitCode}");
        }

        _logger.LogInformation("FFmpeg completed successfully");
    }
}
