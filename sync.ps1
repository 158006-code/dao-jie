# ════════════════════════════════════
# 道劫：同步+备份脚本
# 用法：在 d:\project 目录运行 .\sync.ps1
# ════════════════════════════════════
param(
  [switch]$NoBackup  # 跳过备份，仅同步
)

$src = "d:\project"
$dst = "D:\AIgame\daojie"
$files = @("config.js", "engine.js", "entities.js", "game.js", "skills.js", "DaoJie_v11.html")

# 1. 备份（默认开启）
if (-not $NoBackup) {
  $v = (Get-ChildItem "$dst\backup" -Directory | Where-Object { $_.Name -match '^v\d+$' } | Measure-Object).Count + 1
  $backupDir = "$dst\backup\v$v"
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  foreach ($f in $files) {
    if (Test-Path "$src\$f") { Copy-Item -Path "$src\$f" -Destination "$backupDir\$f" -Force }
  }
  Write-Host "✅ 备份完成 → backup\v$v\" -ForegroundColor Green
}

# 2. 同步
foreach ($f in $files) {
  if (Test-Path "$src\$f") { Copy-Item -Path "$src\$f" -Destination "$dst\$f" -Force }
}
Write-Host "✅ 同步完成 → $dst\" -ForegroundColor Green

# 3. 提示 Git 状态
Write-Host "`n💡 别忘了：git add + commit + push" -ForegroundColor Yellow
