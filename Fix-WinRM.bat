@echo off
setlocal EnableDelayedExpansion
title WinRM HTTPS Setup

:: ================================================================
::  ELEVATION CHECK
:: ================================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [!] This script must be run from an ELEVATED Command Prompt.
    echo      Right-click CMD and choose "Run as administrator".
    echo.
    pause
    exit /b 1
)

:: ================================================================
::  INTRO
:: ================================================================
cls
echo.
echo  ==============================================================
echo   WinRM HTTPS Configuration Script
echo   Run from Elevated CMD - NOT PowerShell
echo  ==============================================================
echo.
echo  This script will walk through each step with a pause so you
echo  can review output before continuing.
echo.
pause

:: ================================================================
::  STEP 1 - Restore WinRM to clean defaults
:: ================================================================
cls
echo.
echo  [STEP 1/9]  Reset WinRM to a clean state
echo  ----------------------------------------------------------
echo  Deletes any existing HTTP and HTTPS listeners so quickconfig
echo  can rebuild them from scratch.  (winrm invoke Restore is not
echo  a valid action - this is the correct way to start clean.)
echo.

echo  Removing HTTP listener (ignore "not found" errors)...
winrm delete winrm/config/Listener?Address=*+Transport=HTTP  2>nul
echo  Removing HTTPS listener (ignore "not found" errors)...
winrm delete winrm/config/Listener?Address=*+Transport=HTTPS 2>nul

echo.
echo  Resetting core WinRM config values to Windows defaults...
winrm set winrm/config @{MaxEnvelopeSizekb="500";MaxTimeoutms="60000";MaxBatchItems="32000"}
winrm set winrm/config/service @{AllowUnencrypted="false"}
winrm set winrm/config/service/auth @{Basic="false";Kerberos="true";Negotiate="true";Certificate="false"}

echo.
echo  Done. All existing listeners removed - ready for quickconfig.
pause

:: ================================================================
::  STEP 2 - Check current settings
:: ================================================================
cls
echo.
echo  [STEP 2/9]  Check current WinRM configuration
echo  ----------------------------------------------------------
echo  winrm get winrm/config
echo.
winrm get winrm/config
echo.
echo  Done. Review output above.
pause

:: ================================================================
::  STEP 3 - Quick config for HTTPS
:: ================================================================
cls
echo.
echo  [STEP 3/9]  Run quickconfig for HTTPS
echo  ----------------------------------------------------------
echo  NOTE: A valid certificate must already exist on this machine.
echo        The cert CN must match the hostname used to connect.
echo.
echo  winrm quickconfig -transport:https
echo.
winrm quickconfig -transport:https
echo.
echo  Done. Review output above.
pause

:: ================================================================
::  STEP 4 - Confirm listeners
:: ================================================================
cls
echo.
echo  [STEP 4/9]  Confirm WinRM listeners
echo  ----------------------------------------------------------
echo  winrm enumerate winrm/config/listener
echo.
winrm enumerate winrm/config/listener
echo.
echo  You should see a listener with Transport=HTTPS on Port 5986.
pause

:: ================================================================
::  STEP 5 - Confirm certificate thumbprint
:: ================================================================
cls
echo.
echo  [STEP 5/9]  Confirm certificate (thumbprint should be populated)
echo  ----------------------------------------------------------
echo  winrm get http://schemas.microsoft.com/wbem/wsman/1/config
echo.
winrm get http://schemas.microsoft.com/wbem/wsman/1/config
echo.
echo  Look for CertificateThumbprint under the HTTPS listener.
pause

:: ================================================================
::  STEP 6 - Create firewall rule for port 5986
:: ================================================================
cls
echo.
echo  [STEP 6/9]  Create inbound firewall rule for WinRM HTTPS (5986)
echo  ----------------------------------------------------------
echo  Calling PowerShell for New-NetFirewallRule...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "New-NetFirewallRule -DisplayName '5986 WinRM Listener HTTPS' ^
     -Direction Inbound -LocalPort 5986 -Protocol TCP -Action Allow ^
     -Profile Domain,Private,Public -PolicyStore PersistentStore ^
     -ErrorAction SilentlyContinue; ^
     if ($?) { Write-Host '  [OK] Firewall rule created.' -ForegroundColor Green } ^
     else { Write-Host '  [NOTE] Rule may already exist.' -ForegroundColor Yellow }"
echo.
pause

:: ================================================================
::  STEP 7 - Verify firewall rule
:: ================================================================
cls
echo.
echo  [STEP 7/9]  Verify firewall rule for port 5986
echo  ----------------------------------------------------------
echo  Calling PowerShell to check...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -eq 5986 } | Get-NetFirewallRule | ^
     Format-Table DisplayName, Enabled, Direction, Action, Profile -AutoSize"
echo.
pause

:: ================================================================
::  STEP 8 - Test PSSession (interactive)
:: ================================================================
cls
echo.
echo  [STEP 8/9]  Test HTTPS connection with Enter-PSSession
echo  ----------------------------------------------------------
echo  The hostname MUST exactly match the Common Name (CN) in the cert.
echo.
set /p TEST_HOST=  Enter the fully-qualified hostname to test (e.g. e4-arch1.ndc.nasa.gov):
echo.
echo  Opening Enter-PSSession -ComputerName !TEST_HOST! -UseSSL
echo  Type "exit" inside the session to return here.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "Enter-PSSession -ComputerName '!TEST_HOST!' -UseSSL"
echo.
echo  Session closed.
pause

:: ================================================================
::  STEP 9 - Remove unused HTTP 5985 listener
:: ================================================================
cls
echo.
echo  [STEP 9/9]  Remove HTTP listener on port 5985
echo  ----------------------------------------------------------
echo.
set /p CONFIRM_DEL=  Remove the HTTP listener? (Y/N):
if /i "!CONFIRM_DEL!"=="Y" (
    echo.
    echo  winrm delete winrm/config/Listener?Address=*+Transport=HTTP
    echo.
    winrm delete winrm/config/Listener?Address=*+Transport=HTTP
    if !errorlevel! equ 0 (
        echo.
        echo  [OK] HTTP listener removed.
    ) else (
        echo.
        echo  [NOTE] HTTP listener may not have existed - that is fine.
    )
) else (
    echo  Skipped - HTTP listener left in place.
)
echo.

:: ================================================================
::  DONE
:: ================================================================
echo.
echo  ==============================================================
echo   WinRM HTTPS setup complete.
echo   Run the following to confirm final listener state:
echo     winrm enumerate winrm/config/listener
echo  ==============================================================
echo.
pause
endlocal
