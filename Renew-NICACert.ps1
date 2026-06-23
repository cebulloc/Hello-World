<#
.SYNOPSIS
    Interactive NICA TLS certificate renewal script for Windows servers.
.DESCRIPTION
    Automates the end-to-end CSR generation and submission workflow:
      - Detects FQDN automatically
      - Checks existing cert expiry
      - Creates working directory
      - Copies and customizes the INF template
      - Generates CSR via certreq (self-elevates if needed)
      - Stages the .req file to the network share
      - Opens NAMS for certificate pickup
.PARAMETER DryRun
    Simulate the entire workflow without making any changes. Shows what would happen at each step.
.PARAMETER Force
    Skip interactive prompts and run unattended.
.PARAMETER SkipNAMS
    Do not open the NAMS browser window at the end.
.PARAMETER InfSource
    UNC path to the INF template. Defaults to \\e4-arch2\e4it\Windows-CSR-Request\3-NICA-TLS-2016-2019.inf
.PARAMETER StagingShare
    UNC path where completed .req files are copied. Defaults to \\e4-arch2\e4it\Windows-CSR-Request\ready-requests
.PARAMETER WorkDir
    Local working directory. Defaults to C:\NASA\_ServerCert
.PARAMETER ExpiryWarningDays
    Warn if cert expires within this many days. Defaults to 30.
.NOTES
    Author: Tom Perry / automated refactor
    Original: 4/21/2023
    Refactored: 2026-06-23
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Force,
    [switch]$SkipNAMS,
    [string]$InfSource = '\\e4-arch2\e4it\Windows-CSR-Request\3-NICA-TLS-2016-2019.inf',
    [string]$StagingShare = '\\e4-arch2\e4it\Windows-CSR-Request\ready-requests',
    [string]$WorkDir = 'C:\NASA\_ServerCert',
    [int]$ExpiryWarningDays = 30
)

$ErrorActionPreference = 'Stop'

if ($DryRun) {
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host "  DRY RUN MODE — no changes will be made" -ForegroundColor Magenta
    Write-Host "========================================`n" -ForegroundColor Magenta
    $Force = $true
}

function Write-DryRun {
    param([string]$Message)
    Write-Host "  [DRY RUN] $Message" -ForegroundColor Magenta
}

function Write-Step {
    param([string]$StepNumber, [string]$Message)
    Write-Host "`n[$StepNumber] $Message" -ForegroundColor Cyan
}

function Confirm-Continue {
    param([string]$Message = "Press Enter to continue or Ctrl+C to abort...")
    if (-not $Force) {
        Read-Host $Message
    }
}

# ── Step 0: Detect FQDN and check existing cert ──────────────────────────

Write-Step "0" "Detecting FQDN and checking existing certificates"

$FQDNhostname = ([System.Net.Dns]::GetHostByName($env:COMPUTERNAME)).Hostname
Write-Host "  FQDN: $FQDNhostname" -ForegroundColor Green

Write-Host "`n  Current certificates in LocalMachine\My:"
$allCerts = Get-ChildItem -Path cert:\LocalMachine\My -ErrorAction SilentlyContinue
if ($allCerts) {
    $allCerts | Format-Table Subject, NotAfter, Thumbprint -AutoSize
} else {
    Write-Host "  (none found)" -ForegroundColor Yellow
}

$matchingCerts = Get-ChildItem -Path cert:\LocalMachine\My -ErrorAction SilentlyContinue |
    Where-Object { $_.Subject -like "*$FQDNhostname*" }

