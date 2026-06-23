# Windows-Cert-renewal

**Session Date:** 2026-06-23

## Overview

End-to-end automation of NICA TLS certificate renewal for Windows servers. Replaces the original multi-script manual workflow (Tom Perry, 4/21/2023) with a single interactive PowerShell script.

## Current State

- **`Renew-NICACert.ps1`** — Local-only interactive script (v1). Handles FQDN detection, cert expiry check, INF template customization, CSR generation with auto-elevation, staging to network share, and NAMS launch.
- Supports `-Force` for unattended runs, `-SkipNAMS`, configurable paths via parameters.

## TODO

- [ ] **Phase 2 — Hybrid Local/Remote execution**
  - Push `Renew-NICACert.ps1` to a target server remotely from `e4-arch2`
  - Kick off execution via `Enter-PSSession` / `Invoke-Command`
  - Approach: script on `e4-arch2` that takes a `-ComputerName`, copies the `.ps1` over via SMB, starts a remote PSSession, runs it, and pulls back the `.req`
  - Consideration: `certreq` elevation inside a remote session — may need CredSSP or a scheduled task workaround
  - Consideration: WinRM must be enabled on target servers
- [ ] Add `-AcceptCert` parameter to also handle Step 5 (certreq -accept) after cert is issued
- [ ] Bulk renewal support — loop over a list of servers from a CSV
- [ ] Logging to a transcript file for audit trail

## Workflow (what the script automates)

1. Detect server FQDN
2. Check existing cert expiry in `LocalMachine\My`
3. Create `C:\NASA\_ServerCert` working directory
4. Copy INF template from `\\e4-arch2\e4it\Windows-CSR-Request\`
5. Replace `FQDNPLACEHOLDER` with actual FQDN
6. Run `certreq -new` (elevates to admin if needed)
7. Copy `.req` to staging share `\\e4-arch2\e4it\Windows-CSR-Request\ready-requests\`
8. Open IdMAX PKI Tool (https://nams.nasa.gov/tools/pki) for cert submission

### Post-script manual steps

1. Submit CSR via IdMAX PKI Tool
2. Wait for approval email
3. Download `.cer` from IdMAX
4. Run `certreq -accept <certificate.cer>` on the server

## References

- INF template download: http://hc.nasa.gov/msca/NICA-TLS-INF.zip
- PKI info: https://nasa.sharepoint.com/sites/PKI/SitePages/ICAM.aspx (Section 4.3.5)
- Server Certificate FAQ: https://icam.nasa.gov/documents/11201/2521894/Server+Certificate+Info+and+FAQ.pdf
- IdMAX PKI Tool (where CSR is submitted / cert downloaded): https://nams.nasa.gov/tools/pki
- Original script author: Tom Perry, 4/21/2023, updated 12/01/2023
