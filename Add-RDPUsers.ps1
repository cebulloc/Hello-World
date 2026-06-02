#Requires -Version 5.1
<#
.SYNOPSIS
    Interactively add users to the Remote Desktop Users group on remote servers.
.DESCRIPTION
    Prompts for a comma-separated list of servers and users, checks membership,
    and adds any users not already in the group. Requires WinRM (PS Remoting)
    to be enabled on the target servers (standard on Windows Server).

    Run as a domain admin or account with local admin rights on the target servers.
#>

# ================================================================
#  HELPERS
# ================================================================
function Write-Banner {
    Write-Host ''
    Write-Host '  =================================================='
    Write-Host '   Add Users to Remote Desktop Users Group'
    Write-Host '  =================================================='
    Write-Host ''
}

function Write-Color {
    param([string]$text, [string]$color = 'White')
    Write-Host $text -ForegroundColor $color
}

# ================================================================
#  INPUT
# ================================================================
Write-Banner

$serversRaw = Read-Host '  Servers  (comma-separated)'
$usersRaw   = Read-Host '  Users    (comma-separated, bare usernames - ndc\ prefix added automatically)'

$servers = $serversRaw -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
$users   = $usersRaw   -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } |
           ForEach-Object { if ($_ -match '[\\/]') { $_ } else { "ndc\$_" } }

if ($servers.Count -eq 0) { Write-Color '  [ERROR] No servers entered.' Red; Read-Host; exit 1 }
if ($users.Count   -eq 0) { Write-Color '  [ERROR] No users entered.'   Red; Read-Host; exit 1 }

Write-Host ''
Write-Color "  Servers : $($servers -join ', ')" Cyan
Write-Color "  Users   : $($users   -join ', ')" Cyan
Write-Host ''

$GroupName = 'Remote Desktop Users'
$results   = [System.Collections.Generic.List[PSCustomObject]]::new()

# ================================================================
#  PROCESS
# ================================================================
foreach ($server in $servers) {
    Write-Color "  -- $server --" Yellow

    # Test connectivity first
    if (-not (Test-Connection -ComputerName $server -Count 1 -Quiet -ErrorAction SilentlyContinue)) {
        Write-Color "    [UNREACHABLE] Cannot ping $server - skipping." Red
        foreach ($user in $users) {
            $results.Add([PSCustomObject]@{ Server = $server; User = $user; Result = 'UNREACHABLE' })
        }
        continue
    }

    foreach ($user in $users) {
        $display = $user.PadRight(30)
        try {
            $status = Invoke-Command -ComputerName $server -UseSSL -ErrorAction Stop -ScriptBlock {
                param($u, $grp)

                # Normalize: strip domain prefix for bare-name comparison
                $bareName = $u -replace '^.*[\\/]'

                try {
                    $members = Get-LocalGroupMember -Group $grp -ErrorAction Stop
                } catch {
                    return "ERROR_GET: $_"
                }

                # Match on full "DOMAIN\user", "HOST\user", or just "user"
                $already = $members | Where-Object {
                    $_.Name -eq $u -or
                    ($_.Name -split '[\\/]')[-1] -eq $bareName
                }

                if ($already) {
                    return 'ALREADY_MEMBER'
                }

                try {
                    Add-LocalGroupMember -Group $grp -Member $u -ErrorAction Stop
                    return 'ADDED'
                } catch {
                    return "ERROR_ADD: $_"
                }
            } -ArgumentList $user, $GroupName

            switch -Wildcard ($status) {
                'ALREADY_MEMBER' {
                    Write-Color "    $display [ALREADY MEMBER]" DarkGray
                    $results.Add([PSCustomObject]@{ Server = $server; User = $user; Result = 'Already a member' })
                }
                'ADDED' {
                    Write-Color "    $display [ADDED]" Green
                    $results.Add([PSCustomObject]@{ Server = $server; User = $user; Result = 'Added successfully' })
                }
                'ERROR_GET:*' {
                    Write-Color "    $display [ERROR getting members] $($status -replace '^ERROR_GET: ','')" Red
                    $results.Add([PSCustomObject]@{ Server = $server; User = $user; Result = "Error: $status" })
                }
                'ERROR_ADD:*' {
                    Write-Color "    $display [ERROR adding] $($status -replace '^ERROR_ADD: ','')" Red
                    $results.Add([PSCustomObject]@{ Server = $server; User = $user; Result = "Error: $status" })
                }
                default {
                    Write-Color "    $display [UNKNOWN: $status]" Magenta
                    $results.Add([PSCustomObject]@{ Server = $server; User = $user; Result = $status })
                }
            }
        } catch {
            $msg = $_.Exception.Message
            Write-Color "    $display [CONNECT ERROR] $msg" Red
            $results.Add([PSCustomObject]@{ Server = $server; User = $user; Result = "Connect error: $msg" })
        }
    }
    Write-Host ''
}

# ================================================================
#  SUMMARY TABLE
# ================================================================
Write-Host '  =================================================='
Write-Host '   Summary'
Write-Host '  =================================================='
Write-Host ''
$results | Format-Table -AutoSize -Property `
    @{ Label = 'Server'; Expression = { $_.Server } },
    @{ Label = 'User';   Expression = { $_.User   } },
    @{ Label = 'Result'; Expression = {
        switch ($_.Result) {
            'Already a member'   { Write-Output $_ }
            'Added successfully' { Write-Output $_ }
            default              { Write-Output $_ }
        }
    }}

# Counts
$added    = ($results | Where-Object Result -eq 'Added successfully').Count
$existing = ($results | Where-Object Result -eq 'Already a member').Count
$errors   = ($results | Where-Object { $_.Result -notmatch '^(Added|Already)' }).Count

Write-Color "  Added: $added   Already member: $existing   Errors: $errors" Cyan
Write-Host ''
Read-Host '  Press Enter to close'
