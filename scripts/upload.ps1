# ============================================
# 纸条 PaperNote — Windows 本地构建 + 上传脚本
# 用法: .\scripts\upload.ps1
# 前提: 已配置 SSH key (~/.ssh/vsc.pem)
# ============================================

param(
    [string]$Server = "111.229.157.27",
    [string]$User = "ubuntu",
    [string]$KeyFile = "$env:USERPROFILE\.ssh\vsc.pem"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path (Split-Path $MyInvocation.MyCommand.Path) -Parent)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " 纸条 PaperNote — 构建上传" -ForegroundColor Cyan
Write-Host " 服务器: $User@$Server" -ForegroundColor Cyan
Write-Host " $(Get-Date)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ---------- 1. 构建前端 ----------
Write-Host "`n>>> [1/4] 构建前端..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "前端构建失败" }
Write-Host ">>> 前端构建完成" -ForegroundColor Green

# ---------- 2. Go 编译检查 ----------
Write-Host "`n>>> [2/4] Go 编译检查..." -ForegroundColor Yellow
Push-Location backend
$env:GOPROXY = "https://goproxy.cn,direct"
go build ./...
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Go 编译失败" }
Pop-Location
Write-Host ">>> Go 编译通过" -ForegroundColor Green

# ---------- 3. 打包 ----------
Write-Host "`n>>> [3/4] 打包..." -ForegroundColor Yellow
Remove-Item papernote-deploy.tar.gz -ErrorAction SilentlyContinue
tar -czf papernote-deploy.tar.gz dist/ backend/ docker/
Write-Host ">>> 打包完成 ($((Get-Item papernote-deploy.tar.gz).Length / 1MB) MB)" -ForegroundColor Green

# ---------- 4. 上传 ----------
Write-Host "`n>>> [4/4] 上传到服务器..." -ForegroundColor Yellow
scp -i $KeyFile papernote-deploy.tar.gz ${User}@${Server}:/home/ubuntu/papernote/
if ($LASTEXITCODE -ne 0) { throw "上传失败" }
Write-Host ">>> 上传完成" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " ✅ 上传完成，服务器执行:" -ForegroundColor Green
Write-Host "    sudo tar -xzf papernote-deploy.tar.gz" -ForegroundColor White
Write-Host "    sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
