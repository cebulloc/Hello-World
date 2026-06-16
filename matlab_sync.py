"""
matlab_sync.py
──────────────
Crawls the NASA LaRC SharePoint MATLAB page, extracts version info and
File Installation Keys, then scaffolds the versioned directory structure
on the software share and writes installer_input.txt for each release.

Requirements:
    pip install playwright
    playwright install chromium

Usage:
    # First run — headed so you can verify selectors
    python matlab_sync.py --headed

    # Normal / scheduled run
    python matlab_sync.py

    # Dry run (no filesystem changes)
    python matlab_sync.py --dry-run
"""

import argparse
import re
import shutil
import sys
from pathlib import Path, PureWindowsPath
from datetime import datetime

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

# ── Configuration ─────────────────────────────────────────────────────────────

SHAREPOINT_URL = "https://nasa.sharepoint.com/sites/larc-software/SitePages/MATLAB.aspx"

# UNC path to the software share (as seen from this machine)
SHARE_ROOT = Path(r"\\e4-arch2\L$\Software\Matlab")

# Template values used when generating installer_input.txt for each release.
# ${RELEASE} and ${FIK} are substituted at runtime.
INSTALLER_INPUT_TEMPLATE = """\
destinationFolder=C:\\Program Files\\MATLAB\\${RELEASE}

fileInstallationKey=${FIK}

agreeToLicense=yes

mode=silent

outputFile=C:\\mathworks_install.log

licensePath=C:\\MatlabSilentInstall\\NASA_LaRC_Consolidated_Server.lic

setFileAssoc=true
desktopShortcut=true
startMenuShortcut=true

# enableLNU=yes
"""

# ── Page selectors ─────────────────────────────────────────────────────────────
# Run with --headed first, open DevTools, and verify these match the live page.
# Each selector targets the repeating block that contains one MATLAB release.
#
# Strategy: find all release headings, then for each heading find the
# sibling/child element that holds the FIK.

# CSS selector that matches every release heading element, e.g. "MATLAB R2024a"
RELEASE_HEADING_SEL = "h2, h3, h4"          # TODO: tighten after inspecting page

# Within the heading's parent container, the element that holds the FIK string
FIK_SEL            = "code, pre, p, td"     # TODO: tighten after inspecting page

# Regex to extract the release tag from heading text (e.g. R2024a, R2023b)
RELEASE_RE  = re.compile(r'\b(R\d{4}[ab])\b', re.IGNORECASE)

# Regex to extract a File Installation Key (5-digit groups separated by dashes)
FIK_RE      = re.compile(r'\b(\d{5}(?:-\d{5}){4,})\b')

# ── Helpers ───────────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    print(f"[{datetime.now():%H:%M:%S}] {msg}")


def parse_releases(page) -> dict[str, str]:
    """
    Returns {release: fik} dict, e.g. {'R2024a': '12345-67890-...'}
    Walks every heading element, extracts the release tag, then searches
    nearby text nodes for the FIK pattern.
    """
    releases: dict[str, str] = {}

    headings = page.query_selector_all(RELEASE_HEADING_SEL)
    log(f"Found {len(headings)} heading element(s) matching '{RELEASE_HEADING_SEL}'")

    for heading in headings:
        text = heading.inner_text().strip()
        m = RELEASE_RE.search(text)
        if not m:
            continue

        release = m.group(1).upper()   # normalise to e.g. R2024A -> R2024a
        release = release[0] + release[1:5] + release[5].lower()

        # Search the parent section for a FIK
        fik = None
        parent = heading.evaluate_handle("el => el.closest('section, div, article, td, tr') || el.parentElement")
        if parent:
            parent_text = parent.evaluate("el => el.innerText")
            fm = FIK_RE.search(parent_text)
            if fm:
                fik = fm.group(1)

        if fik:
            log(f"  Found {release} → FIK {fik[:11]}…")
            releases[release] = fik
        else:
            log(f"  Found {release} but could not locate FIK — check FIK_SEL selector")

    return releases


def scaffold(release: str, fik: str, share_root: Path, dry_run: bool) -> None:
    """Creates the versioned directory and writes installer_input.txt."""
    dest = share_root / release
    input_file = dest / "installer_input.txt"
    content = (INSTALLER_INPUT_TEMPLATE
               .replace("${RELEASE}", release)
               .replace("${FIK}", fik))

    if dry_run:
        log(f"  [DRY-RUN] Would create {dest}")
        log(f"  [DRY-RUN] Would write  {input_file}")
        return

    dest.mkdir(parents=True, exist_ok=True)

    # Back up existing file before overwriting
    if input_file.exists():
        backup = input_file.with_suffix(f".{datetime.now():%Y%m%d%H%M%S}.bak")
        shutil.copy2(input_file, backup)
        log(f"  Backed up existing installer_input.txt → {backup.name}")

    input_file.write_text(content, encoding="utf-8")
    log(f"  Wrote {input_file}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Sync MATLAB releases from LaRC SharePoint to software share")
    ap.add_argument("--headed",  action="store_true", help="Show browser window (use to verify selectors)")
    ap.add_argument("--dry-run", action="store_true", help="Parse and print without writing to the share")
    ap.add_argument("--timeout", type=int, default=60, help="Page load timeout in seconds (default 60)")
    args = ap.parse_args()

    if args.dry_run:
        log("DRY-RUN mode — no files will be written")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel="chrome",       # use installed Chrome (picks up AD profile / SSO)
            headless=not args.headed
        )

        # Use a persistent context so cached AD tokens survive between runs.
        # Change user_data_dir to any writable path on your server.
        context = browser.new_context(
            user_data_dir=str(Path.home() / ".matlab_sync_chrome"),
        ) if not args.headed else browser.new_context()

        page = (context if hasattr(context, "new_page") else browser).new_page() \
               if not hasattr(context, "new_page") else context.new_page()

        log(f"Navigating to {SHAREPOINT_URL}")
        try:
            page.goto(SHAREPOINT_URL, timeout=args.timeout * 1000, wait_until="networkidle")
        except PWTimeout:
            log("ERROR: Page did not finish loading — increase --timeout or check network access")
            sys.exit(1)

        # SharePoint may redirect through an SSO flow; wait for the final page title
        try:
            page.wait_for_selector(RELEASE_HEADING_SEL, timeout=30_000)
        except PWTimeout:
            log("ERROR: Could not find release headings — you may need to log in manually "
                "or adjust RELEASE_HEADING_SEL")
            if args.headed:
                input("Press Enter after logging in and the page has loaded...")
                page.wait_for_selector(RELEASE_HEADING_SEL, timeout=30_000)
            else:
                sys.exit(1)

        releases = parse_releases(page)
        browser.close()

    if not releases:
        log("No releases found — check the selector constants at the top of this script")
        sys.exit(1)

    log(f"\nFound {len(releases)} release(s): {', '.join(sorted(releases))}")

    if not args.dry_run and not SHARE_ROOT.exists():
        log(f"ERROR: Share root not reachable: {SHARE_ROOT}")
        sys.exit(1)

    for release, fik in sorted(releases.items()):
        log(f"\nScaffolding {release}")
        scaffold(release, fik, SHARE_ROOT, args.dry_run)

    log("\nDone.")


if __name__ == "__main__":
    main()
