@echo off
setlocal EnableDelayedExpansion

:: ================================================================
::  TTT PATHWAYS INTERN WORKSTATION DEPLOYMENT
::  Interns: Lukman Kohler, Louis-Gustave Theulier, Zijun Wang
::
::  Run from: \\server\share\Deploy-TTT\  (map a drive first)
::  e.g.  net use K: \\e4-arch2\Staging\kirk\Deploy-TTT
::        K:\Deploy-TTT.bat
::
::  PRE-STAGE in .\Installers\:
::    Miniforge3-Windows-x86_64.exe
::    VSCodeSetup-x64-x.x.x.exe          (or auto-downloaded)
::    ssh-wrapper.bat                     (required)
::    basic-miktex-x.x-x64.exe           (required - no stable URL)
::    MobaXterm_installer_x.y.msi        (required - no direct URL)
::    OpenVSP-3.50.4-win64-Python3.13.zip           (or auto-downloaded)
::
::  AUTO-DOWNLOADED (no staging needed):
::    Git for Windows        github.com/git-for-windows/git
::    TortoiseGit            tortoisegit.org
::    PuTTY-CAC              github.com/NoMoreFood/putty-cac
::    Notepad++              github.com/notepad-plus-plus
::    7-Zip                  github.com/ip7z/7zip
::    TeXstudio              github.com/texstudio-org/texstudio
::    VS Code                update.code.visualstudio.com
::
::  Software deployed:
::    [1]  Miniforge3 (Python 3.13, registered as default)
::    [2]  VS Code + Python + Remote-SSH + GitLens + SSH wrapper
::    [3]  Git for Windows
::    [4]  TortoiseGit
::    [5]  PuTTY-CAC (NoMoreFood, latest)
::    [6]  MobaXterm
::    [7]  MikTeX
::    [8]  TeXstudio
::    [9]  OpenVSP 3.50.4
::    [10] Notepad++ (auto-download)
::    [11] 7-Zip (auto-download)
::    [12] Network Printer \\hplrcprtp01\LA_2101_200_1
:: ================================================================

title TTT Pathways Intern Deployment

:: ---------------------------------------------------------------
::  SELF-ELEVATE
:: ---------------------------------------------------------------
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Not running as Administrator. Relaunching elevated...
    powershell -NoProfile -Command ^
        "Start-Process cmd.exe -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: ---------------------------------------------------------------
::  CONFIGURATION
:: ---------------------------------------------------------------
set "PRINTER_UNC=\\hplrcprtp01\LA_2101_200_1"
set "PRINTER_DRIVER=HP Universal Printing PCL 6"

:: ---------------------------------------------------------------
::  PATH RESOLUTION - handles UNC and mapped drive
:: ---------------------------------------------------------------
set "SCRIPTDIR=%~dp0"
if "%SCRIPTDIR:~-1%"=="\" set "SCRIPTDIR=%SCRIPTDIR:~0,-1%"
if "%SCRIPTDIR:~2%"=="" set "SCRIPTDIR=%CD%"
if "%SCRIPTDIR:~-1%"=="\" set "SCRIPTDIR=%SCRIPTDIR:~0,-1%"

:: Always stage installers locally to avoid UNC execution blocks
set "INSTDIR=%TEMP%\DeployInstallers"
if exist "%INSTDIR%" rd /s /q "%INSTDIR%"
mkdir "%INSTDIR%"
echo [INFO] Staging installers to local temp: %INSTDIR%
xcopy /E /I /Y "%SCRIPTDIR%\Installers\*" "%INSTDIR%\" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] xcopy returned non-zero - Installers folder may be empty or missing.
    echo [WARN] Script will auto-download anything not staged.
)

:: ---------------------------------------------------------------
::  LOG SETUP
:: ---------------------------------------------------------------
set "LOGFILE=%TEMP%\TTT_Deploy_%COMPUTERNAME%_%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%.log"
echo TTT Pathways Deployment Log > "%LOGFILE%"
echo Computer : %COMPUTERNAME% >> "%LOGFILE%"
echo Date     : %DATE% %TIME% >> "%LOGFILE%"
echo Source   : %SCRIPTDIR% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

