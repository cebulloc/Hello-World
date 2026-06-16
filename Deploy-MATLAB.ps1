#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Entry-point launcher — loads matlab-config.ps1 then calls Install-MATLAB.ps1.

.DESCRIPTION
    Run this script (as Administrator) to deploy MATLAB.
    All settings are in matlab-config.ps1; no arguments needed here.

.EXAMPLE
    .\Deploy-MATLAB.ps1
#>

$here = $PSScriptRoot

# Load config
. "$here\matlab-config.ps1"

# Call installer with resolved config values
& "$here\Install-MATLAB.ps1" `
    -SharePath     $SharePath `
    -LicFileName   $LicFileName `
    -LicenseServer $LicenseServer `
    -LocalStageDir $LocalStageDir `
    -LogFile       $LogFile
