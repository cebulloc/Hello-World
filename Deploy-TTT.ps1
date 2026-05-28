#Requires -Version 5.1
<#
.SYNOPSIS
    TTT Pathways Intern Workstation Deployment
.DESCRIPTION
    Deploys 12 tools to NASA intern workstations. Replaces Deploy-TTT.bat.
    Run from \\server\share\Deploy-TTT\ or a mapped drive.

    PRE-STAGE in .\Installers\:
      Miniforge3-Windows-x86_64.exe          (or auto-downloaded)
      VSCodeSetup-x64-x.x.x.exe             (or auto-downloaded)
      ssh-wrapper.bat                        (required)
      basic-miktex-x.x-x64.exe              (required - no stable URL)
      MobaXterm_installer_x.y.msi           (required - no direct URL)
      OpenVSP-3.50.4-win64-Python3.13.zip   (or auto-downloaded)

    AUTO-DOWNLOADED (no staging needed):
      Git for Windows, TortoiseGit, PuTTY-CAC, Notepad++, 7-Zip,
      TeXstudio, VS Code
#>

# ================================================================
#  CONFIGURATION
# ================================================================
$PRINTER  = '\\hplrcprtp01\LA_2101_200_1'
$VSP_VER  = '3.50.4'
$VSP_DEST = "C:\OpenVSP-$VSP_VER"

# ================================================================
#  HELPER FUNCTIONS
# ================================================================

function Write-Log {
    param([string]$msg)
    $line = "    $msg"
    Write-Host $line
    Add-Content -Path $script:logFile -Value $line -Encoding UTF8
}

function Write-Result {
    param([int]$rc)
    if ($rc -eq 0) {
        Write-Log '    [OK]'
    } else {
        Write-Log "    [FAILED] Exit code: $rc"
    }
}

function Get-GhAssetUrl {
    param(
        [string]$repo,
        [string]$pattern
    )
    $rel = $null
    try {
        $rel = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -ErrorAction Stop
    } catch {
        # latest endpoint failed; fall through to list
    }
    if (-not $rel) {
        $rels = Invoke-RestMethod "https://api.github.com/repos/$repo/releases" -ErrorAction SilentlyContinue
        $rel  = $rels | Where-Object { -not $_.prerelease -and -not $_.draft } | Select-Object -First 1
    }
    if (-not $rel) { return $null }
    $asset = $rel.assets | Where-Object { $_.name -like $pattern } | Select-Object -First 1
    return $asset.browser_download_url
}

function Invoke-Section {
    param(
        [string]$label,
        [scriptblock]$body
    )
    Write-Log $label
    try {
        & $body
    } catch {
        Write-Log "    [ERROR] $_"
    }
}

# ================================================================
#  SELF-ELEVATION
# ================================================================
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell `
        -Verb RunAs `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" `
        -WorkingDirectory $env:TEMP
    exit
}

# ================================================================
#  PATHS
# ================================================================
$scriptDir = $PSScriptRoot

