# ─────────────────────────────────────────────────────────────────────────────
#  MATLAB Silent Install — Configuration
#
#  Edit values in this file only. Do not modify Install-MATLAB.ps1 unless
#  you need to change install logic.
#
#  To deploy a different release, update MatlabRelease (and verify the
#  matching subfolder exists on the share).
# ─────────────────────────────────────────────────────────────────────────────

# MATLAB release to install.  The installer package for this release must
# exist at  <ShareRoot>\<MatlabRelease>\  on the staging server.
$MatlabRelease  = 'R2022b'          # e.g. R2022b, R2023a, R2024a

# Root UNC path to the staging server.  A subfolder named $MatlabRelease
# is expected underneath (see SharePath construction below).
$ShareRoot      = '\\fileserver\matlab'

# Full path to the versioned package — constructed automatically.
# Override by setting $SharePath explicitly if your layout differs.
$SharePath      = "$ShareRoot\$MatlabRelease"

# Name of the .lic file inside the package and in LocalStageDir.
$LicFileName    = 'NASA_LaRC_Consolidated_Server.lic'

# FlexLM license server written into MLM_LICENSE_FILE after install.
# Format: <port>@<hostname>   e.g.  27000@licserver.example.com
# Set to $null to use the staged .lic file path as the env var value instead.
$LicenseServer  = '27000@licserver.example.com'

# Local directory used to stage the .lic file before setup.exe runs.
# Must match the licensePath value inside installer_input.txt.
$LocalStageDir  = 'C:\MatlabSilentInstall'

# Full path for the MATLAB installation log.
$LogFile        = 'C:\mathworks_install.log'
