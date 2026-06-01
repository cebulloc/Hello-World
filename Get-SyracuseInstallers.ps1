#Requires -Version 5.1
<#
.SYNOPSIS
    Downloads all auto-fetchable Syracuse installers into .\Installers\
.DESCRIPTION
    Run this script ONCE on any machine with internet access.
    It populates the Installers\ folder so Deploy-Syracuse.ps1 can run
    in fully-staged (offline) mode.

    After it finishes, manually add:
      - VSCodeSetup-x64.exe         https://code.visualstudio.com/download  (Windows > System x64)
      - TortoiseGit-x-64bit.msi     https://tortoisegit.org/download/
      - MobaXterm_installer_x.y.msi https://mobaxterm.mobatek.net/download-home-edition.html
      - basic-miktex-xx-x64.exe     https://miktex.org/download
      - ssh-wrapper.bat             copy from your existing TTT staging share
#>

$out = Join-Path $PSScriptRoot 'Installers'
if (-not (Test-Path $out)) { New-Item -Path $out -ItemType Directory | Out-Null }

$ProgressPreference = 'SilentlyContinue'

function Get-GhAssetUrl {
    param([string]$repo, [string]$pattern)
    $rel = $null
    try { $rel = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -EA Stop } catch {}
    if (-not $rel) {
        $rels = Invoke-RestMethod "https://api.github.com/repos/$repo/releases" -EA SilentlyContinue
        $rel  = $rels | Where-Object { -not $_.prerelease -and -not $_.draft } | Select-Object -First 1
    }
    if (-not $rel) { return $null }
    return ($rel.assets | Where-Object { $_.name -like $pattern } | Select-Object -First 1).browser_download_url
}

function Save-File {
    param([string]$url, [string]$dest, [string]$label)
    if (Test-Path $dest) { Write-Host "  [SKIP] Already exists: $(Split-Path $dest -Leaf)"; return }
    Write-Host "  [DL]   $label..."
    try {
        Invoke-WebRequest $url -OutFile $dest -UseBasicParsing
        Write-Host "  [OK]   $(Split-Path $dest -Leaf)"
    } catch {
        Write-Host "  [FAIL] $label - $_"
    }
}

Write-Host ""
Write-Host "Syracuse Installer Fetch"
Write-Host "Output: $out"
Write-Host "=================================================="

# ------------------------------------------------------------------
# Miniforge3 (Python 3.13)
# ------------------------------------------------------------------
Save-File `
    'https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Windows-x86_64.exe' `
    "$out\Miniforge3-Windows-x86_64.exe" `
    'Miniforge3 (Python 3.13)'

# ------------------------------------------------------------------
# VS Code
# ------------------------------------------------------------------
Save-File `
    'https://update.code.visualstudio.com/latest/win32-x64/stable' `
    "$out\VSCodeSetup-x64.exe" `
    'VS Code'

# ------------------------------------------------------------------
# Git for Windows (latest)
# ------------------------------------------------------------------
Write-Host "  [API]  Resolving Git for Windows..."
$gitUrl = Get-GhAssetUrl 'git-for-windows/git' '*-64-bit.exe'
if ($gitUrl) {
    $gitFile = Join-Path $out ([System.IO.Path]::GetFileName($gitUrl))
    Save-File $gitUrl $gitFile 'Git for Windows'
} else { Write-Host "  [FAIL] Could not resolve Git download URL." }

# ------------------------------------------------------------------
# TortoiseGit (latest)
# ------------------------------------------------------------------
Write-Host "  [API]  Resolving TortoiseGit..."
$tgUrl = Get-GhAssetUrl 'TortoiseGit/TortoiseGit' 'TortoiseGit-*-64bit.msi'
if ($tgUrl) {
    $tgFile = Join-Path $out ([System.IO.Path]::GetFileName($tgUrl))
    Save-File $tgUrl $tgFile 'TortoiseGit'
} else { Write-Host "  [WARN] TortoiseGit not on GitHub releases - download manually from tortoisegit.org/download" }

# ------------------------------------------------------------------
# PuTTY-CAC (latest)
# ------------------------------------------------------------------
Write-Host "  [API]  Resolving PuTTY-CAC..."
$puttyUrl = Get-GhAssetUrl 'NoMoreFood/putty-cac' 'puttycac-*-x64.msi'
if ($puttyUrl) {
    $puttyFile = Join-Path $out ([System.IO.Path]::GetFileName($puttyUrl))
    Save-File $puttyUrl $puttyFile 'PuTTY-CAC'
} else { Write-Host "  [FAIL] Could not resolve PuTTY-CAC download URL." }

# ------------------------------------------------------------------
# TeXstudio (latest)
# ------------------------------------------------------------------
Write-Host "  [API]  Resolving TeXstudio..."
$txsUrl = Get-GhAssetUrl 'texstudio-org/texstudio' '*-win-qt*-signed.exe'
if (-not $txsUrl) { $txsUrl = Get-GhAssetUrl 'texstudio-org/texstudio' '*-win-x64.exe' }
if ($txsUrl) {
    $txsFile = Join-Path $out ([System.IO.Path]::GetFileName($txsUrl))
    Save-File $txsUrl $txsFile 'TeXstudio'
} else { Write-Host "  [FAIL] Could not resolve TeXstudio download URL." }

# ------------------------------------------------------------------
# Notepad++ (latest)
# ------------------------------------------------------------------
Write-Host "  [API]  Resolving Notepad++..."
$nppUrl = Get-GhAssetUrl 'notepad-plus-plus/notepad-plus-plus' 'npp.*Installer.x64.exe'
if ($nppUrl) {
    $nppFile = Join-Path $out ([System.IO.Path]::GetFileName($nppUrl))
    Save-File $nppUrl $nppFile 'Notepad++'
} else { Write-Host "  [FAIL] Could not resolve Notepad++ download URL." }

# ------------------------------------------------------------------
# 7-Zip (latest)
# ------------------------------------------------------------------
Write-Host "  [API]  Resolving 7-Zip..."
$zipUrl = Get-GhAssetUrl 'ip7z/7zip' '7z*-x64.exe'
if ($zipUrl) {
    $zipFile = Join-Path $out ([System.IO.Path]::GetFileName($zipUrl))
    Save-File $zipUrl $zipFile '7-Zip'
} else { Write-Host "  [FAIL] Could not resolve 7-Zip download URL." }

# ------------------------------------------------------------------
# Poetry installer script
# ------------------------------------------------------------------
Save-File `
    'https://install.python-poetry.org' `
    "$out\install-poetry.py" `
    'Poetry installer script'

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
Write-Host ""
Write-Host "=================================================="
Write-Host "Done. Files in $out :"
Get-ChildItem $out | Format-Table Name, @{L='Size';E={"{0:N1} MB" -f ($_.Length/1MB)}} -AutoSize

Write-Host ""
Write-Host "Still need manual download:"
Write-Host "  VSCodeSetup-x64.exe         -> https://code.visualstudio.com/download (Windows System x64)"
Write-Host "  TortoiseGit-x-64bit.msi     -> https://tortoisegit.org/download/"
Write-Host "  MobaXterm_installer_x.y.msi -> https://mobaxterm.mobatek.net/download-home-edition.html"
Write-Host "  basic-miktex-xx-x64.exe     -> https://miktex.org/download"
Write-Host "  ssh-wrapper.bat             -> copy from TTT staging share"
Write-Host ""
Read-Host "Press Enter to close"
