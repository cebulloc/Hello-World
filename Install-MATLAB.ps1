#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Silent MATLAB installer for named-user network license environments.

.DESCRIPTION
    Copies the license file from a UNC network share, runs the MATLAB
    setup.exe in silent mode using installer_input.txt, and sets
    MLM_LICENSE_FILE as a machine-wide environment variable so every
    named user automatically resolves the FlexLM license server.

    Works with any MATLAB release (R2019b+). Point -SharePath at the
    staged package for the desired release and supply a matching
    installer_input.txt (see installer_input.txt in this repo for a
    commented template).

.PARAMETER SharePath
    UNC path to the staged installer package for the target release.
    Example: \\fileserver\matlab\R2024a

.PARAMETER LicenseServer
    FlexLM server string written into MLM_LICENSE_FILE after install.
    Example: 27000@licserver.example.com
    Omit to fall back to the .lic file path staged locally.

.PARAMETER LicFileName
    Name of the .lic file on the share and in LocalStageDir.
    Default: license.lic

.PARAMETER LocalStageDir
    Local directory used to stage the license file before install.
    Must match the licensePath value in installer_input.txt.
    Default: C:\MatlabSilentInstall

.PARAMETER LogFile
    Full path for the MATLAB install log.
    Default: C:\mathworks_install.log

.EXAMPLE
    .\Install-MATLAB.ps1 -SharePath '\\server\matlab\R2024a' `
                         -LicenseServer '27000@licserver.example.com'

.EXAMPLE
    # Use a bundled .lic file; no explicit server string needed
    .\Install-MATLAB.ps1 -SharePath '\\server\matlab\R2022b' `
                         -LicFileName 'NASA_LaRC_Consolidated_Server.lic'
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$SharePath,

    [string]$LicenseServer,

    [string]$LicFileName    = 'license.lic',

    [string]$LocalStageDir  = 'C:\MatlabSilentInstall',

    [string]$LogFile        = 'C:\mathworks_install.log'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── helpers ───────────────────────────────────────────────────────────────────

function Write-Step([string]$msg) {
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan
}

function Assert-Path([string]$path, [string]$label) {
    if (-not (Test-Path $path)) { throw "$label not found: $path" }
}

# ── 1. Verify share ───────────────────────────────────────────────────────────

Write-Step "Verifying network share: $SharePath"
Assert-Path $SharePath        'Network share'

$setupExe     = Join-Path $SharePath 'setup.exe'
$inputFile    = Join-Path $SharePath 'installer_input.txt'
$licFileShare = Join-Path $SharePath $LicFileName

Assert-Path $setupExe  'setup.exe on share'
Assert-Path $inputFile 'installer_input.txt on share'

# ── 2. Detect release from installer_input.txt ────────────────────────────────
# Read destinationFolder to surface the release in log output (informational only).

$destLine = Select-String -Path $inputFile -Pattern '^destinationFolder\s*=' |
            Select-Object -First 1
$destFolder = if ($destLine) { ($destLine.Line -split '=', 2)[1].Trim() } else { '(see installer_input.txt)' }
Write-Host "  Target destination: $destFolder"

# ── 3. Stage license file locally ─────────────────────────────────────────────

Write-Step "Staging license file to $LocalStageDir"

if (-not (Test-Path $LocalStageDir)) {
    New-Item -ItemType Directory -Path $LocalStageDir | Out-Null
}

if (Test-Path $licFileShare) {
    Copy-Item -Path $licFileShare -Destination $LocalStageDir -Force
    Write-Host "  Copied: $licFileShare -> $LocalStageDir"
} else {
    Write-Warning "License file not found on share ($licFileShare). Assuming it already exists at $LocalStageDir."
}

$stagedLic = Join-Path $LocalStageDir $LicFileName
Assert-Path $stagedLic 'Staged license file'

# ── 4. Run silent installer ───────────────────────────────────────────────────

Write-Step "Running MATLAB silent installer"
Write-Host "  setup.exe : $setupExe"
Write-Host "  inputFile : $inputFile"
Write-Host "  log       : $LogFile"

$proc = Start-Process -FilePath $setupExe `
                      -ArgumentList "-inputFile `"$inputFile`"" `
                      -Wait -PassThru -NoNewWindow

if ($proc.ExitCode -ne 0) {
    Write-Error "Installer exited with code $($proc.ExitCode). Check: $LogFile"
    exit $proc.ExitCode
}

Write-Host "  Installer completed (exit 0)." -ForegroundColor Green

# ── 5. Set MLM_LICENSE_FILE system environment variable ───────────────────────

Write-Step "Setting MLM_LICENSE_FILE (machine scope)"

$licValue = if ($LicenseServer) { $LicenseServer } else { $stagedLic }

[System.Environment]::SetEnvironmentVariable(
    'MLM_LICENSE_FILE',
    $licValue,
    [System.EnvironmentVariableTarget]::Machine
)

$env:MLM_LICENSE_FILE = $licValue   # current session

Write-Host "  MLM_LICENSE_FILE = $licValue" -ForegroundColor Green

# ── 6. Summary ────────────────────────────────────────────────────────────────

Write-Step "Done"
Write-Host @"
  Destination : $destFolder
  License env : MLM_LICENSE_FILE = $licValue
  Install log : $LogFile

  Users must sign out and back in (or reboot) for the machine-level
  environment variable to take effect in new sessions.
"@
