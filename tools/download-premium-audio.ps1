$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'PREMIUM-AUDIO-SOURCES.json') -Raw | ConvertFrom-Json
$assets = Join-Path $root 'public\assets'
$voiceDir = Join-Path $assets 'narration'
$effectsDir = Join-Path $assets 'premium-sfx'
New-Item -ItemType Directory -Force -Path $voiceDir,$effectsDir | Out-Null
$items = @()
foreach ($chapter in $manifest.chapters) {
    $name = 'gavelby-{0:D2}.mp3' -f [int]$chapter.chapter
    $items += [pscustomobject]@{ Url = [string]$chapter.url; File = (Join-Path $voiceDir $name); Local = '/assets/narration/' + $name }
}
foreach ($p in $manifest.effects.PSObject.Properties) {
    $name = [string]$p.Name + '.mp3'
    $items += [pscustomobject]@{ Url = [string]$p.Value; File = (Join-Path $effectsDir $name); Local = '/assets/premium-sfx/' + $name }
}
$done = 0
$replacements = @()
try {
    foreach ($item in $items) {
        if ($item.Url -notmatch '^https://cdn\.creativeclaw\.co/u/[A-Za-z0-9-]+/audio/[0-9a-f-]+\.mp3$') { throw "Unapproved source URL: $($item.Url)" }
        Write-Host ("Downloading " + (Split-Path $item.File -Leaf))
        $temp = $item.File + '.partial'
        if (Test-Path $temp) { Remove-Item -Force $temp }
        Invoke-WebRequest -Uri $item.Url -OutFile $temp -TimeoutSec 90 -UseBasicParsing
        $file = Get-Item $temp
        if ($file.Length -lt 4000) { throw "Invalid or incomplete MP3: $($file.Name)" }
        $stream = [System.IO.File]::OpenRead($temp)
        try {
          $header = New-Object byte[] 3
          [void]$stream.Read($header,0,3)
          $valid = ([System.Text.Encoding]::ASCII.GetString($header) -eq 'ID3') -or ($header[0] -eq 255 -and (($header[1] -band 224) -eq 224))
          if (-not $valid) { throw "File does not appear to be MP3: $($file.Name)" }
        } finally { $stream.Dispose() }
        Move-Item $temp $item.File -Force
        $done++
        $replacements += $item
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    foreach ($relative in @('public\tutorial-chapters.json', 'public\tutorial.js', 'public\shared.js')) {
        $path = Join-Path $root $relative
        $text = [System.IO.File]::ReadAllText($path)
        foreach ($item in $replacements) { $text = $text.Replace($item.Url,$item.Local) }
        [System.IO.File]::WriteAllText($path,$text,$utf8)
    }
    Write-Host "SUCCESS - $done premium MP3 files downloaded and configured for local playback." -ForegroundColor Green
    exit 0
} catch {
    Write-Host "Download stopped: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'The original Creative Claw streaming URLs remain in the game until every file is downloaded.'
    exit 1
}