echo.
echo ================================================================
echo   TTT PATHWAYS INTERN DEPLOYMENT
echo   Interns: Lukman Kohler, Louis-Gustave Theulier, Zijun Wang
echo   Machine : %COMPUTERNAME%
echo   Log     : %LOGFILE%
echo ================================================================
echo.

goto :main

:: ---------------------------------------------------------------
::  SUBROUTINES
:: ---------------------------------------------------------------
:log
    echo %~1
    echo %~1 >> "%LOGFILE%"
    goto :eof
:ok
    call :log "    [OK]"
    goto :eof
:fail
    call :log "    [FAILED] Exit code: %~1"
    goto :eof
:result
    if "%~1"=="0" ( call :ok ) else ( call :fail %~1 )
    goto :eof

:: Helper: fetch latest GitHub release asset URL
:: Writes URL to %TEMP%\gh_asset_url.txt
:: Usage: call :gh_asset <repo> <asset_pattern>
:: Result in GH_RESULT variable
:gh_asset
    set "GH_REPO=%~1"
    set "GH_PAT=%~2"
    set "GH_RESULT="
    set "_GHPS=%TEMP%\gh_asset_fetch.ps1"
    set "_GHOUT=%TEMP%\gh_asset_url.txt"
    if exist "%_GHPS%" del /q "%_GHPS%"
    if exist "%_GHOUT%" del /q "%_GHOUT%"
    echo $rel = Invoke-RestMethod "https://api.github.com/repos/%GH_REPO%/releases/latest"> "%_GHPS%"
    echo $url = ($rel.assets ^| Where-Object ^{ $_.name -like "%GH_PAT%" ^} ^| Select-Object -ExpandProperty browser_download_url -First 1)>> "%_GHPS%"
    echo if ($url) ^{ $url.Trim() ^| Out-File -FilePath "%_GHOUT%" -Encoding ASCII -NoNewline ^}>> "%_GHPS%"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%_GHPS%" >> "%LOGFILE%" 2>&1
    if exist "%_GHOUT%" set /p GH_RESULT= < "%_GHOUT%"
    goto :eof

:: ================================================================
:main
:: ================================================================

:: Check if deployment already completed successfully on this machine
set "DONE_FLAG=%TEMP%\TTT_Deploy_%COMPUTERNAME%_COMPLETE.flag"
if exist "%DONE_FLAG%" (
    echo.
    echo [INFO] Deployment was already completed on this machine.
    echo [INFO] Flag: %DONE_FLAG%
    echo [INFO] Delete that file and re-run to force a fresh deployment.
    echo.
    pause
    exit /b 0
)

