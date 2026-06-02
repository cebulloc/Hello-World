@echo off
setlocal EnableDelayedExpansion
title WinRM HTTPS Setup
color 0A

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

echo.
echo  ==============================================================
echo   WinRM HTTPS Configuration  -  Elevated CMD
echo  ==============================================================
echo.
echo  Each step will pause so you can review output before moving on.
echo.
pause

:: ================================================================
::  STEP 1 - Remove existing listeners, restart service
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 1/9]  Clear existing WinRM listeners and restart service
echo  ============================================================
echo.

echo  Ensuring WinRM service is running before issuing commands...
net start winrm 2>nul
echo.

echo  Removing HTTP listener (OK if not found)...
call winrm delete winrm/config/Listener?Address=*+Transport=HTTP 2>nul
echo  Done.

echo  Removing HTTPS listener (OK if not found)...
call winrm delete winrm/config/Listener?Address=*+Transport=HTTPS 2>nul
echo  Done.
echo.

echo  Restarting WinRM service to apply clean state...
net stop winrm
net start winrm
echo.

echo  ---- Step 1 complete. Press any key to continue. ----
pause >nul

:: ================================================================
::  STEP 2 - Check current settings
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 2/9]  Check current WinRM configuration
echo  ============================================================
echo.
call winrm get winrm/config
echo.
echo  ---- Step 2 complete. Press any key to continue. ----
pause >nul

:: ================================================================
::  STEP 3 - Quick config for HTTPS
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 3/9]  Run quickconfig for HTTPS (auto-answer Y)
echo  ============================================================
echo  NOTE: A valid certificate must already exist on this machine.
echo        The cert CN must match the hostname used to connect.
echo.
echo y | call winrm quickconfig -transport:https
echo.
echo  ---- Step 3 complete. Press any key to continue. ----
pause >nul

:: ================================================================
::  STEP 4 - Confirm listeners
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 4/9]  Confirm WinRM listeners
echo  ============================================================
echo.
call winrm enumerate winrm/config/listener
echo.
echo  You should see Transport=HTTPS on Port=5986 above.
echo.
echo  ---- Step 4 complete. Press any key to continue. ----
pause >nul

:: ================================================================
::  STEP 5 - Confirm certificate thumbprint
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 5/9]  Confirm certificate thumbprint
echo  ============================================================
echo.
call winrm get http://schemas.microsoft.com/wbem/wsman/1/config
echo.
echo  Look for CertificateThumbprint - it should NOT be empty.
echo.
echo  ---- Step 5 complete. Press any key to continue. ----
pause >nul

:: ================================================================
::  STEP 6 - Create firewall rule for 5986
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 6/9]  Create inbound firewall rule for port 5986
echo  ============================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "New-NetFirewallRule -DisplayName '5986 WinRM Listener HTTPS' -Direction Inbound -LocalPort 5986 -Protocol TCP -Action Allow -Profile Domain,Private,Public -PolicyStore PersistentStore -ErrorAction SilentlyContinue | Out-Null; Write-Host '  Firewall rule created (or already existed).'"
echo.
echo  ---- Step 6 complete. Press any key to continue. ----
pause >nul

:: ================================================================
::  STEP 7 - Verify firewall rule
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 7/9]  Verify firewall rule exists for port 5986
echo  ============================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -eq 5986 } | Get-NetFirewallRule | Format-Table DisplayName, Enabled, Direction, Action, Profile -AutoSize"
echo.
echo  ---- Step 7 complete. Press any key to continue. ----
pause >nul

:: ================================================================
::  STEP 8 - Test PSSession
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 8/9]  Test HTTPS connection with Enter-PSSession
echo  ============================================================
echo  The hostname MUST exactly match the Common Name (CN) in the cert.
echo.
set /p TEST_HOST=  Enter fully-qualified hostname to test:
echo.
echo  Connecting to !TEST_HOST! - type "exit" to return here...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Enter-PSSession -ComputerName '!TEST_HOST!' -UseSSL"
echo.
echo  ---- Step 8 complete. Press any key to continue. ----
pause >nul

:: ================================================================
::  STEP 9 - Remove HTTP 5985 listener
:: ================================================================
echo.
echo  ============================================================
echo  [STEP 9/9]  Remove unused HTTP listener on port 5985
echo  ============================================================
echo.
set /p CONFIRM_DEL=  Remove HTTP listener now? (Y/N):
if /i "!CONFIRM_DEL!"=="Y" (
    echo.
    call winrm delete winrm/config/Listener?Address=*+Transport=HTTP
    if !errorlevel! equ 0 (
        echo  [OK] HTTP listener removed.
    ) else (
        echo  [NOTE] HTTP listener was not found - nothing to remove.
    )
) else (
    echo  Skipped.
)

:: ================================================================
::  DONE
:: ================================================================
echo.
echo  ==============================================================
echo   All 9 steps complete.
echo   Final listener check:
echo  ==============================================================
echo.
call winrm enumerate winrm/config/listener
echo.
pause
endlocal
