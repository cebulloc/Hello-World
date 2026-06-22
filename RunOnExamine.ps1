param(
    [string]$ExamineServer = "EXAMINE-SERVER-NAME",
    [string]$ScriptPath = "C:\Users\awartenb\desktop\OldFile1.py",
    [string]$CondaEnv = "flight",
    [string]$MiniforgeDir = "C:\Users\awartenb\AppData\Local\miniforge3"
)

$cred = Get-Credential -Message "Enter your examine credentials"

$session = New-PSSession -ComputerName $ExamineServer -Credential $cred

Invoke-Command -Session $session -ArgumentList $ScriptPath, $CondaEnv, $MiniforgeDir -ScriptBlock {
    param($ScriptPath, $CondaEnv, $MiniforgeDir)

    $pythonExe = Join-Path $MiniforgeDir "envs\$CondaEnv\python.exe"

    if (-not (Test-Path $pythonExe)) {
        Write-Error "Python not found at $pythonExe"
        return
    }
    if (-not (Test-Path $ScriptPath)) {
        Write-Error "Script not found at $ScriptPath"
        return
    }

    Write-Output "Starting FlightStream script on $(hostname) at $(Get-Date)"
    Write-Output "Python: $pythonExe"
    Write-Output "Script: $ScriptPath"

    $process = Start-Process -FilePath $pythonExe -ArgumentList $ScriptPath -NoNewWindow -PassThru -RedirectStandardOutput "C:\temp\flightstream_output.log" -RedirectStandardError "C:\temp\flightstream_error.log"

    Write-Output "Process started with PID: $($process.Id)"
    Write-Output "Output log: C:\temp\flightstream_output.log"
    Write-Output "Error log: C:\temp\flightstream_error.log"
    Write-Output "Script is running in the background. You can disconnect safely."
}

Remove-PSSession $session
