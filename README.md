# MATLAB Automated Deployment

Automated tooling for silent MATLAB installation across Windows workstations at NASA LaRC. Covers three workflows:

1. **Sync** — crawl the LaRC SharePoint MATLAB page and auto-populate the software share with versioned installer configs
2. **Deploy (local)** — silently install MATLAB on the current machine from the share
3. **Deploy (remote push)** — push the install to one or more remote machines over WinRM without needing share permissions on the clients

---

## Repository Contents

| File | Purpose |
|---|---|
| `matlab_sync.py` | Python crawler — reads the SharePoint MATLAB page and scaffolds the share |
| `requirements.txt` | Python dependencies for the crawler |
| `matlab-config.ps1` | **All editable settings** — release, share path, license server, etc. |
| `Deploy-MATLAB.ps1` | Entry-point launcher — reads config and calls the installer |
| `Install-MATLAB.ps1` | Install engine — robocopy + silent setup.exe + env var |
| `installer_input.txt` | Template showing all available MATLAB installer options |

---

## Architecture Overview

```
NASA LaRC SharePoint                  \\e4-arch2\L$\Software\Matlab\
  MATLAB.aspx                  ──►    R2022b\
  (versions + FIKs)                     setup.exe
        │                               installer_input.txt
        │  matlab_sync.py               NASA_LaRC_Consolidated_Server.lic
        │  (weekly scheduled job)     R2024a\
        └──────────────────────►        setup.exe
                                        installer_input.txt
                                        NASA_LaRC_Consolidated_Server.lic

        Deploy-MATLAB.ps1
        (run as Admin on server)
              │
              │  1. robocopy share → local cache
              │  2. run setup.exe silently
              │  3. set MLM_LICENSE_FILE env var
              ▼
        Target workstation(s)
        C:\Program Files\MATLAB\R2024a\
```

---

## Part 1 — Share Sync (Python Crawler)

### What it does

`matlab_sync.py` opens the NASA LaRC SharePoint MATLAB page using Chrome, extracts each MATLAB release version and its File Installation Key (FIK), then creates or updates the corresponding directory on the software share with a ready-to-use `installer_input.txt`.

### Prerequisites

- Python 3.10+
- Google Chrome installed
- Machine must be on the NASA network (or VPN) and domain-joined for AD SSO
- Write access to `\\e4-arch2\L$\Software\Matlab\`

### Installation

```bash
pip install -r requirements.txt
playwright install chromium
```

### First-Time Selector Setup

The script uses CSS selectors to locate release headings and FIK values on the SharePoint page. These must be verified against the live page before the script will work reliably.

1. Run in headed mode:
   ```bash
   python matlab_sync.py --headed
   ```

2. When the browser opens the MATLAB page, press `F12` to open DevTools.

3. Use the element picker to identify:
   - The element containing release headings (e.g. `"MATLAB R2024a"`)
   - The element containing the FIK string (e.g. `"12345-67890-..."`)

4. Update these constants near the top of `matlab_sync.py`:
   ```python
   RELEASE_HEADING_SEL = "h2"     # element containing "MATLAB R2024a"
   FIK_SEL             = "code"   # element containing the FIK string
   ```

5. Re-run headed to confirm output looks correct, then switch to headless for automation.

### Usage

```bash
# Preview what would be created without touching the share
python matlab_sync.py --dry-run

# Normal run (headless — AD SSO handled automatically by Chrome)
python matlab_sync.py

# Headed mode (shows browser window — useful for debugging)
python matlab_sync.py --headed

# Increase page load timeout for slow connections (seconds)
python matlab_sync.py --timeout 120
```

### What gets created on the share

For each release found the script creates:

```
\\e4-arch2\L$\Software\Matlab\
  R2024a\
    installer_input.txt    ← generated with correct FIK and release tag
```

> **Note:** The script creates the directory and `installer_input.txt` only.
> You still need to manually place `setup.exe` and the `.lic` file in each
> versioned directory — these cannot be downloaded automatically due to
> MathWorks licensing restrictions.

If `installer_input.txt` already exists it is backed up as
`installer_input.YYYYMMDDHHMMSS.bak` before overwriting.

### Scheduling (Windows Task Scheduler)

Set up a weekly scheduled task to keep the share current:

1. Open Task Scheduler → **Create Basic Task**
2. **Trigger:** Weekly (e.g. Monday 06:00)
3. **Action:** Start a program
   - Program: `python`
   - Arguments: `C:\path\to\matlab_sync.py`
   - Start in: `C:\path\to\`
4. **General:** Check *Run whether user is logged on or not* and *Run with highest privileges*
5. Use a service account that has write access to the share

Chrome reuses the cached AD session stored in `%USERPROFILE%\.matlab_sync_chrome`
so it will not prompt for credentials on scheduled runs.

---

## Part 2 — Silent Install

### Prerequisites on the deploying machine

- Windows, PowerShell 5.1+
- Must be run **as Administrator**
- Network access to `\\e4-arch2\L$\Software\Matlab\`
- For remote push: WinRM enabled on target machines (see below)

### Configuration

**All settings live in `matlab-config.ps1`.** This is the only file that ever needs to be edited.

```powershell
# ── Change this to target a different release ──────────────────────────
$MatlabRelease      = 'R2024a'        # must match a directory on the share

# ── Share root (do not change unless the server moves) ─────────────────
$ShareRoot          = '\\e4-arch2\L$\Software\Matlab'
$SharePath          = "$ShareRoot\$MatlabRelease"     # constructed automatically

