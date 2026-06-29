#!/bin/bash
# ============================================
# 纸条 PaperNote — 服务器端部署脚本
# 用法: ./scripts/deploy.sh
# 前提: papernote-deploy.tar.gz 已传到服务器
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

COMPOSE_FILE="docker/docker-compose.prod.yml"
ENV_FILE=".env"

echo "=========================================="
echo " 纸条 PaperNote — 服务器部署"
echo " $(date)"
echo "=========================================="

# ---------- 1. 解压 ----------
echo ""
echo ">>> [1/3] 解压部署包..."
if [ -f papernote-deploy.tar.gz ]; then
    sudo tar -xzf papernote-deploy.tar.gz
    sudo chown -R ubuntu:ubuntu dist/ backend/ docker/ 2>/dev/null || true
    echo ">>> 解压完成"
else
    echo "WARN: papernote-deploy.tar.gz 不存在，跳过解压"
fi

# ---------- 2. 重建容器 ----------
echo ""
echo ">>> [2/3] 重建并启动服务..."
sudo docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
echo ">>> 服务已启动"

# ---------- 3. 验证 ----------
echo ""
echo ">>> [3/3] 验证..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://qingliu.tech/api/auth/login || echo "000")
echo ">>> API: $HTTP_CODE"

if [ "$HTTP_CODE" != "000" ]; then
    echo ""
    echo "=========================================="
    echo " ✅ 部署完成 — https://qingliu.tech"
    echo "=========================================="
else
    echo " ⚠️  后端未响应，检查日志:"
    echo " sudo docker compose -f $COMPOSE_FILE logs backend"
fi
