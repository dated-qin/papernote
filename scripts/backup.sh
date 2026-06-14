#!/bin/bash
# ============================================
# 纸条 PaperNote — 数据库备份脚本
# 用法: ./scripts/backup.sh
# 建议: crontab 每日凌晨 2 点执行
#   0 2 * * * /app/scripts/backup.sh >> /var/log/papernote-backup.log 2>&1
# ============================================

set -e

BACKUP_DIR="${BACKUP_DIR:-/backup}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
PG_CONTAINER="${PG_CONTAINER:-papernote-pg}"
DB_USER="${DB_USER:-papernote}"
DB_NAME="${DB_NAME:-papernote}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/papernote_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup..."

# 确保备份目录存在
mkdir -p "$BACKUP_DIR"

# PostgreSQL 备份
docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# 清理旧备份
DELETED=$(find "$BACKUP_DIR" -name "papernote_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "[$(date)] Cleaned up $DELETED old backup(s) (older than ${RETENTION_DAYS} days)"

# Redis AOF 备份 (可选)
REDIS_CONTAINER="${REDIS_CONTAINER:-papernote-redis}"
REDIS_BACKUP="${BACKUP_DIR}/redis_dump_${TIMESTAMP}.rdb"
docker cp "$REDIS_CONTAINER:/data/appendonly.aof" "$REDIS_BACKUP" 2>/dev/null || true

echo "[$(date)] Backup complete"
