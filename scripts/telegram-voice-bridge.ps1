# Telegram Voice Bridge for DaSage
# Generates voice using ElevenLabs and sends to Telegram

param(
    [Parameter(Mandatory=$true)]
    [string]$Text,
    
    [string]$ChatId = "8666283585",
    [string]$BotToken = "8789992079:AAFsCvDBTz53VAizLypOKwp6wLmSwIgL4Nw",
    [string]$ApiKey = "sk_076c3835d63a3060febfc0b6e0e68bbf2b5e692655568504",
    [string]$VoiceId = "pNInz6obpgDQGcFmaJgB"  # Adam (free tier compatible)
)

$tempDir = $env:TEMP
$mp3File = Join-Path $tempDir "dasage-voice-$([Guid]::NewGuid().ToString().Substring(0,8)).mp3"
$oggFile = Join-Path $tempDir "dasage-voice-$([Guid]::NewGuid().ToString().Substring(0,8)).ogg"

try {
    Write-Host "Generating voice..."
    
    # Call ElevenLabs API
    $headers = @{
        "xi-api-key" = $ApiKey
        "Content-Type" = "application/json"
    }
    
    $body = @{
        text = $Text
        model_id = "eleven_turbo_v2_5"
    } | ConvertTo-Json -Compress
    
    Invoke-WebRequest -Uri "https://api.elevenlabs.io/v1/text-to-speech/$VoiceId" `
        -Method POST -Headers $headers -Body $body -OutFile $mp3File
    
    $mp3Size = (Get-Item $mp3File).Length
    Write-Host "Generated MP3: $mp3Size bytes"
    
    # Convert to OGG Opus (Telegram voice format)
    Write-Host "Converting to OGG..."
    $ffmpeg = "C:\tools\ffmpeg\bin\ffmpeg.exe"
    if (-not (Test-Path $ffmpeg)) {
        Write-Error "ffmpeg not found at $ffmpeg"
        exit 1
    }
    
    & $ffmpeg -y -i $mp3File -c:a libopus -b:a 24k -vn $oggFile 2>$null
    
    $oggSize = (Get-Item $oggFile).Length
    Write-Host "Generated OGG: $oggSize bytes"
    
    # Send to Telegram
    Write-Host "Sending to Telegram..."
    $uri = "https://api.telegram.org/bot$BotToken/sendVoice"
    $form = @{
        chat_id = $ChatId
        voice = Get-Item $oggFile
    }
    
    Invoke-WebRequest -Uri $uri -Method POST -Form $form | Out-Null
    
    Write-Host "Voice message sent successfully!"
    
} catch {
    Write-Error "Failed: $_"
} finally {
    # Cleanup
    if (Test-Path $mp3File) { Remove-Item $mp3File -Force }
    if (Test-Path $oggFile) { Remove-Item $oggFile -Force }
}