:: ---------------------------------------------------------------
::  1. MINIFORGE3 (Python 3.13, registered as default)
::  FIX: was using a literal for loop that always matched; use if exist instead
::  FIX: added already-installed skip to avoid "directory not empty" error
:: ---------------------------------------------------------------
call :log "[1/12] Miniforge3 (Python 3.13, register as default)"
set "MFORGE_DEST=%USERPROFILE%\Miniforge3"
if exist "!MFORGE_DEST!\Scripts\conda.exe" (
    call :log "    Already installed at !MFORGE_DEST! - skipping."
    call :log "    To reinstall, delete !MFORGE_DEST! and re-run."
) else (
    set "MFORGE_EXE="
    if exist "%INSTDIR%\Miniforge3-Windows-x86_64.exe" (
        set "MFORGE_EXE=%INSTDIR%\Miniforge3-Windows-x86_64.exe"
        call :log "    Using staged installer."
    ) else (
        call :log "    Not staged - downloading latest..."
        set "MFORGE_EXE=%TEMP%\Miniforge3-Windows-x86_64.exe"
        curl -L --silent --show-error -o "!MFORGE_EXE!" ^
            "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Windows-x86_64.exe"
        if !errorlevel! neq 0 ( call :log "    [WARN] Download failed." & set "MFORGE_EXE=" )
    )

    if defined MFORGE_EXE (
        if not exist "!MFORGE_EXE!" (
            call :log "    [ERROR] File not found: !MFORGE_EXE!"
        ) else (
            call :log "    Installing to !MFORGE_DEST!..."
            "!MFORGE_EXE!" /InstallationType=JustMe /RegisterPython=1 /AddToPath=0 /S /D=!MFORGE_DEST!
            call :result !errorlevel!
            call :log "    Initializing conda for cmd and PowerShell..."
            "!MFORGE_DEST!\Scripts\conda.exe" init cmd.exe >> "%LOGFILE%" 2>&1
            "!MFORGE_DEST!\Scripts\conda.exe" init powershell >> "%LOGFILE%" 2>&1
            call :log "    Writing .condarc (conda-forge only, no defaults)..."
            if exist "!MFORGE_DEST!\.condarc" del /q "!MFORGE_DEST!\.condarc"
            echo channels:>> "!MFORGE_DEST!\.condarc"
            echo   - conda-forge>> "!MFORGE_DEST!\.condarc"
            echo channel_priority: strict>> "!MFORGE_DEST!\.condarc"
            echo default_channels: []>> "!MFORGE_DEST!\.condarc"
            echo auto_activate_base: false>> "!MFORGE_DEST!\.condarc"
            call :result !errorlevel!
            call :log "    Python 3.13 ready. Open a new terminal and run: conda activate base"
        )
    )
)
echo.

:: ---------------------------------------------------------------
::  2. VS CODE + EXTENSIONS + SSH WRAPPER CONFIG
:: ---------------------------------------------------------------
call :log "[2/12] Visual Studio Code + extensions + SSH wrapper"
if exist "%ProgramFiles%\Microsoft VS Code\Code.exe" (
    call :log "    Already installed - skipping installer and extensions."
) else (
    set "VSCODE_EXE="
    for /f "delims=" %%f in ('dir /b "%INSTDIR%\VSCodeSetup-x64-*.exe" 2^>nul') do set "VSCODE_EXE=%INSTDIR%\%%f"
    if not defined VSCODE_EXE (
        call :log "    Not staged - downloading..."
        set "VSCODE_EXE=%TEMP%\VSCodeSetup-x64.exe"
        curl -L --silent --show-error -o "!VSCODE_EXE!" ^
            "https://update.code.visualstudio.com/latest/win32-x64/stable"
        if !errorlevel! neq 0 ( call :log "    [WARN] Download failed." & set "VSCODE_EXE=" )
    ) else (
        call :log "    Using staged installer."
    )
    if defined VSCODE_EXE (
        set "VSCODE_TASKS=desktopicon,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath"
        "!VSCODE_EXE!" /VERYSILENT /NORESTART "/MERGETASKS=!VSCODE_TASKS!"
        call :result !errorlevel!
        call :log "    Installing extensions: Python, Remote-SSH, GitLens..."
        "%ProgramFiles%\Microsoft VS Code\bin\code.cmd" --install-extension ms-python.python >> "%LOGFILE%" 2>&1
        "%ProgramFiles%\Microsoft VS Code\bin\code.cmd" --install-extension ms-vscode-remote.remote-ssh >> "%LOGFILE%" 2>&1
        "%ProgramFiles%\Microsoft VS Code\bin\code.cmd" --install-extension eamodio.gitlens >> "%LOGFILE%" 2>&1
        call :result !errorlevel!
    )
)

:: SSH wrapper setup (runs whether or not VS Code was just installed)
call :log "    Configuring SSH wrapper (PuTTY-CAC/Pageant for Remote-SSH)..."
set "SSH_WRAPPER_SRC=%INSTDIR%\ssh-wrapper.bat"
set "SSH_WRAPPER_DEST=%USERPROFILE%\ssh-wrapper.bat"

