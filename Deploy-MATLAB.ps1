#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Deploys MATLAB to one or more target machines using WinRM (Invoke-Command).

.DESCRIPTION
    Reads matlab-config.ps1 for all settings, then either installs locally
    or pushes the install to remote machines over PowerShell remoting (WinRM).

    Remote mode copies Install-MATLAB.ps1 and matlab-config.ps1 to each
    target's admin share (\\target\C$\MatlabDeploy\) and executes the
    installer there — no persistent share permissions needed on the clients.

.PARAMETER ComputerName
    One or more target hostnames or IPs.  Omit to install on the local machine.
    Example: -ComputerName PC001, PC002, PC003

.PARAMETER Credential
    PSCredential for remote connections.  Prompted if omitted and -ComputerName
    is specified.

.PARAMETER MaxParallel
    Maximum number of simultaneous remote installs.  Default: 5.

.EXAMPLE
    # Local install
    .\Deploy-MATLAB.ps1

.EXAMPLE
    # Push to three machines
    .\Deploy-MATLAB.ps1 -ComputerName PC001, PC002, PC003

.EXAMPLE
    # Push to a list of machines from a text file
    $targets = Get-Content .\targets.txt
    .\Deploy-MATLAB.ps1 -ComputerName $targets -MaxParallel 10
#>
[CmdletBinding()]
param(
    [string[]]$ComputerName,

    [PSCredential]$Credential,

    [int]$MaxParallel = 5
)

$here = $PSScriptRoot

# Load config
. "$here\matlab-config.ps1"

# ── Local install ─────────────────────────────────────────────────────────────

if (-not $ComputerName) {
    Write-Host "No -ComputerName specified — installing locally." -ForegroundColor Yellow
    & "$here\Install-MATLAB.ps1" `
        -SharePath       $SharePath `
        -LocalCacheDir   $LocalCacheDir `
        -LicFileName     $LicFileName `
        -LicenseServer   $LicenseServer `
        -RobocopyThreads $RobocopyThreads `
        -SkipCopy:$SkipCopy `
        -LogFile         $LogFile
    return
}

# ── Remote install via WinRM ──────────────────────────────────────────────────

if (-not $Credential) {
    $Credential = Get-Credential -Message "Enter credentials for remote installs"
}

# Files to copy to each target
$deployFiles = @(
    "$here\Install-MATLAB.ps1",
    "$here\matlab-config.ps1"
)

$remoteWorkDir = 'C:\MatlabDeploy'

$scriptBlock = {
    param($workDir, $sharePath, $localCacheDir, $licFileName, $licenseServer,
          $robocopyThreads, $skipCopy, $logFile)

    Set-Location $workDir
    & "$workDir\Install-MATLAB.ps1" `
        -SharePath       $sharePath `
        -LocalCacheDir   $localCacheDir `
        -LicFileName     $licFileName `
        -LicenseServer   $licenseServer `
        -RobocopyThreads $robocopyThreads `
        -SkipCopy:$skipCopy `
        -LogFile         $logFile
}

$jobs = [System.Collections.Generic.List[object]]::new()

foreach ($target in $ComputerName) {
    # Throttle parallelism
    while (($jobs | Where-Object { $_.State -eq 'Running' }).Count -ge $MaxParallel) {
        Start-Sleep -Seconds 5
    }

    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Starting deploy on $target" -ForegroundColor Cyan

    $job = Start-Job -Name $target -ScriptBlock {
        param($target, $credential, $deployFiles, $remoteWorkDir, $scriptBlock,
              $sharePath, $localCacheDir, $licFileName, $licenseServer,
              $robocopyThreads, $skipCopy, $logFile)

        $session = New-PSSession -ComputerName $target -Credential $credential -ErrorAction Stop

        try {
            # Create remote work directory
            Invoke-Command -Session $session -ScriptBlock {
                param($d) if (-not (Test-Path $d)) { New-Item -ItemType Directory $d | Out-Null }
            } -ArgumentList $remoteWorkDir

            # Copy scripts to target admin share (avoids needing share access from client)
            foreach ($f in $deployFiles) {
                $dest = "\\$target\C$\MatlabDeploy\$(Split-Path $f -Leaf)"
                Copy-Item $f $dest -Force
            }

            # Execute installer on remote machine
            Invoke-Command -Session $session -ScriptBlock $scriptBlock `
                -ArgumentList $remoteWorkDir, $sharePath, $localCacheDir,
                              $licFileName, $licenseServer, $robocopyThreads,
                              $skipCopy, $logFile

        } finally {
            Remove-PSSession $session -ErrorAction SilentlyContinue
        }

    } -ArgumentList $target, $Credential, $deployFiles, $remoteWorkDir,
                    $scriptBlock, $SharePath, $LocalCacheDir, $LicFileName,
                    $LicenseServer, $RobocopyThreads, $SkipCopy, $LogFile

    $jobs.Add($job)
}

# Wait for all jobs and report results
Write-Host "`nWaiting for all remote installs to complete..." -ForegroundColor Cyan
$jobs | Wait-Job | Out-Null

$succeeded = @()
$failed    = @()

foreach ($job in $jobs) {
    $output = Receive-Job $job 2>&1
    if ($job.State -eq 'Completed' -and ($output | Where-Object { $_ -match 'Installer completed' })) {
        $succeeded += $job.Name
        Write-Host "  [OK]  $($job.Name)" -ForegroundColor Green
    } else {
        $failed += $job.Name
        Write-Host "  [FAIL] $($job.Name)" -ForegroundColor Red
        $output | ForEach-Object { Write-Host "         $_" }
    }
    Remove-Job $job
}

Write-Host "`n── Summary ──────────────────────────────────────────────────"
Write-Host "  Succeeded : $($succeeded.Count)  ($($succeeded -join ', '))"
Write-Host "  Failed    : $($failed.Count)  ($($failed -join ', '))"

if ($failed.Count -gt 0) { exit 1 }
