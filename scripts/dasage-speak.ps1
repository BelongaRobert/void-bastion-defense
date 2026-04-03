# DaSage Voice Generator (Windows TTS - No Download)
# Uses built-in Windows SAPI voices

param(
    [Parameter(Mandatory=$true)]
    [string]$Text,
    
    [string]$OutputPath = "$env:TEMP\dasage-voice.wav",
    [string]$Voice = "Microsoft David Desktop",  # or "Microsoft Zira Desktop"
    [int]$Rate = 0,  # -10 to 10
    [int]$Volume = 100  # 0 to 100
)

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# Get available voices
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
Write-Host "Available voices: $($voices -join ', ')"

# Set voice
if ($voices -contains $Voice) {
    $synth.SelectVoice($Voice)
} else {
    Write-Host "Voice '$Voice' not found. Using default."
}

# Configure
$synth.Rate = $Rate
$synth.Volume = $Volume

# Generate speech
Write-Host "Generating voice for: $Text"
$synth.SetOutputToWaveFile($OutputPath)
$synth.Speak($Text)
$synth.SetOutputToDefaultAudioDevice()
$synth.Dispose()

Write-Host "Voice saved to: $OutputPath"

# Convert to OGG for Telegram
$ffmpeg = "C:\tools\ffmpeg\bin\ffmpeg.exe"
if (Test-Path $ffmpeg) {
    $oggPath = $OutputPath -replace '\.wav$', '.ogg'
    & $ffmpeg -y -i $OutputPath -c:a libopus -b:a 24k $oggPath 2>$null
    Write-Host "Converted to OGG: $oggPath"
    return $oggPath
} else {
    return $OutputPath
}
