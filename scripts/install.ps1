$ErrorActionPreference = 'Stop'

$Repo = if ($env:PR_REVIEW_AGENT_REPO) { $env:PR_REVIEW_AGENT_REPO } else { 'tiagovicente2/pr-review-agent' }
$InstallDir = if ($env:PR_REVIEW_AGENT_INSTALL_DIR) { $env:PR_REVIEW_AGENT_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'PR Review Agent' }
$Artifact = 'pr-review-agent-windows-x64.zip'
$Url = "https://github.com/$Repo/releases/latest/download/$Artifact"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
$ZipPath = Join-Path $TempDir $Artifact

function Log($Message) { Write-Host "[pr-review-agent] $Message" }

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
try {
  Log "downloading $Url"
  Invoke-WebRequest -Uri $Url -OutFile $ZipPath

  if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force

  $Nested = Get-ChildItem -Path $InstallDir -Directory | Select-Object -First 1
  if ($Nested -and (Test-Path (Join-Path $Nested.FullName 'bin'))) {
    Get-ChildItem -Path $Nested.FullName -Force | Move-Item -Destination $InstallDir -Force
    Remove-Item -Recurse -Force $Nested.FullName
  }

  $Launcher = Get-ChildItem -Path $InstallDir -Recurse -File -Filter 'launcher.exe' | Select-Object -First 1
  if (-not $Launcher) { throw 'launcher.exe not found in release artifact' }

  $StartMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
  $ShortcutPath = Join-Path $StartMenu 'PR Review Agent.lnk'
  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $Launcher.FullName
  $Shortcut.WorkingDirectory = Split-Path $Launcher.FullName
  $Shortcut.Description = 'AI-assisted GitHub pull request review drafts'
  $Shortcut.Save()

  Log "installed to $InstallDir"
  Log "created Start Menu shortcut: $ShortcutPath"
  Log 'done'
}
finally {
  if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
}
