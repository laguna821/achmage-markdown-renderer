[CmdletBinding()]
param(
  [string]$VaultPath,
  [int]$Port,
  [switch]$NoOpenBrowser,
  [switch]$DryRun,
  [string]$WorkspaceRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-WorkspaceRoot {
  param([string]$ExplicitWorkspaceRoot)

  if (-not [string]::IsNullOrWhiteSpace($ExplicitWorkspaceRoot)) {
    return (Resolve-Path -LiteralPath $ExplicitWorkspaceRoot).Path
  }

  return Split-Path -Parent $PSCommandPath
}

function Resolve-ShellExecutable {
  try {
    $currentProcess = Get-Process -Id $PID -ErrorAction Stop
    if (-not [string]::IsNullOrWhiteSpace($currentProcess.Path) -and (Test-Path -LiteralPath $currentProcess.Path -PathType Leaf)) {
      return $currentProcess.Path
    }
  } catch {
  }

  $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
  if ($null -ne $pwsh) {
    return $pwsh.Source
  }

  $programFilesPwsh = Join-Path ${env:ProgramFiles} 'PowerShell\7\pwsh.exe'
  if (Test-Path -LiteralPath $programFilesPwsh -PathType Leaf) {
    return $programFilesPwsh
  }

  $powershell = Get-Command powershell -ErrorAction SilentlyContinue
  if ($null -ne $powershell) {
    return $powershell.Source
  }

  $windowsPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  if (Test-Path -LiteralPath $windowsPowerShell -PathType Leaf) {
    return $windowsPowerShell
  }

  throw 'PowerShell executable not found. Install PowerShell or PowerShell 7 first.'
}

function Resolve-NpmExecutable {
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($null -ne $npm) {
    return $npm.Source
  }

  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($null -ne $npmCmd) {
    return $npmCmd.Source
  }

  $programFilesNpm = Join-Path ${env:ProgramFiles} 'nodejs\npm.cmd'
  if (Test-Path -LiteralPath $programFilesNpm -PathType Leaf) {
    return $programFilesNpm
  }

  throw 'npm was not found. Install Node.js LTS first.'
}

function Resolve-NodeExecutable {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($null -ne $node) {
    return $node.Source
  }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($null -ne $npm) {
    $siblingNode = Join-Path (Split-Path -Parent $npm.Source) 'node.exe'
    if (Test-Path -LiteralPath $siblingNode -PathType Leaf) {
      return $siblingNode
    }
  }

  $programFilesNode = Join-Path ${env:ProgramFiles} 'nodejs\node.exe'
  if (Test-Path -LiteralPath $programFilesNode -PathType Leaf) {
    return $programFilesNode
  }

  throw 'node was not found. Install Node.js LTS first.'
}

function Resolve-AbsolutePath {
  param(
    [string]$PathValue,
    [string]$BasePath
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $null
  }

  $normalizedPath = $PathValue.Trim().Trim("'`"").Trim([char]0xFEFF)
  if ([string]::IsNullOrWhiteSpace($normalizedPath)) {
    return $null
  }

  if ([System.IO.Path]::IsPathRooted($normalizedPath)) {
    return [System.IO.Path]::GetFullPath($normalizedPath)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $BasePath $normalizedPath))
}

function Get-ContentRootFilePath {
  param([string]$WorkspaceRootPath)
  return Join-Path $WorkspaceRootPath '.doc-workspace-content-dir'
}

function Get-SessionFilePath {
  param([string]$WorkspaceRootPath)
  return Join-Path $WorkspaceRootPath '.viewer-session.json'
}

function Read-SessionState {
  param([string]$SessionFilePath)

  if (-not (Test-Path -LiteralPath $SessionFilePath)) {
    return $null
  }

  $raw = Get-Content -LiteralPath $SessionFilePath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  try {
    return $raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Resolve-ConfiguredVaultPath {
  param(
    [string]$WorkspaceRootPath,
    [string]$ContentRootFilePath,
    [string]$SessionFilePath
  )

  if (Test-Path -LiteralPath $ContentRootFilePath) {
    $configured = (Get-Content -LiteralPath $ContentRootFilePath -Raw -Encoding UTF8).Trim()
    if (-not [string]::IsNullOrWhiteSpace($configured)) {
      return Resolve-AbsolutePath -PathValue $configured -BasePath $WorkspaceRootPath
    }
  }

  $session = Read-SessionState -SessionFilePath $SessionFilePath
  if ($null -ne $session -and -not [string]::IsNullOrWhiteSpace([string]$session.VaultPath)) {
    return Resolve-AbsolutePath -PathValue ([string]$session.VaultPath) -BasePath $WorkspaceRootPath
  }

  return $null
}

function Read-VaultPathInteractive {
  param([string]$DefaultVaultPath)

  $prompt = if ([string]::IsNullOrWhiteSpace($DefaultVaultPath)) {
    'Master vault path'
  } else {
    "Master vault path [$DefaultVaultPath]"
  }

  $inputPath = Read-Host $prompt
  if ([string]::IsNullOrWhiteSpace($inputPath)) {
    if ([string]::IsNullOrWhiteSpace($DefaultVaultPath)) {
      throw 'Vault path is required.'
    }

    return $DefaultVaultPath
  }

  return $inputPath
}

function Test-PortAvailable {
  param([int]$CandidatePort)

  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $CandidatePort)
  try {
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    try {
      $listener.Stop()
    } catch {
    }
  }
}

function Resolve-LaunchPort {
  param([int]$PreferredPort)

  if ($PreferredPort -gt 0) {
    if (-not (Test-PortAvailable -CandidatePort $PreferredPort)) {
      throw "Port $PreferredPort is already in use."
    }

    return $PreferredPort
  }

  foreach ($candidate in 4321..4420) {
    if (Test-PortAvailable -CandidatePort $candidate) {
      return $candidate
    }
  }

  throw 'Could not find an available port between 4321 and 4420.'
}

function Test-DependenciesInstalled {
  param([string]$WorkspaceRootPath)

  $packageJsonPath = Join-Path $WorkspaceRootPath 'package.json'
  if (-not (Test-Path -LiteralPath $packageJsonPath -PathType Leaf)) {
    throw "package.json not found in workspace: $WorkspaceRootPath"
  }

  $astroModulePath = Join-Path $WorkspaceRootPath 'node_modules\astro'
  return Test-Path -LiteralPath $astroModulePath
}

function Stop-PreviousViewerSession {
  param([string]$SessionFilePath)

  $session = Read-SessionState -SessionFilePath $SessionFilePath
  if ($null -eq $session) {
    return $false
  }

  if ($null -eq $session.ProcessId) {
    return $false
  }

  $existing = Get-Process -Id ([int]$session.ProcessId) -ErrorAction SilentlyContinue
  if ($null -eq $existing) {
    return $false
  }

  $expectedStartTime = $null
  if (-not [string]::IsNullOrWhiteSpace([string]$session.ProcessStartTimeUtc)) {
    $expectedStartTime = [DateTime]::Parse([string]$session.ProcessStartTimeUtc).ToUniversalTime()
  }

  if ($null -ne $expectedStartTime) {
    try {
      $actualStartTime = $existing.StartTime.ToUniversalTime()
      if ($actualStartTime -ne $expectedStartTime) {
        return $false
      }
    } catch {
      return $false
    }
  }

  Stop-Process -Id $existing.Id -Force
  return $true
}

function New-LaunchPlan {
  param(
    [string]$WorkspaceRootPath,
    [string]$ResolvedVaultPath,
    [int]$ResolvedPort,
    [string]$ContentRootFilePath,
    [string]$SessionFilePath
  )

  $shellPath = Resolve-ShellExecutable
  $needsInstall = -not (Test-DependenciesInstalled -WorkspaceRootPath $WorkspaceRootPath)
  $npmPath = if ($needsInstall) { Resolve-NpmExecutable } else { $null }
  $nodePath = Resolve-NodeExecutable
  $nodeBinDir = Split-Path -Parent $nodePath
  $windowTitle = "Markdown Viewer ($ResolvedPort)"
  $escapedWorkspaceRoot = $WorkspaceRootPath.Replace("'", "''")
  $escapedVaultPath = $ResolvedVaultPath.Replace("'", "''")
  $escapedWindowTitle = $windowTitle.Replace("'", "''")
  $escapedNodePath = $nodePath.Replace("'", "''")
  $escapedNodeBinDir = $nodeBinDir.Replace("'", "''")

  $launchCommand = @(
    "`$Host.UI.RawUI.WindowTitle = '$escapedWindowTitle'"
    "Set-Location -LiteralPath '$escapedWorkspaceRoot'"
    "`$env:PATH='$escapedNodeBinDir;' + `$env:PATH"
    "`$env:ASTRO_TELEMETRY_DISABLED='1'"
    "`$env:DOC_WORKSPACE_CONTENT_DIR='$escapedVaultPath'"
    "& '$escapedNodePath' '.\scripts\run-with-local-env.mjs' '.\node_modules\astro\astro.js' 'dev' '--host' '127.0.0.1' '--port' '$ResolvedPort'"
  ) -join '; '

  return [pscustomobject]@{
    workspaceRoot   = $WorkspaceRootPath
    vaultPath       = $ResolvedVaultPath
    port            = $ResolvedPort
    url             = "http://127.0.0.1:$ResolvedPort/"
    contentRootFile = $ContentRootFilePath
    sessionFile     = $SessionFilePath
    shellPath       = $shellPath
    npmPath         = $npmPath
    nodePath        = $nodePath
    nodeBinDir      = $nodeBinDir
    needsInstall    = $needsInstall
    windowTitle     = $windowTitle
    launchCommand   = $launchCommand
  }
}

$resolvedWorkspaceRoot = Resolve-WorkspaceRoot -ExplicitWorkspaceRoot $WorkspaceRoot
$contentRootFile = Get-ContentRootFilePath -WorkspaceRootPath $resolvedWorkspaceRoot
$sessionFile = Get-SessionFilePath -WorkspaceRootPath $resolvedWorkspaceRoot
$configuredVaultPath = Resolve-ConfiguredVaultPath -WorkspaceRootPath $resolvedWorkspaceRoot -ContentRootFilePath $contentRootFile -SessionFilePath $sessionFile

$selectedVaultPath = if (-not [string]::IsNullOrWhiteSpace($VaultPath)) {
  $VaultPath
} elseif ($DryRun) {
  $configuredVaultPath
} else {
  Read-VaultPathInteractive -DefaultVaultPath $configuredVaultPath
}

$resolvedVaultPath = Resolve-AbsolutePath -PathValue $selectedVaultPath -BasePath $resolvedWorkspaceRoot
if ([string]::IsNullOrWhiteSpace($resolvedVaultPath)) {
  throw 'Vault path is required.'
}

if (-not (Test-Path -LiteralPath $resolvedVaultPath -PathType Container)) {
  throw "Vault path does not exist or is not a directory: $resolvedVaultPath"
}

$resolvedPort = Resolve-LaunchPort -PreferredPort $Port
$plan = New-LaunchPlan -WorkspaceRootPath $resolvedWorkspaceRoot -ResolvedVaultPath $resolvedVaultPath -ResolvedPort $resolvedPort -ContentRootFilePath $contentRootFile -SessionFilePath $sessionFile

if ($DryRun) {
  $plan | ConvertTo-Json -Depth 5
  exit 0
}

$null = Stop-PreviousViewerSession -SessionFilePath $sessionFile
Set-Content -LiteralPath $contentRootFile -Value $resolvedVaultPath -NoNewline -Encoding UTF8

if ($plan.needsInstall) {
  Write-Host 'First run detected. Installing project dependencies with npm install...' -ForegroundColor Yellow
  $originalPath = $env:PATH
  try {
    $env:PATH = "$($plan.nodeBinDir);$env:PATH"
    & $plan.npmPath install
  } finally {
    $env:PATH = $originalPath
  }
  if ($LASTEXITCODE -ne 0) {
    throw 'npm install failed. Check your internet connection and Node.js installation, then try again.'
  }
}

$proc = Start-Process -FilePath $plan.shellPath -ArgumentList '-NoLogo', '-NoExit', '-Command', $plan.launchCommand -PassThru -WorkingDirectory $resolvedWorkspaceRoot
$sessionPayload = [pscustomobject]@{
  ProcessId           = $proc.Id
  ProcessStartTimeUtc = $proc.StartTime.ToUniversalTime().ToString('O')
  Port                = $plan.port
  Url                 = $plan.url
  VaultPath           = $plan.vaultPath
  WorkspaceRoot       = $plan.workspaceRoot
  LaunchedAtUtc       = [DateTime]::UtcNow.ToString('O')
}
$sessionPayload | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $sessionFile -NoNewline -Encoding UTF8

Write-Host "Started Markdown viewer on $($plan.url)" -ForegroundColor Green
Write-Host "Vault: $($plan.vaultPath)"
Write-Host "Close the dedicated PowerShell window to stop the server."

if (-not $NoOpenBrowser) {
  Start-Sleep -Seconds 2
  Start-Process $plan.url
}
