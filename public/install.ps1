$ErrorActionPreference = "Stop"
$repository = "B-Divyesh/sf-retro-save-portability"
$version = "0.1.0"
$base = "https://github.com/$repository/releases/latest/download"
$file = "retro-save-portability_${version}_windows-x64.msi"
$installTemp = Join-Path ([System.IO.Path]::GetTempPath()) ("rsp-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $installTemp | Out-Null
try {
  Write-Host "Downloading $file"
  Invoke-WebRequest "$base/$file" -OutFile (Join-Path $installTemp $file)
  Invoke-WebRequest "$base/SHA256SUMS" -OutFile (Join-Path $installTemp "SHA256SUMS")
  $line = Get-Content (Join-Path $installTemp "SHA256SUMS") | Where-Object { $_ -match ([regex]::Escape($file) + '$') } | Select-Object -First 1
  if (-not $line) { throw "No checksum was published for $file; refusing to install." }
  $expected = ($line -split '\s+')[0].ToLowerInvariant()
  $actual = (Get-FileHash (Join-Path $installTemp $file) -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "SHA-256 mismatch; refusing to install." }
  Write-Host "SHA-256 verified: $actual"
  Start-Process msiexec.exe -ArgumentList "/i", ('"' + (Join-Path $installTemp $file) + '"') -Wait
  Write-Host "Installed Retro Save Portability. Windows may show an unsigned-publisher warning on first launch."
} finally {
  Remove-Item -Recurse -Force $installTemp -ErrorAction SilentlyContinue
}