if ($matchingCerts) {
    Write-Host "  Matching cert(s) for this host:" -ForegroundColor Green
    foreach ($cert in $matchingCerts) {
        $daysLeft = ($cert.NotAfter - (Get-Date)).Days
        $color = if ($daysLeft -le 0) { 'Red' } elseif ($daysLeft -le $ExpiryWarningDays) { 'Yellow' } else { 'Green' }
        Write-Host "    Subject:  $($cert.Subject)" -ForegroundColor $color
        Write-Host "    Expires:  $($cert.NotAfter)  ($($daysLeft) days remaining)" -ForegroundColor $color
        Write-Host "    Thumbprint: $($cert.Thumbprint)"
    }

    $validCert = $matchingCerts | Where-Object { ($_.NotAfter - (Get-Date)).Days -gt $ExpiryWarningDays }
    if ($validCert -and -not $Force) {
        Write-Host "`n  WARNING: A valid cert exists that is not expiring within $ExpiryWarningDays days." -ForegroundColor Yellow
        $proceed = Read-Host "  Continue with renewal anyway? (y/N)"
        if ($proceed -notmatch '^[Yy]') {
            Write-Host "  Aborted." -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    Write-Host "  No matching certificate found for $FQDNhostname — proceeding with new request." -ForegroundColor Yellow
}

Confirm-Continue

# ── Step 1: Create working directory ──────────────────────────────────────

Write-Step "1" "Creating working directory: $WorkDir"

if ($DryRun) {
    if (Test-Path $WorkDir) {
        Write-DryRun "Would clean *.inf and *.req from existing $WorkDir"
    } else {
        Write-DryRun "Would create directory $WorkDir"
    }
} else {
    if (Test-Path $WorkDir) {
        Write-Host "  Directory already exists. Cleaning previous files..." -ForegroundColor Yellow
        Remove-Item "$WorkDir\*.inf" -Force -ErrorAction SilentlyContinue
        Remove-Item "$WorkDir\*.req" -Force -ErrorAction SilentlyContinue
    } else {
        New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
        Write-Host "  Created $WorkDir" -ForegroundColor Green
    }
}

# ── Step 2: Copy INF template ─────────────────────────────────────────────

Write-Step "2" "Copying INF template from network share"

$infFileName = Split-Path $InfSource -Leaf

if ($DryRun) {
    Write-DryRun "Would check for: $InfSource"
    if (Test-Path $InfSource) {
        Write-DryRun "  Share IS reachable"
    } else {
        Write-DryRun "  Share is NOT reachable (would fail in real run)"
    }
    Write-DryRun "Would copy $infFileName to $WorkDir"
} else {
    if (-not (Test-Path $InfSource)) {
        Write-Host "  ERROR: Cannot reach $InfSource" -ForegroundColor Red
        Write-Host "  Verify you have network access to the share and try again." -ForegroundColor Red
        exit 1
    }

    Copy-Item -Path $InfSource -Destination "$WorkDir\$infFileName" -Force
    Write-Host "  Copied $infFileName to $WorkDir" -ForegroundColor Green
}

# ── Step 3: Customize template with FQDN ─────────────────────────────────

Write-Step "3" "Customizing INF template with FQDN: $FQDNhostname"

$outputInf = Join-Path $WorkDir "NICA-TLS-2016-2019.inf"

if ($DryRun) {
    Write-DryRun "Would replace 'FQDNPLACEHOLDER' with '$FQDNhostname' in template"
    Write-DryRun "Would save customized template to: $outputInf"
} else {
    $rawContent = Get-Content -Path "$WorkDir\$infFileName" -Raw
    $updatedContent = $rawContent -replace 'FQDNPLACEHOLDER', $FQDNhostname
    Set-Content -Path $outputInf -Value $updatedContent

    Write-Host "  Template updated: $outputInf" -ForegroundColor Green
    Confirm-Continue "  Template ready. Press Enter to generate CSR or Ctrl+C to abort..."
}

# ── Step 4: Generate CSR via certreq ──────────────────────────────────────

Write-Step "4" "Generating CSR (will elevate to Administrator if needed)"

$reqFile = Join-Path $WorkDir "NewCSR.req"

if ($DryRun) {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    Write-DryRun "Current session is admin: $isAdmin"
    if ($isAdmin) {
        Write-DryRun "Would run: certreq -new $outputInf $reqFile"
    } else {
        Write-DryRun "Would elevate to admin and run: certreq -new $outputInf $reqFile"
    }
    Write-DryRun "Expected output: $reqFile"
} else {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )

    if ($isAdmin) {
        Write-Host "  Running as Administrator — generating CSR directly..." -ForegroundColor Green
        Push-Location $WorkDir
        try {
            $result = & certreq -new $outputInf $reqFile 2>&1
            Write-Host $result
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "  Not running as Administrator — elevating..." -ForegroundColor Yellow

        $elevatedScript = @"
Set-Location '$WorkDir'
certreq -new '$outputInf' '$reqFile'
"@
        $elevatedScriptPath = Join-Path $WorkDir "_elevate-certreq.ps1"
        Set-Content -Path $elevatedScriptPath -Value $elevatedScript

        Start-Process powershell.exe -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$elevatedScriptPath`"" -Wait
        Remove-Item $elevatedScriptPath -Force -ErrorAction SilentlyContinue
    }

    if (-not (Test-Path $reqFile)) {
        Write-Host "  ERROR: CSR file was not created. certreq may have failed." -ForegroundColor Red
        Write-Host "  Check the elevated window for errors and retry." -ForegroundColor Red
        exit 1
    }

    Write-Host "  CSR generated: $reqFile" -ForegroundColor Green
}

# ── Step 5: Rename and stage the .req file ────────────────────────────────

Write-Step "5" "Staging CSR to network share"

$namedReq = Join-Path $WorkDir "$FQDNhostname.req"

if ($DryRun) {
    Write-DryRun "Would rename NewCSR.req to: $namedReq"
    Write-DryRun "Would check staging share: $StagingShare"
    if (Test-Path $StagingShare) {
        Write-DryRun "  Share IS reachable — would copy .req there"
    } else {
        Write-DryRun "  Share is NOT reachable — would save locally only"
    }
} else {
    Copy-Item -Path $reqFile -Destination $namedReq -Force
    Write-Host "  Renamed to: $namedReq" -ForegroundColor Green

    if (Test-Path $StagingShare) {
        Copy-Item -Path $namedReq -Destination "$StagingShare\" -Force
        Write-Host "  Copied to: $StagingShare\$FQDNhostname.req" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Cannot reach staging share $StagingShare" -ForegroundColor Yellow
        Write-Host "  The .req file is saved locally at: $namedReq" -ForegroundColor Yellow
        Write-Host "  Manually copy it when the share is available." -ForegroundColor Yellow
    }
}

# ── Step 6: Open NAMS for cert pickup ─────────────────────────────────────

Write-Step "6" "Complete"

Write-Host "`n  CSR is ready for submission." -ForegroundColor Green
Write-Host "  Local copy:  $namedReq"
Write-Host "  Staged copy: $StagingShare\$FQDNhostname.req"
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    1. Submit the CSR via IdMAX PKI Tool (NAMS will open)"
Write-Host "    2. Wait for the approval email"
Write-Host "    3. Download the .cer from IdMAX"
Write-Host "    4. Run:  certreq -accept <certificate.cer>"
Write-Host ""

if ($DryRun) {
    Write-DryRun "Would open NAMS: https://nams.nasa.gov"
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host "  DRY RUN COMPLETE — no changes were made" -ForegroundColor Magenta
    Write-Host "========================================`n" -ForegroundColor Magenta
} else {
    if (-not $SkipNAMS) {
        if (-not $Force) {
            $openNams = Read-Host "  Open NAMS now? (Y/n)"
            if ($openNams -match '^[Nn]') {
                Write-Host "  Skipped." -ForegroundColor Yellow
            } else {
                Start-Process "https://nams.nasa.gov"
            }
        } else {
            Start-Process "https://nams.nasa.gov"
        }
    }

    Write-Host "`nDone.`n" -ForegroundColor Green
}