if not exist "!SSH_WRAPPER_SRC!" (
    call :log "    [WARN] ssh-wrapper.bat not found in Installers\ - skipping SSH config."
) else (
    copy /Y "!SSH_WRAPPER_SRC!" "!SSH_WRAPPER_DEST!" >nul 2>&1
    call :log "    Copied ssh-wrapper.bat to !SSH_WRAPPER_DEST!"

    :: Ensure .ssh dir and blank config exist
    set "SSH_DIR=%USERPROFILE%\.ssh"
    if not exist "!SSH_DIR!" mkdir "!SSH_DIR!"
    if not exist "!SSH_DIR!\config" (
        echo # SSH config - add hosts via VS Code F1 ^> Remote-SSH: Add New Host > "!SSH_DIR!\config"
        call :log "    Created blank .ssh\config"
    ) else (
        call :log "    .ssh\config already exists - skipping"
    )

    :: Write/merge remote.SSH.path into VS Code settings.json
    set "VSCODE_CFG=%APPDATA%\Code\User"
    set "VSCODE_SETTINGS=!VSCODE_CFG!\settings.json"
    if not exist "!VSCODE_CFG!" mkdir "!VSCODE_CFG!"
    set "SSH_WRAP_PS=%TEMP%\set_ssh_wrapper.ps1"
    if exist "!SSH_WRAP_PS!" del /q "!SSH_WRAP_PS!"
    echo $wrapPath = '!SSH_WRAPPER_DEST:\=\\!'>> "!SSH_WRAP_PS!"
    echo $settingsPath = '!VSCODE_SETTINGS:\=\\!'>> "!SSH_WRAP_PS!"
    echo if (-not (Test-Path $settingsPath)) ^{ '{}' ^| Set-Content $settingsPath -Encoding UTF8 ^}>> "!SSH_WRAP_PS!"
    echo $raw = Get-Content $settingsPath -Raw>> "!SSH_WRAP_PS!"
    echo try ^{ $json = $raw ^| ConvertFrom-Json ^} catch ^{ $json = [PSCustomObject]@^{^} ^}>> "!SSH_WRAP_PS!"
    echo $json ^| Add-Member -Force -NotePropertyName 'remote.SSH.path' -NotePropertyValue $wrapPath>> "!SSH_WRAP_PS!"
    echo $json ^| ConvertTo-Json -Depth 10 ^| Set-Content $settingsPath -Encoding UTF8>> "!SSH_WRAP_PS!"
    powershell -NoProfile -ExecutionPolicy Bypass -File "!SSH_WRAP_PS!" >> "%LOGFILE%" 2>&1
    call :result !errorlevel!
    call :log "    VS Code settings.json updated: remote.SSH.path = !SSH_WRAPPER_DEST!"
)
echo.

:: ---------------------------------------------------------------
::  3. GIT FOR WINDOWS
:: ---------------------------------------------------------------
call :log "[3/12] Git for Windows (latest)"
if exist "%ProgramFiles%\Git\cmd\git.exe" (
    call :log "    Already installed - skipping."
) else (
    set "GIT_EXE="
    for /f "delims=" %%f in ('dir /b "%INSTDIR%\Git-*-64-bit.exe" 2^>nul') do set "GIT_EXE=%INSTDIR%\%%f"
    if not defined GIT_EXE (
        call :log "    Not staged - fetching latest from GitHub..."
        set "GIT_EXE=%TEMP%\Git-latest-64-bit.exe"
        call :gh_asset "git-for-windows/git" "*64-bit.exe"
        if defined GH_RESULT ( curl -L --silent --show-error -o "!GIT_EXE!" "!GH_RESULT!" ) else ( set "GIT_EXE=" )
    ) else (
        call :log "    Using staged installer."
    )
    if defined GIT_EXE (
        if exist "!GIT_EXE!" (
            "!GIT_EXE!" /VERYSILENT /NORESTART /NOCANCEL /SP- ^
                /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh,gitlfs" ^
                /o:PathOption=Cmd /o:BashTerminalOption=ConHost /o:EnableSymlinks=Disabled
            call :result !errorlevel!
        )
    )
)
echo.

