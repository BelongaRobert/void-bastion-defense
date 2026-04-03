# DaSage Voice Responder - Complete Telegram Voice System
# Uses Windows SAPI TTS (built-in, no downloads required)

param(
    [Parameter(Mandatory=$true)]
    [string]$Text,
    
    [string]$ChatId = "8666283585",
    [string]$BotToken = "8789992079:AAFsCvDBTz53VAizLypOKwp6wLmSwIgL4Nw",
    [string]$Voice = "Microsoft David Desktop",  # Deep male voice
    [int]$Rate = -2,  # Slightly slower for clarity
    [int]$Volume = 100
)

# Configuration
$tempDir = $env:TEMP
$wavFile = Join-Path $tempDir "dasage-voice-$([Guid]::NewGuid().ToString().Substring(0,8)).wav"
$oggFile = Join-Path $tempDir "dasage-voice-$([Guid]::NewGuid().ToString().Substring(0,8)).ogg"

try {
    # Initialize Windows Speech
    Add-Type -AssemblyName System.Speech
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    
    # Set voice (try deep male first, fallback to others)
    $preferredVoices = @(
        "Microsoft David Desktop",
        "Microsoft David", 
        "Microsoft Mark",
        "Microsoft Zira Desktop",
        "Microsoft Zira"
    )
    
    $installedVoices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
    
    $voiceSet = $false
    foreach ($v in $preferredVoices) {
        if ($installedVoices -contains $v) {
            try {
                $synth.SelectVoice($v)
                Write-Host "Using voice: $v" -ForegroundColor Green
                $voiceSet = $true
                break
            } catch {
                continue
            }
        }
    }
    
    if (-not $voiceSet) {
        Write-Host "Using default voice" -ForegroundColor Yellow
    }
    
    # Configure speech
    $synth.Rate = $Rate
    $synth.Volume = $Volume
    
    # Generate audio
    Write-Host "Forging voice from the void..." -ForegroundColor Cyan
    $synth.SetOutputToWaveFile($wavFile)
    $synth.Speak($Text)
    $synth.SetOutputToDefaultAudioDevice()
    $synth.Dispose()
    
    # Convert to OGG for Telegram voice messages
    $ffmpeg = "C:\tools\ffmpeg\bin\ffmpeg.exe"
    if (Test-Path $ffmpeg) {
        & $ffmpeg -y -i $wavFile -c:a libopus -b:a 24k $oggFile 2>$null | Out-Null
        $audioFile = $oggFile
        Write-Host "Voice forged and compressed" -ForegroundColor Green
    } else {
        $audioFile = $wavFile
        Write-Host "Voice forged (WAV format)" -ForegroundColor Green
    }
    
    # Send to Telegram
    Write-Host "Transmitting to the warp..." -ForegroundColor Cyan
    $form = @{
        chat_id = $ChatId
        voice = Get-Item $audioFile
    }
    
    $response = Invoke-WebRequest -Uri "https://api.telegram.org/bot$BotToken/sendVoice" `
        -Method POST -Form $form | ConvertFrom-Json
    
    if ($response.ok) {
        Write-Host "Voice message transmitted successfully!" -ForegroundColor Green
    } else {
        Write-Error "Transmission failed: $($response.description)"
    }
    
} catch {
    Write-Error "Voice synthesis failed: $_"
} finally {
    # Cleanup
    if (Test-Path $wavFile) { Remove-Item $wavFile -Force -ErrorAction SilentlyContinue }
    if (Test-Path $oggFile) { Remove-Item $oggFile -Force -ErrorAction SilentlyContinue }
}