# Auto-map UNC path to a drive letter so installers are not blocked by UNC execution policy.
if ($scriptDir -like '\\*') {
    $mapped = $false
    foreach ($letter in ('Z','Y','X','W','V','U','T','S','R','Q','P','O','N','M','L','K')) {
        if (-not (Test-Path "${letter}:\")) {
            $proc = Start-Process -FilePath 'net' `
                -ArgumentList "use `"${letter}:`" `"$scriptDir`" /persistent:no" `
                -Wait -PassThru -WindowStyle Hidden
            if ($proc.ExitCode -eq 0) {
                Write-Host "    [INFO] Mapped UNC share to ${letter}: for this session."
                $scriptDir = "${letter}:"
                $mapped = $true
                break
            }
        }
    }
    if (-not $mapped) {
        Write-Host "    [WARN] Could not map UNC share to a drive letter; continuing from UNC path."
    }
}

$instDir  = "$env:TEMP\DeployInstallers"
$logFile  = "$env:TEMP\TTT_Deploy_$($env:COMPUTERNAME)_$(Get-Date -Format yyyyMMdd).log"
$lockPath = "$env:TEMP\TTT_Deploy_$($env:COMPUTERNAME).lock"
$donePath = "$env:TEMP\TTT_Deploy_$($env:COMPUTERNAME)_COMPLETE.flag"

# ================================================================
#  LOCK  (persistent - never released after successful deployment)
# ================================================================
try {
    New-Item -Path $lockPath -ItemType Directory -ErrorAction Stop | Out-Null
} catch {
    Write-Host ''
    if (Test-Path $donePath) {
        Write-Host "Deployment already completed. To re-deploy, delete: $donePath AND $lockPath"
    } else {
        Write-Host "A deployment is already running. Lock: $lockPath. If stale, delete that folder."
    }
    Read-Host 'Press Enter to exit'
    exit 1
}

# Double-check inside the lock.
if (Test-Path $donePath) {
    Write-Host ''
    Write-Host "Deployment already completed. To re-deploy, delete: $donePath AND $lockPath"
    Read-Host 'Press Enter to exit'
    exit 0
}

# ================================================================
#  LOG INIT
# ================================================================
Set-Content -Path $logFile -Encoding UTF8 -Value @"
TTT Pathways Deployment Log
Computer : $env:COMPUTERNAME
Date     : $(Get-Date)
Source   : $scriptDir

"@

# ================================================================
#  STAGE INSTALLERS
# ================================================================
if (-not (Test-Path $instDir)) {
    New-Item -Path $instDir -ItemType Directory | Out-Null
}
$instSrc = Join-Path $scriptDir 'Installers'
if (Test-Path $instSrc) {
    Copy-Item "$instSrc\*" $instDir -Recurse -Force -ErrorAction SilentlyContinue
    Add-Content -Path $logFile -Value "    [INFO] Staged installers to $instDir" -Encoding UTF8
} else {
    Add-Content -Path $logFile -Value "    [WARN] No Installers\ folder found at $scriptDir" -Encoding UTF8
}

Write-Log '================================================================'
Write-Log "TTT Pathways Deployment — $env:COMPUTERNAME"
Write-Log "Log: $logFile"
Write-Log '================================================================'

$ProgressPreference = 'SilentlyContinue'

# ================================================================
#  [1/12]  MINIFORGE3  (Python 3.13, register as default)
# ================================================================
Invoke-Section '[1/12] Miniforge3 (Python 3.13, register as default)' {
    $dest = "$env:USERPROFILE\Miniforge3"

    if (Test-Path "$dest\Scripts\conda.exe") {
        Write-Log "    Already installed at $dest - skipping."
        Write-Log "    To reinstall, delete $dest and re-run."
        return
    }

    $installer = Get-ChildItem "$instDir\Miniforge3-Windows-x86_64.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if ($installer) {
        Write-Log '    Using staged installer.'
        $exePath = $installer.FullName
    } else {
        Write-Log '    Not staged - downloading latest...'
        $exePath = "$env:TEMP\Miniforge3.exe"
        Invoke-WebRequest 'https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Windows-x86_64.exe' `
            -OutFile $exePath -UseBasicParsing
    }

    Write-Log "    Installing to $dest..."
    $proc = Start-Process -FilePath $exePath `
        -ArgumentList "/S /InstallationType=JustMe /RegisterPython=1 /AddToPath=1 /D=$dest" `
        -Wait -PassThru
    Write-Result $proc.ExitCode

    Write-Log '    Initializing conda for cmd.exe and PowerShell...'
    & "$dest\Scripts\conda.exe" init cmd.exe    2>&1 | Add-Content $logFile -Encoding UTF8
    & "$dest\Scripts\conda.exe" init powershell 2>&1 | Add-Content $logFile -Encoding UTF8

    Write-Log '    Writing .condarc (conda-forge only, no defaults)...'
    @"
channels:
  - conda-forge
channel_priority: strict
auto_activate_base: true
"@ | Set-Content "$env:USERPROFILE\.condarc" -Encoding UTF8

    Write-Log '    Python 3.13 ready. Open a new terminal and run: conda activate base'
}

# ================================================================
#  [2/12]  VISUAL STUDIO CODE + EXTENSIONS + SSH WRAPPER
# ================================================================
Invoke-Section '[2/12] Visual Studio Code + extensions + SSH wrapper' {
    $codeExe = "$env:ProgramFiles\Microsoft VS Code\Code.exe"

    if (-not (Test-Path $codeExe)) {
        $installer = Get-ChildItem "$instDir\VSCodeSetup-x64-*.exe" -ErrorAction SilentlyContinue |
                     Select-Object -First 1
        if ($installer) {
            Write-Log '    Using staged installer.'
            $setupExe = $installer.FullName
        } else {
            Write-Log '    Not staged - downloading...'
            $setupExe = "$env:TEMP\VSCodeSetup-x64.exe"
            Invoke-WebRequest 'https://update.code.visualstudio.com/latest/win32-x64/stable' `
                -OutFile $setupExe -UseBasicParsing
        }

        $proc = Start-Process -FilePath $setupExe `
            -ArgumentList '/VERYSILENT /NORESTART /MERGETASKS=desktopicon,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath' `
            -Wait -PassThru
        Write-Result $proc.ExitCode
    }

    # Stop any running Code instance before installing extensions (prevents IPC conflict under admin).
    Stop-Process -Name Code -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    $codeCmd = "$env:ProgramFiles\Microsoft VS Code\bin\code.cmd"
    foreach ($ext in @('ms-python.python', 'ms-vscode-remote.remote-ssh', 'eamodio.gitlens')) {
        & $codeCmd --install-extension $ext --no-sandbox 2>&1 | Add-Content $logFile -Encoding UTF8
    }

    # SSH wrapper
    $wrapSrc  = "$instDir\ssh-wrapper.bat"
    $wrapDest = "$env:USERPROFILE\ssh-wrapper.bat"

    if (-not (Test-Path $wrapSrc)) {
        Write-Log '    [WARN] ssh-wrapper.bat not found in Installers\ - skipping SSH config.'
        return
    }

    Copy-Item $wrapSrc $wrapDest -Force
    Write-Log "    Copied ssh-wrapper.bat to $wrapDest"

    $sshDir = "$env:USERPROFILE\.ssh"
    if (-not (Test-Path $sshDir)) {
        New-Item -Path $sshDir -ItemType Directory | Out-Null
    }

    $sshConfig = "$sshDir\config"
    if (-not (Test-Path $sshConfig)) {
        Set-Content $sshConfig -Value '# SSH config - add hosts via VS Code F1 > Remote-SSH: Add New Host' -Encoding UTF8
        Write-Log '    Created blank .ssh\config'
    } else {
        Write-Log '    .ssh\config already exists - skipping'
    }

    $settingsPath = "$env:APPDATA\Code\User\settings.json"
    $settingsDir  = Split-Path $settingsPath
    if (-not (Test-Path $settingsDir)) {
        New-Item -Path $settingsDir -ItemType Directory | Out-Null
    }

    if (Test-Path $settingsPath) {
        $raw = Get-Content $settingsPath -Raw -ErrorAction SilentlyContinue
    } else {
        $raw = $null
    }
    if ($raw) {
        try   { $json = $raw | ConvertFrom-Json }
        catch { $json = New-Object PSObject }
    } else {
        $json = New-Object PSObject
    }

    $json | Add-Member -Force -NotePropertyName 'remote.SSH.path' -NotePropertyValue $wrapDest
    $json | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
    Write-Log "    VS Code settings.json updated: remote.SSH.path = $wrapDest"
}

# ================================================================
#  [3/12]  GIT FOR WINDOWS
# ================================================================
Invoke-Section '[3/12] Git for Windows (latest)' {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Log '    Already installed - skipping.'
        return
    }

    $installer = Get-ChildItem "$instDir\Git-*-64-bit.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if ($installer) {
        Write-Log '    Using staged installer.'
        $gitExe = $installer.FullName
    } else {
        Write-Log '    Not staged - fetching latest from GitHub...'
        $url = Get-GhAssetUrl 'git-for-windows/git' '*-64-bit.exe'
        if (-not $url) { Write-Log '    [WARN] Could not resolve download URL.'; return }
        $gitExe = "$env:TEMP\Git-latest-64-bit.exe"
        Invoke-WebRequest $url -OutFile $gitExe -UseBasicParsing
    }

    $proc = Start-Process -FilePath $gitExe `
        -ArgumentList '/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"' `
        -Wait -PassThru
    Write-Result $proc.ExitCode
}

# ================================================================
#  [4/12]  TORTOISEGIT  (latest x64 MSI)
# ================================================================
Invoke-Section '[4/12] TortoiseGit (latest)' {
    if (Test-Path "$env:ProgramFiles\TortoiseGit\bin\TortoiseGitProc.exe") {
        Write-Log '    Already installed - skipping.'
        return
    }

    $installer = Get-ChildItem "$instDir\TortoiseGit-*-64bit.msi" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if ($installer) {
        Write-Log '    Using staged installer.'
        $msi = $installer.FullName
    } else {
        Write-Log '    Not staged - fetching latest from GitHub...'
        $url = Get-GhAssetUrl 'TortoiseGit/TortoiseGit' 'TortoiseGit-*-64bit.msi'
        if (-not $url) { Write-Log '    [WARN] Could not resolve download URL.'; return }
        $msi = "$env:TEMP\TortoiseGit-latest-64bit.msi"
        Invoke-WebRequest $url -OutFile $msi -UseBasicParsing
    }

    $proc = Start-Process msiexec -ArgumentList "/i `"$msi`" /qn /norestart" -Wait -PassThru
    Write-Result $proc.ExitCode
}

# ================================================================
#  [5/12]  PUTTY-CAC  (NoMoreFood, latest x64 MSI)
# ================================================================
Invoke-Section '[5/12] PuTTY-CAC (NoMoreFood, latest)' {
    $puttyInstalled = (Test-Path "$env:ProgramFiles\PuTTY\putty.exe") -or
                      (Test-Path "${env:ProgramFiles(x86)}\PuTTY\putty.exe")
    if ($puttyInstalled) {
        Write-Log '    Already installed - skipping.'
        return
    }

    $installer = Get-ChildItem "$instDir\puttycac-*-x64.msi" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if ($installer) {
        Write-Log '    Using staged installer.'
        $msi = $installer.FullName
    } else {
        Write-Log '    Not staged - fetching latest from GitHub...'
        $url = Get-GhAssetUrl 'NoMoreFood/putty-cac' 'puttycac-*-x64.msi'
        if (-not $url) { Write-Log '    [WARN] Could not resolve download URL.'; return }
        $msi = "$env:TEMP\puttycac-latest-x64.msi"
        Invoke-WebRequest $url -OutFile $msi -UseBasicParsing
    }

    # Copy to a local temp folder so msiexec never runs from a UNC or network path.
    $tmpDir = "$env:TEMP\PuTTYInstall"
    if (-not (Test-Path $tmpDir)) { New-Item -Path $tmpDir -ItemType Directory | Out-Null }
    Copy-Item $msi $tmpDir -Force
    $localMsi = Join-Path $tmpDir (Split-Path $msi -Leaf)

    $proc = Start-Process msiexec -ArgumentList "/i `"$localMsi`" /qn /norestart" -Wait -PassThru
    Write-Result $proc.ExitCode
}

# ================================================================
#  [6/12]  MOBAXTERM  (must be staged - no download URL)
# ================================================================
Invoke-Section '[6/12] MobaXterm' {
    $mobaInstalled = (Test-Path "${env:ProgramFiles(x86)}\Mobatek\MobaXterm\MobaXterm.exe") -or
                     (Test-Path "$env:ProgramFiles\Mobatek\MobaXterm\MobaXterm.exe")
    if ($mobaInstalled) {
        Write-Log '    Already installed - skipping.'
        return
    }

    $installer = Get-ChildItem "$instDir\MobaXterm_installer_*.msi" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if (-not $installer) {
        Write-Log '    NOT FOUND in Installers\'
        Write-Log '    Download from: https://mobaxterm.mobatek.net/download.html'
        Write-Log '    Stage as: Installers\MobaXterm_installer_x.y.msi'
        Write-Log '    [SKIP]'
        return
    }

    # Copy MSI and any companion MobaXterm* files to local temp.
    $tmpDir = "$env:TEMP\MobaInstall"
    if (-not (Test-Path $tmpDir)) { New-Item -Path $tmpDir -ItemType Directory | Out-Null }
    Get-ChildItem "$instDir\MobaXterm*" -ErrorAction SilentlyContinue |
        ForEach-Object { Copy-Item $_.FullName $tmpDir -Force }

    $localMsi = Get-ChildItem "$tmpDir\MobaXterm_installer_*.msi" -ErrorAction SilentlyContinue |
                Select-Object -First 1
    if (-not $localMsi) {
        Write-Log '    [ERROR] Could not locate MSI in temp folder.'
        return
    }

    $proc = Start-Process msiexec `
        -ArgumentList "/i `"$($localMsi.FullName)`" /qn /norestart /L*v `"$logFile.moba.log`"" `
        -Wait -PassThru
    Write-Result $proc.ExitCode
}

# ================================================================
#  [7/12]  MIKTEX  (must be staged)
# ================================================================
Invoke-Section '[7/12] MikTeX' {
    if (Test-Path "$env:ProgramFiles\MiKTeX\miktex\bin\x64\pdflatex.exe") {
        Write-Log '    Already installed - skipping.'
        return
    }

    $installer = Get-ChildItem "$instDir\basic-miktex-*-x64.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if (-not $installer) {
        Write-Log '    NOT FOUND in Installers\'
        Write-Log '    Download from: https://miktex.org/download'
        Write-Log '    Stage as: Installers\basic-miktex-x.x-x64.exe'
        Write-Log '    [SKIP]'
        return
    }

    Write-Log '    NOTE: MikTeX runs with a progress window - please wait...'
    $proc = Start-Process -FilePath $installer.FullName `
        -ArgumentList '--unattended --shared --auto-install=yes --paper-size=Letter' `
        -Wait -PassThru
    Write-Result $proc.ExitCode
}

# ================================================================
#  [8/12]  TEXSTUDIO  (auto-download latest)
# ================================================================
Invoke-Section '[8/12] TeXstudio (latest)' {
    if (Test-Path "$env:ProgramFiles\texstudio\texstudio.exe") {
        Write-Log '    Already installed - skipping.'
        return
    }

    $installer = Get-ChildItem "$instDir\texstudio-*-win-x64.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if (-not $installer) {
        $installer = Get-ChildItem "$instDir\texstudio-*-win-qt*.exe" -ErrorAction SilentlyContinue |
                     Select-Object -First 1
    }

    if ($installer) {
        Write-Log '    Using staged installer.'
        $txsExe = $installer.FullName
    } else {
        Write-Log '    Not staged - downloading latest...'
        $url = Get-GhAssetUrl 'texstudio-org/texstudio' '*-win-x64.exe'
        if (-not $url) {
            $url = Get-GhAssetUrl 'texstudio-org/texstudio' '*-win-qt*.exe'
        }
        if (-not $url) { Write-Log '    [WARN] Could not resolve download URL.'; return }
        $txsExe = "$env:TEMP\texstudio-latest-win-x64.exe"
        Invoke-WebRequest $url -OutFile $txsExe -UseBasicParsing
    }

    $proc = Start-Process -FilePath $txsExe -ArgumentList '/S' -Wait -PassThru
    Write-Result $proc.ExitCode
}

# ================================================================
#  [9/12]  OPENVSP 3.50.4
# ================================================================
Invoke-Section "[9/12] OpenVSP $VSP_VER" {
    if (Test-Path "$VSP_DEST\") {
        Write-Log "    Already installed at $VSP_DEST - skipping."
        return
    }

    $zipName  = "OpenVSP-$VSP_VER-win64-Python3.13.zip"
    $installer = Get-ChildItem "$instDir\$zipName" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if ($installer) {
        Write-Log '    Using staged zip.'
        $zipPath = $installer.FullName
    } else {
        Write-Log '    Not staged - downloading from GitHub...'
        $url = Get-GhAssetUrl 'OpenVSP/OpenVSP' "OpenVSP-$VSP_VER-win64-Python3.13.zip"
        if (-not $url) { Write-Log '    [WARN] Could not resolve download URL.'; return }
        $zipPath = "$env:TEMP\$zipName"
        Invoke-WebRequest $url -OutFile $zipPath -UseBasicParsing
    }

    Write-Log '    Extracting to C:\...'
    Expand-Archive -Path $zipPath -DestinationPath 'C:\' -Force

    # Rename extracted folder if it has a longer name (e.g. includes build qualifier).
    $extracted = Get-ChildItem 'C:\' -Directory |
                 Where-Object { $_.Name -like "OpenVSP-$VSP_VER*" } |
                 Select-Object -First 1
    if ($extracted -and $extracted.FullName -ne $VSP_DEST) {
        Rename-Item $extracted.FullName "OpenVSP-$VSP_VER"
    }

    # Public desktop shortcut.
    $ws   = New-Object -ComObject WScript.Shell
    $desk = [Environment]::GetFolderPath('CommonDesktopDirectory')
    $sc   = $ws.CreateShortcut("$desk\OpenVSP $VSP_VER.lnk")
    $sc.TargetPath       = "$VSP_DEST\vsp.exe"
    $sc.WorkingDirectory = $VSP_DEST
    $sc.Save()
    Write-Log '    Shortcut created on Public Desktop.'
}

# ================================================================
#  [10/12]  NOTEPAD++  (latest)
# ================================================================
Invoke-Section '[10/12] Notepad++ (latest)' {
    $nppInstalled = (Test-Path "$env:ProgramFiles\Notepad++\notepad++.exe") -or
                    (Test-Path "${env:ProgramFiles(x86)}\Notepad++\notepad++.exe")
    if ($nppInstalled) {
        Write-Log '    Already installed - skipping.'
        return
    }

    $installer = Get-ChildItem "$instDir\npp.*Installer64.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if ($installer) {
        Write-Log '    Using staged installer.'
        $nppExe = $installer.FullName
    } else {
        Write-Log '    Not staged - downloading latest...'
        $url = Get-GhAssetUrl 'notepad-plus-plus/notepad-plus-plus' 'npp.*Installer64.exe'
        if (-not $url) { Write-Log '    [WARN] Could not resolve download URL.'; return }
        $nppExe = "$env:TEMP\npp-latest-Installer64.exe"
        Invoke-WebRequest $url -OutFile $nppExe -UseBasicParsing
    }

    $proc = Start-Process -FilePath $nppExe -ArgumentList '/S' -Wait -PassThru
    Write-Result $proc.ExitCode
}

# ================================================================
#  [11/12]  7-ZIP  (latest)
# ================================================================
Invoke-Section '[11/12] 7-Zip (latest)' {
    $zipInstalled = (Test-Path 'HKLM:\SOFTWARE\7-Zip') -or
                    (Test-Path 'HKLM:\SOFTWARE\WOW6432Node\7-Zip')
    if ($zipInstalled) {
        Write-Log '    Already installed - skipping.'
        return
    }

    $installer = Get-ChildItem "$instDir\7z*-x64.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
    if ($installer) {
        Write-Log '    Using staged installer.'
        $zipExe = $installer.FullName
    } else {
        Write-Log '    Not staged - downloading latest...'
        $url = Get-GhAssetUrl 'ip7z/7zip' '7z*-x64.exe'
        if (-not $url) { Write-Log '    [WARN] Could not resolve download URL.'; return }
        $zipExe = "$env:TEMP\7z-latest-x64.exe"
        Invoke-WebRequest $url -OutFile $zipExe -UseBasicParsing
    }

    $proc = Start-Process -FilePath $zipExe -ArgumentList '/S' -Wait -PassThru
    Write-Result $proc.ExitCode
}

# ================================================================
#  [12/12]  NETWORK PRINTER
# ================================================================
Invoke-Section "[12/12] Network printer: $PRINTER" {
    $printerName = $PRINTER
    if (Get-Printer -Name $printerName -ErrorAction SilentlyContinue) {
        Write-Log '    Already mapped - skipping.'
        return
    }

    try {
        Add-Printer -ConnectionName $printerName -ErrorAction Stop
        Write-Log '    [OK]'
    } catch {
        Write-Log "    [WARN] Could not add printer automatically: $_"
        Write-Log "    Manual: Settings > Printers & Scanners > Add a printer > $printerName"
    }
}

# ================================================================
#  COMPLETION
# ================================================================
Write-Log '================================================================'
Write-Log "DEPLOYMENT COMPLETE: $(Get-Date)"
Write-Log '================================================================'

'COMPLETED' | Set-Content $donePath -Encoding UTF8
# Lock is intentionally NOT removed - prevents future accidental re-runs.

Write-Host ''
Write-Host '  NEXT STEPS:'
Write-Host '  1. Open a NEW terminal to use conda / Python 3.13'
Write-Host '  2. VS Code Remote-SSH: F1 > "Remote-SSH: Add New Host" — SSH wrapper is pre-configured'
Write-Host '  3. TortoiseGit: shell icons may need Explorer restart'
Write-Host '  4. MikTeX: run MikTeX Console after first launch to update packages'
Write-Host "  5. OpenVSP: $VSP_DEST\vsp.exe (Public Desktop shortcut created)"
Write-Host '  6. Printer: Settings > Printers & Scanners > verify'
Write-Host ''
Write-Host "  Log: $logFile"
Read-Host 'Press Enter to close'
