using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ProjectTemplate.Api.Services;

public class TtsService
{
    private readonly IConfiguration _config;
    private readonly ILogger<TtsService> _logger;
    private readonly HttpClient _httpClient;

    public TtsService(IConfiguration config, ILogger<TtsService> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient();
    }

    /// <summary>
    /// Generate speech from text using OpenAI TTS API.
    /// Supports all languages automatically (the model detects the language from the text).
    /// </summary>
    public async Task<byte[]> GenerateSpeechAsync(string text, string language, string gender)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
            throw new InvalidOperationException("OpenAI API key not configured");

        // OpenAI TTS voices:
        // Female-sounding: nova (warm), shimmer (expressive), alloy (neutral)
        // Male-sounding: echo (deep), fable (British), onyx (authoritative)
        var voice = gender == "male" ? "onyx" : "nova";

        var requestBody = new
        {
            model = "tts-1-hd",
            input = text,
            voice = voice,
            response_format = "mp3",
            speed = 1.0
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/audio/speech");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("OpenAI TTS error: {Status} {Body}", response.StatusCode, errorBody);
            throw new Exception($"TTS API error: {response.StatusCode}");
        }

        return await response.Content.ReadAsByteArrayAsync();
    }
}
