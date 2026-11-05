# Windows one-click startup, with a persistent per-user DPAPI-encrypted recovery key.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root '.local-data'
if (-not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory | Out-Null }
$keyFile = Join-Path $dir 'recovery-key.dpapi'
if (Test-Path $keyFile) {
    $secured = Get-Content -LiteralPath $keyFile -Raw | ConvertTo-SecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secured)
    try { $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
} else {
    $rng = New-Object byte[] 48
    $provider = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $provider.GetBytes($rng) }
    finally { $provider.Dispose() }
    $secret = [Convert]::ToBase64String($rng)
    $secureString = ConvertTo-SecureString $secret -AsPlainText -Force
    ConvertFrom-SecureString $secureString | Set-Content -LiteralPath $keyFile -NoNewline
}
$env:FF_DATA_DIR = $dir
$env:FF_PERSISTENCE_KEY = $secret
Write-Host 'Local encrypted room recovery is enabled.'
# A phone cannot scan a QR code that points to localhost: use this PC's LAN IP
# for the TV as well, so the QR code contains a phone-reachable address.
$lanAddress = $null
try {
    $candidates = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
            -not [System.Net.IPAddress]::IsLoopback($_) -and -not $_.ToString().StartsWith('169.254.') }
    $lanAddress = $candidates |
        Where-Object { $_.ToString() -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' } |
        Select-Object -First 1
    if (-not $lanAddress) { $lanAddress = $candidates | Select-Object -First 1 }
} catch { Write-Host 'Could not identify the PC network address automatically.' }
if ($lanAddress) {
    $tvUrl = 'http://' + $lanAddress.ToString() + ':3000/tv'
    Write-Host ('FOR THE TV: Open ' + $tvUrl)
    Write-Host ('FOR PHONES: The TV QR code now uses ' + $lanAddress.ToString() + ', not localhost.')
    Write-Host 'Your TV and phones must use the same private Wi-Fi or LAN.'
} else {
    Write-Host 'Open http://localhost:3000/tv to test on this PC only.'
    Write-Host 'For phone QR joining: find this PC IPv4 address under Windows Settings > Network & internet, then visit http://YOUR-PC-IP:3000/tv on the TV.'
}
Write-Host 'To stop the game: Ctrl+C.'
Push-Location $root
try { & node server.js }
finally {
    Pop-Location
    $env:FF_PERSISTENCE_KEY = $null
}