# ── Local robocopy cache ────────────────────────────────────────────────
$LocalCacheRoot     = 'C:\MatlabInstallCache'
$LocalCacheDir      = "$LocalCacheRoot\$MatlabRelease"  # constructed automatically
$RobocopyThreads    = 16        # parallel threads (1-128); 16 is good for LAN
$SkipCopy           = $false    # set $true to skip robocopy if already cached

# ── License ────────────────────────────────────────────────────────────
$LicFileName        = 'NASA_LaRC_Consolidated_Server.lic'
$LicenseServer      = '27000@licserver.example.com'   # FlexLM server string

# ── Logging ────────────────────────────────────────────────────────────
$LogFile            = 'C:\mathworks_install.log'
```

To deploy a different release, change **only** `$MatlabRelease` and run.

### Local Install

Run from an elevated (Administrator) PowerShell prompt:

```powershell
.\Deploy-MATLAB.ps1
```

**What happens step by step:**

1. Reads `matlab-config.ps1`
2. Verifies the versioned package directory is reachable on the share
3. **Robocopy** mirrors the package to `C:\MatlabInstallCache\R2024a\` using `/MIR`
   (only changed files are copied on re-runs — safe to run repeatedly)
4. Runs `setup.exe -inputFile installer_input.txt` silently from the local cache
5. Sets `MLM_LICENSE_FILE = 27000@licserver.example.com` as a **machine-scope**
   environment variable so all named users resolve the license server automatically
6. Prints a summary with destination path, license value, and log location

Full install output is written to `C:\mathworks_install.log`.

### Remote Push (Deploy to Multiple Machines)

Remote mode copies the scripts to each target via its admin share (`\\target\C$\`)
and executes them over WinRM — clients do not need share permissions on `e4-arch2`.

```powershell
# Push to a single machine
.\Deploy-MATLAB.ps1 -ComputerName PC001

# Push to multiple machines (5 simultaneous by default)
.\Deploy-MATLAB.ps1 -ComputerName PC001, PC002, PC003, PC004

# Push to a list from a text file, 10 at a time
$targets = Get-Content .\targets.txt
.\Deploy-MATLAB.ps1 -ComputerName $targets -MaxParallel 10

# Provide credentials explicitly (will be prompted if omitted)
.\Deploy-MATLAB.ps1 -ComputerName PC001 -Credential (Get-Credential)
```

**Example output:**

```
[06:12:01] Starting deploy on PC001
[06:12:01] Starting deploy on PC002
[06:12:01] Starting deploy on PC003

  [OK]   PC001
  [OK]   PC002
  [FAIL] PC003

── Summary ──────────────────────────────────────────────
  Succeeded : 2  (PC001, PC002)
  Failed    : 1  (PC003)
```

#### Enabling WinRM on Target Machines

Run once on each target (or deploy via Group Policy):

```powershell
Enable-PSRemoting -Force
```

Your account must have local administrator rights on the target machines.
Windows Firewall must allow inbound TCP port **5985** (WinRM HTTP).

---

## Per-Release Share Directory Layout

Each release directory on the share must contain these three files
before a deployment can run:

```
\\e4-arch2\L$\Software\Matlab\
  R2024a\
    setup.exe                              ← MATLAB installer (extracted from MathWorks ISO)
    installer_input.txt                    ← generated by matlab_sync.py
    NASA_LaRC_Consolidated_Server.lic      ← network license file from MathWorks
```

`installer_input.txt` is generated automatically by `matlab_sync.py`.
`setup.exe` and the `.lic` file must be placed manually.

---

## Environment Variable Set After Install

After a successful install every user on the machine will have:

```
MLM_LICENSE_FILE = 27000@licserver.example.com
```

set at the **machine (System)** scope. Users must **sign out and back in**
(or reboot) after the install for the variable to appear in new sessions.
MATLAB reads this on startup to locate the FlexLM license server — no
additional configuration inside the MATLAB installation directory is needed.

---

## Troubleshooting

| Symptom | What to check |
|---|---|
| Robocopy exits with code 8+ | Network connectivity to `\\e4-arch2`; review `C:\mathworks_install.log` |
| `setup.exe` exits non-zero | Review `C:\mathworks_install.log` for MathWorks error codes |
| MATLAB opens but says "No license found" | Confirm `MLM_LICENSE_FILE` is set (`sysdm.cpl` → Advanced → Environment Variables); sign out/in after install; verify license server is reachable on port 27000 |
| Crawler finds no releases | Run `--headed`, open DevTools (`F12`), verify `RELEASE_HEADING_SEL` matches the page elements |
| SharePoint SSO fails in headless mode | Run `--headed` once to prime the Chrome profile cache, then switch back to headless |
| WinRM connection refused | Run `Enable-PSRemoting -Force` on target; verify port 5985 is open in Windows Firewall |
| Scripts copied but remote install fails | Check the target's `C:\mathworks_install.log` via `\\target\C$\mathworks_install.log` |

---

## Quick Reference

```powershell
# Deploy a specific release locally
# 1. Edit matlab-config.ps1  →  $MatlabRelease = 'R2024a'
.\Deploy-MATLAB.ps1

# Deploy to a list of machines
.\Deploy-MATLAB.ps1 -ComputerName (Get-Content .\targets.txt) -MaxParallel 10

# Sync share from SharePoint (always dry-run first)
python matlab_sync.py --dry-run
python matlab_sync.py
```