:: ---------------------------------------------------------------
::  4. TORTOISEGIT
:: ---------------------------------------------------------------
call :log "[4/12] TortoiseGit (latest)"
if exist "%ProgramFiles%\TortoiseGit\bin\TortoiseGit.exe" (
    call :log "    Already installed - skipping."
) else (
    set "TGIT_MSI="
    for /f "delims=" %%f in ('dir /b "%INSTDIR%\TortoiseGit-*-64bit.msi" 2^>nul') do set "TGIT_MSI=%INSTDIR%\%%f"
    if not defined TGIT_MSI (
        call :log "    Not staged - fetching latest from GitHub..."
        set "TGIT_MSI=%TEMP%\TortoiseGit-latest-64bit.msi"
        call :gh_asset "TortoiseGit/TortoiseGit" "TortoiseGit-*-64bit.msi"
        if defined GH_RESULT ( curl -L --silent --show-error -o "!TGIT_MSI!" "!GH_RESULT!" ) else ( set "TGIT_MSI=" )
    ) else (
        call :log "    Using staged installer."
    )
    if defined TGIT_MSI (
        if exist "!TGIT_MSI!" (
            msiexec.exe /i "!TGIT_MSI!" /qn /norestart REBOOT=ReallySuppress
            call :result !errorlevel!
            call :log "    Shell icons active after Explorer restart or reboot."
        )
    )
)
echo.

:: ---------------------------------------------------------------
::  5. PUTTY-CAC (NoMoreFood, latest x64 MSI)
:: ---------------------------------------------------------------
call :log "[5/12] PuTTY-CAC (NoMoreFood, latest)"
set "PUTTY_MSI="
for /f "delims=" %%f in ('dir /b "%INSTDIR%\puttycac-*-x64.msi" 2^>nul') do set "PUTTY_MSI=%INSTDIR%\%%f"

if not defined PUTTY_MSI (
    call :log "    Not staged - fetching latest release asset from GitHub..."
    set "PUTTY_MSI=%TEMP%\puttycac-latest-x64.msi"
    call :gh_asset "NoMoreFood/putty-cac" "puttycac-*-x64.msi"
    if defined GH_RESULT (
        curl -L --silent --show-error -o "!PUTTY_MSI!" "!GH_RESULT!"
        if !errorlevel! neq 0 set "PUTTY_MSI="
    ) else (
        call :log "    [WARN] Could not find release asset. Stage puttycac-*-x64.msi manually."
        set "PUTTY_MSI="
    )
) else (
    call :log "    Using staged installer."
)

if defined PUTTY_MSI (
    if exist "!PUTTY_MSI!" (
        set "PUTTY_TMP=%TEMP%\PuTTYInstall"
        if exist "!PUTTY_TMP!" rd /s /q "!PUTTY_TMP!"
        mkdir "!PUTTY_TMP!"
        copy /Y "!PUTTY_MSI!" "!PUTTY_TMP!\" >nul 2>&1
        set "PUTTY_LOCAL="
        for /f "delims=" %%f in ('dir /b "!PUTTY_TMP!\puttycac-*-x64.msi" 2^>nul') do set "PUTTY_LOCAL=!PUTTY_TMP!\%%f"
        msiexec.exe /i "!PUTTY_LOCAL!" /qn /norestart
        set "PUTTY_RC=!errorlevel!"
        call :result !PUTTY_RC!
    )
)
echo.

:: ---------------------------------------------------------------
::  6. MOBAXTERM (MSI - must be staged, no direct download URL)
::  FIX: added already-installed skip
::  FIX: replaced for-loop glob inside else block with for /f + dir /b
::       (delayed-expansion paths in for-in patterns are unreliable)
:: ---------------------------------------------------------------
call :log "[6/12] MobaXterm"

:: Already-installed check
set "MOBA_SKIP=0"
if exist "%ProgramFiles(x86)%\Mobatek\MobaXterm\MobaXterm.exe" set "MOBA_SKIP=1"
if exist "%ProgramFiles%\Mobatek\MobaXterm\MobaXterm.exe" set "MOBA_SKIP=1"

