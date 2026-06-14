#!/bin/bash
# ============================================
# 纸条 PaperNote — 一键部署脚本
# 用法: ./scripts/deploy.sh [prod|staging]
# ============================================

set -e

ENV="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo " 纸条 PaperNote — 部署脚本"
echo " 环境: $ENV"
echo " $(date)"
echo "=========================================="

# ---------- 1. 检查环境变量 ----------
if [ ! -f .env ]; then
    echo "ERROR: .env 文件不存在，请从 .env.example 复制并填写"
    exit 1
fi
source .env

# ---------- 2. 构建前端 ----------
echo ""
echo ">>> [1/4] 构建前端..."
npm ci --silent
npm run build
echo ">>> 前端构建完成"

# ---------- 3. 构建后端镜像 ----------
echo ""
echo ">>> [2/4] 构建后端 Docker 镜像..."
cd backend
docker build -t papernote-backend:latest .
docker tag papernote-backend:latest papernote-backend:previous 2>/dev/null || true
cd ..
echo ">>> 后端镜像构建完成"

# ---------- 4. 启动服务 ----------
echo ""
echo ">>> [3/4] 启动 Docker 服务..."
COMPOSE_FILE="docker/docker-compose.yml"
if [ "$ENV" = "prod" ]; then
    COMPOSE_FILE="docker/docker-compose.prod.yml"
fi

docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" up -d --build
echo ">>> 服务已启动"

# ---------- 5. 等待健康检查 ----------
echo ""
echo ">>> [4/4] 等待服务就绪..."
sleep 3

# 检查 PostgreSQL
for i in $(seq 1 10); do
    if docker exec papernote-pg pg_isready -U "${DB_USER:-papernote}" 2>/dev/null; then
        echo ">>> PostgreSQL 就绪"
        break
    fi
    sleep 2
done

# 执行数据库迁移 (如果有独立迁移工具)
# docker exec papernote-backend ./migrate up 2>/dev/null || true

# 验证
echo ""
echo ">>> 验证部署..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/login || echo "000")
echo ">>> HTTP API 状态码: $HTTP_CODE"

if [ "$HTTP_CODE" != "000" ]; then
    echo ""
    echo "=========================================="
    echo " ✅ 部署完成!"
    echo " API:  http://localhost:8080"
    echo " WS:   ws://localhost:8081/ws"
    echo "=========================================="
else
    echo ""
    echo " ⚠️  后端未响应，请检查日志:"
    echo " docker compose -f $COMPOSE_FILE logs backend"
fi
