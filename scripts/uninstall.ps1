$ErrorActionPreference = 'Stop'
$InstallDir = if ($env:PR_REVIEW_AGENT_INSTALL_DIR) { $env:PR_REVIEW_AGENT_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'PR Review Agent' }
$ShortcutPath = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\PR Review Agent.lnk'
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
if (Test-Path $ShortcutPath) { Remove-Item -Force $ShortcutPath }
Write-Host '[pr-review-agent] uninstalled'
