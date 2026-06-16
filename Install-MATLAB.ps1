#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Silent MATLAB installer for named-user network license environments.

.DESCRIPTION
    Mirrors the versioned installer package from a UNC share to a local
    staging directory using robocopy, then runs setup.exe silently and
    sets MLM_LICENSE_FILE as a machine-wide environment variable.

    Works with any MATLAB release (R2019b+). Per-release packages live
    in their own subdirectories on the share:
        \\fileserver\matlab\R2022b\
        \\fileserver\matlab\R2024a\

.PARAMETER SharePath
    UNC path to the versioned installer package directory.
    Example: \\fileserver\matlab\R2024a

.PARAMETER LocalCacheDir
    Local directory to robocopy the package into before install.
    Robocopy mirrors the share here so re-runs skip unchanged files.
    Default: C:\MatlabInstallCache\<release>

.PARAMETER LicenseServer
    FlexLM server string written into MLM_LICENSE_FILE after install.
    Example: 27000@licserver.example.com
    Omit to use the staged .lic file path as the env var value instead.

.PARAMETER LicFileName
    Name of the .lic file in the package.
    Default: NASA_LaRC_Consolidated_Server.lic

.PARAMETER RobocopyThreads
    Number of robocopy /MT threads (1-128).  Default: 16.

.PARAMETER SkipCopy
    Skip robocopy if the package is already fully cached locally.

.PARAMETER LogFile
    Full path for the MATLAB install log.
    Default: C:\mathworks_install.log

.EXAMPLE
    .\Install-MATLAB.ps1 -SharePath '\\server\matlab\R2024a' `
                         -LicenseServer '27000@licserver.example.com'

.EXAMPLE
    # Re-run without re-copying (package already cached)
    .\Install-MATLAB.ps1 -SharePath '\\server\matlab\R2022b' -SkipCopy
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$SharePath,

    [string]$LocalCacheDir,         # defaults below after release is known

    [string]$LicenseServer,

    [string]$LicFileName        = 'NASA_LaRC_Consolidated_Server.lic',

    [ValidateRange(1,128)]
    [int]$RobocopyThreads       = 16,

    [switch]$SkipCopy,

    [string]$LogFile            = 'C:\mathworks_install.log'
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
Assert-Path $SharePath 'Network share'

Assert-Path (Join-Path $SharePath 'setup.exe')            'setup.exe on share'
Assert-Path (Join-Path $SharePath 'installer_input.txt')  'installer_input.txt on share'

# Detect release name from the leaf folder (e.g. R2024a) for cache path
$release = Split-Path $SharePath -Leaf

if (-not $LocalCacheDir) {
    $LocalCacheDir = "C:\MatlabInstallCache\$release"
}

# Read destination folder from installer_input.txt for summary output
$destLine   = Select-String -Path (Join-Path $SharePath 'installer_input.txt') `
                            -Pattern '^destinationFolder\s*=' | Select-Object -First 1
$destFolder = if ($destLine) { ($destLine.Line -split '=', 2)[1].Trim() } else { '(see installer_input.txt)' }

Write-Host "  Release     : $release"
Write-Host "  Destination : $destFolder"
Write-Host "  Local cache : $LocalCacheDir"

# ── 2. Robocopy package to local cache ───────────────────────────────────────

if ($SkipCopy) {
    Write-Step "Skipping robocopy (-SkipCopy set)"
    Assert-Path $LocalCacheDir 'Local cache directory'
} else {
    Write-Step "Mirroring package from share (robocopy /MIR /MT:$RobocopyThreads)"
    Write-Host "  $SharePath  ->  $LocalCacheDir"

    # robocopy exit codes 0-7 are success (bit flags for files copied/skipped/etc.)
    # 8+ indicate errors.
    $rcArgs = @(
        $SharePath,
        $LocalCacheDir,
        '/MIR',                     # mirror: adds, updates, removes extras
        "/MT:$RobocopyThreads",     # multi-threaded copy
        '/R:3',                     # 3 retries on failure
        '/W:10',                    # 10-second wait between retries
        '/NP',                      # no per-file progress (cleaner log)
        '/TEE',                     # output to console AND log
        "/LOG+:$LogFile"            # append to install log
    )

    $rc = (Start-Process robocopy -ArgumentList $rcArgs -Wait -PassThru -NoNewWindow).ExitCode

    if ($rc -ge 8) {
        Write-Error "Robocopy failed with exit code $rc. Check: $LogFile"
        exit $rc
    }

    Write-Host "  Robocopy complete (exit $rc — any value 0-7 is success)." -ForegroundColor Green
}

# ── 3. Run silent installer from local cache ──────────────────────────────────

$localSetup     = Join-Path $LocalCacheDir 'setup.exe'
$localInputFile = Join-Path $LocalCacheDir 'installer_input.txt'

Assert-Path $localSetup     'setup.exe in local cache'
Assert-Path $localInputFile 'installer_input.txt in local cache'

Write-Step "Running MATLAB silent installer (local)"
Write-Host "  setup.exe : $localSetup"
Write-Host "  inputFile : $localInputFile"
Write-Host "  log       : $LogFile"

$proc = Start-Process -FilePath $localSetup `
                      -ArgumentList "-inputFile `"$localInputFile`"" `
                      -Wait -PassThru -NoNewWindow

if ($proc.ExitCode -ne 0) {
    Write-Error "Installer exited with code $($proc.ExitCode). Check: $LogFile"
    exit $proc.ExitCode
}

Write-Host "  Installer completed (exit 0)." -ForegroundColor Green

# ── 4. Set MLM_LICENSE_FILE system environment variable ───────────────────────

Write-Step "Setting MLM_LICENSE_FILE (machine scope)"

$stagedLic = Join-Path $LocalCacheDir $LicFileName
$licValue  = if ($LicenseServer) { $LicenseServer } else { $stagedLic }

[System.Environment]::SetEnvironmentVariable(
    'MLM_LICENSE_FILE',
    $licValue,
    [System.EnvironmentVariableTarget]::Machine
)

$env:MLM_LICENSE_FILE = $licValue

Write-Host "  MLM_LICENSE_FILE = $licValue" -ForegroundColor Green

# ── 5. Summary ────────────────────────────────────────────────────────────────

Write-Step "Done"
Write-Host @"
  Release     : $release
  Destination : $destFolder
  License env : MLM_LICENSE_FILE = $licValue
  Install log : $LogFile

  Users must sign out and back in (or reboot) for the machine-level
  environment variable to take effect in new sessions.
"@