if "!MOBA_SKIP!"=="1" (
    call :log "    Already installed - skipping."
) else (
    set "MOBA_MSI="
    for /f "delims=" %%f in ('dir /b "%INSTDIR%\MobaXterm_installer_*.msi" 2^>nul') do set "MOBA_MSI=%INSTDIR%\%%f"

    if not defined MOBA_MSI (
        call :log "    NOT FOUND in Installers\"
        call :log "    Download from: https://mobaxterm.mobatek.net/download.html"
        call :log "    Stage as: Installers\MobaXterm_installer_x.y.msi"
        call :log "    [SKIP]"
    ) else (
        call :log "    Installing from staged: !MOBA_MSI!"
        set "MOBA_TMP=%TEMP%\MobaInstall"
        if exist "!MOBA_TMP!" rd /s /q "!MOBA_TMP!"
        mkdir "!MOBA_TMP!"
        :: Copy MSI and any companion files (e.g. .dat) to local temp
        for /f "delims=" %%f in ('dir /b "%INSTDIR%\MobaXterm*" 2^>nul') do copy /Y "%INSTDIR%\%%f" "!MOBA_TMP!\" >nul 2>&1
        set "MOBA_LOCAL="
        for /f "delims=" %%f in ('dir /b "!MOBA_TMP!\MobaXterm_installer_*.msi" 2^>nul') do set "MOBA_LOCAL=!MOBA_TMP!\%%f"
        if not defined MOBA_LOCAL (
            call :log "    [ERROR] Could not locate MSI in temp folder."
        ) else (
            call :log "    Running: !MOBA_LOCAL!"
            msiexec.exe /i "!MOBA_LOCAL!" /qn /norestart /L*v "%LOGFILE%.moba.log"
            set "MOBA_RC=!errorlevel!"
            call :result !MOBA_RC!
        )
    )
)
echo.

:: ---------------------------------------------------------------
::  7. MIKTEX (must be staged - no stable direct download URL)
::  FIX: quoted wildcard in for-in treated as literal, not glob;
::       use for /f + dir /b (same fix applied to MobaXterm earlier)
:: ---------------------------------------------------------------
call :log "[7/12] MikTeX"
set "MIKTEX_EXE="
for /f "delims=" %%f in ('dir /b "%INSTDIR%\basic-miktex-*-x64.exe" 2^>nul') do set "MIKTEX_EXE=%INSTDIR%\%%f"

if not defined MIKTEX_EXE (
    call :log "    NOT FOUND in Installers\"
    call :log "    Download from: https://miktex.org/download"
    call :log "    Stage as: Installers\basic-miktex-x.x-x64.exe"
    call :log "    [SKIP]"
) else (
    call :log "    Using staged installer: !MIKTEX_EXE!"
    call :log "    NOTE: A progress window will appear - this is normal for MikTeX."
    "!MIKTEX_EXE!" --unattended --shared --auto-install=yes --paper-size=Letter
    call :result !errorlevel!
)
echo.

:: ---------------------------------------------------------------
::  8. TEXSTUDIO (auto-download latest)
:: ---------------------------------------------------------------
call :log "[8/12] TeXstudio (latest)"
if exist "%ProgramFiles%\texstudio\texstudio.exe" (
    call :log "    Already installed - skipping."
) else (
    set "TXS_EXE="
    for /f "delims=" %%f in ('dir /b "%INSTDIR%\texstudio-*-win-x64.exe" 2^>nul') do set "TXS_EXE=%INSTDIR%\%%f"
    if not defined TXS_EXE (
        for /f "delims=" %%f in ('dir /b "%INSTDIR%\texstudio-*-win-qt*.exe" 2^>nul') do set "TXS_EXE=%INSTDIR%\%%f"
    )
    if not defined TXS_EXE (
        call :log "    Not staged - downloading latest..."
        set "TXS_EXE=%TEMP%\texstudio-latest-win-x64.exe"
        call :gh_asset "texstudio-org/texstudio" "*win-x64.exe"
        if defined GH_RESULT ( curl -L --silent --show-error -o "!TXS_EXE!" "!GH_RESULT!" ) else ( set "TXS_EXE=" )
    ) else (
        call :log "    Using staged installer."
    )
    if defined TXS_EXE (
        if exist "!TXS_EXE!" (
            call :log "    Installing silently..."
            "!TXS_EXE!" /S /NORESTART
            call :result !errorlevel!
        )
    )
)
echo.

