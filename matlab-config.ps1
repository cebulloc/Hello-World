# ─────────────────────────────────────────────────────────────────────────────
#  MATLAB Silent Install — Configuration
#
#  Edit values in this file only. Do not modify Install-MATLAB.ps1 unless
#  you need to change install logic.
#
#  To target a different release, change $MatlabRelease — everything else
#  (share path, local cache path) derives from it automatically.
# ─────────────────────────────────────────────────────────────────────────────

# ── Release ───────────────────────────────────────────────────────────────────
# Package for this release must exist at  \\<server>\matlab\<release>\
$MatlabRelease      = 'R2022b'          # e.g. R2022b, R2023a, R2024a

# ── Share (source) ────────────────────────────────────────────────────────────
# Root UNC path to the server where all versioned packages are staged.
# Each release lives in its own subdirectory:
#   \\<ShareRoot>\R2022b\
#   \\<ShareRoot>\R2024a\
$ShareRoot          = '\\fileserver\matlab'
$SharePath          = "$ShareRoot\$MatlabRelease"   # constructed automatically

# ── Local cache (robocopy destination) ────────────────────────────────────────
# The package is mirrored here before install so setup.exe runs locally.
# Re-runs skip unchanged files (robocopy /MIR only copies deltas).
$LocalCacheRoot     = 'C:\MatlabInstallCache'
$LocalCacheDir      = "$LocalCacheRoot\$MatlabRelease"  # constructed automatically

# Number of parallel robocopy threads (1-128).  16 is a good default for LAN.
$RobocopyThreads    = 16

# Set to $true to skip robocopy if the package is already fully cached.
$SkipCopy           = $false

# ── License ───────────────────────────────────────────────────────────────────
$LicFileName        = 'NASA_LaRC_Consolidated_Server.lic'

# FlexLM server string written into the MLM_LICENSE_FILE machine env var.
# Format: <port>@<hostname>
# Set to $null to use the local .lic file path instead.
$LicenseServer      = '27000@licserver.example.com'

# ── Logging ───────────────────────────────────────────────────────────────────
$LogFile            = 'C:\mathworks_install.log'