:: ---------------------------------------------------------------
::  9. OPENVSP 3.50.4
:: ---------------------------------------------------------------
call :log "[9/12] OpenVSP 3.50.4"
set "VSP_DEST=C:\OpenVSP-3.50.4"
set "VSP_ZIP=%INSTDIR%\OpenVSP-3.50.4-win64-Python3.13.zip"

if exist "!VSP_DEST!\vsp.exe" (
    call :log "    Already installed at !VSP_DEST! - skipping."
) else (
    :: Use flag instead of goto-inside-block to avoid CMD block-parser confusion
    set "VSP_OK=0"
    if not exist "!VSP_ZIP!" (
        call :log "    NOT FOUND in Installers\"
        call :log "    Download from: https://openvsp.org/download.php"
        call :log "    Stage as: Installers\OpenVSP-3.50.4-win64-Python3.13.zip"
        call :log "    [SKIP]"
    ) else (
        call :log "    Using staged zip."
        set "VSP_OK=1"
    )
    if "!VSP_OK!"=="1" (
        set "VSP_PS=C:\vsp_install.ps1"
        if exist "!VSP_PS!" del /q "!VSP_PS!"
        echo $zip = "!VSP_ZIP!">> "!VSP_PS!"
        echo $dest = "C:\">> "!VSP_PS!"
        echo Expand-Archive -Path $zip -DestinationPath $dest -Force>> "!VSP_PS!"
        echo $extracted = Get-ChildItem "C:\" -Directory ^| Where-Object { $_.Name -like "OpenVSP-3.50.4*" } ^| Select-Object -First 1>> "!VSP_PS!"
        echo if ($extracted -and $extracted.FullName -ne "C:\OpenVSP-3.50.4") { Rename-Item $extracted.FullName "OpenVSP-3.50.4" }>> "!VSP_PS!"
        echo $ws = New-Object -ComObject WScript.Shell>> "!VSP_PS!"
        echo $desk = [Environment]::GetFolderPath("CommonDesktopDirectory")>> "!VSP_PS!"
        echo $sc = $ws.CreateShortcut($desk + "\OpenVSP 3.50.4.lnk")>> "!VSP_PS!"
        echo $sc.TargetPath = "C:\OpenVSP-3.50.4\vsp.exe">> "!VSP_PS!"
        echo $sc.WorkingDirectory = "C:\OpenVSP-3.50.4">> "!VSP_PS!"
        echo $sc.Save()>> "!VSP_PS!"
        call :log "    Extracting and installing OpenVSP..."
        powershell -NoProfile -ExecutionPolicy Bypass -File "!VSP_PS!" >> "%LOGFILE%" 2>&1
        call :result !errorlevel!
    )
)
echo.

:: ---------------------------------------------------------------
::  10. NOTEPAD++ (auto-download latest)
:: ---------------------------------------------------------------
call :log "[10/12] Notepad++ (latest)"
set "NPP_SKIP=0"
if exist "%ProgramFiles%\Notepad++\notepad++.exe" set "NPP_SKIP=1"
if exist "%ProgramFiles(x86)%\Notepad++\notepad++.exe" set "NPP_SKIP=1"

if "!NPP_SKIP!"=="1" (
    call :log "    Already installed - skipping."
) else (
    set "NPP_EXE="
    for /f "delims=" %%f in ('dir /b "%INSTDIR%\npp.*.Installer.x64.exe" 2^>nul') do set "NPP_EXE=%INSTDIR%\%%f"
    if not defined NPP_EXE (
        call :log "    Not staged - downloading latest..."
        set "NPP_EXE=%TEMP%\npp-latest.Installer.x64.exe"
        call :gh_asset "notepad-plus-plus/notepad-plus-plus" "npp.*.Installer.x64.exe"
        if defined GH_RESULT ( curl -L --silent --show-error -o "!NPP_EXE!" "!GH_RESULT!" ) else ( set "NPP_EXE=" )
    ) else (
        call :log "    Using staged installer."
    )
    if defined NPP_EXE (
        if exist "!NPP_EXE!" (
            "!NPP_EXE!" /S /noUpdater
            call :result !errorlevel!
        )
    )
)
echo.

:: ---------------------------------------------------------------
::  11. 7-ZIP (auto-download latest)
:: ---------------------------------------------------------------
call :log "[11/12] 7-Zip (latest)"

:: Check if already installed first
set "ZIP_SKIP=0"
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "7-Zip" >nul 2>&1
if !errorlevel!==0 set "ZIP_SKIP=1"
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "7-Zip" >nul 2>&1
if !errorlevel!==0 set "ZIP_SKIP=1"

if "!ZIP_SKIP!"=="1" (
    call :log "    Already installed - skipping."
) else (
    set "ZIP_EXE="
    for /f "delims=" %%f in ('dir /b "%INSTDIR%\7z*-x64.exe" 2^>nul') do set "ZIP_EXE=%INSTDIR%\%%f"

    if not defined ZIP_EXE (
        call :log "    Not staged - downloading latest..."
        set "ZIP_EXE=%TEMP%\7z-latest-x64.exe"
        call :gh_asset "ip7z/7zip" "7z*-x64.exe"
        if defined GH_RESULT ( curl -L --silent --show-error -o "!ZIP_EXE!" "!GH_RESULT!" ) else ( set "ZIP_EXE=" )
    ) else (
        call :log "    Using staged installer."
    )

    if defined ZIP_EXE (
        if exist "!ZIP_EXE!" (
            "!ZIP_EXE!" /S
            call :result !errorlevel!
        )
    )
)
echo.

:: ---------------------------------------------------------------
::  12. NETWORK PRINTER
::  FIX: replaced deprecated wmic with PowerShell Get-Printer
:: ---------------------------------------------------------------
call :log "[12/12] Network printer: %PRINTER_UNC%"
set "ALREADY=0"
powershell -NoProfile -Command ^
    "if (Get-Printer -Name '*LA_2101_200_1*' -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if !errorlevel!==0 set "ALREADY=1"

if "!ALREADY!"=="1" (
    call :log "    Already mapped - skipping."
) else (
    call :log "    Adding via rundll32 (prnmngr.vbs removed in Win11 24H2)..."
    rundll32 printui.dll,PrintUIEntry /in /n "%PRINTER_UNC%" /q
    call :result !errorlevel!
)
echo.

:: ---------------------------------------------------------------
::  COMPLETE
:: ---------------------------------------------------------------
echo ================================================================
call :log "DEPLOYMENT COMPLETE: %DATE% %TIME%"
echo COMPLETED > "%DONE_FLAG%"
echo   Log: %LOGFILE%
echo ================================================================
echo.
echo  NEXT STEPS:
echo  1. Open a NEW terminal to use conda / Python 3.13
echo  2. VS Code Remote-SSH: F1 ^> "Remote-SSH: Add New Host"
echo     SSH wrapper (PuTTY-CAC/Pageant) is pre-configured
echo  3. TortoiseGit shell icons: may require Explorer restart
echo     taskkill /f /im explorer.exe ^& start explorer.exe
echo  4. MikTeX: run MikTeX Console after first launch to update packages
echo  5. OpenVSP: C:\OpenVSP-3.50.4\vsp.exe (Public Desktop shortcut)
echo  6. Printer: Settings ^> Printers ^& Scanners ^> verify
echo.
pause
endlocal
