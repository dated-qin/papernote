// Package db 提供 PostgreSQL 数据库连接（GORM）
package db

import (
	"log"
	"time"

	"github.com/papernote/backend/pkg/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect 建立 PostgreSQL 连接并配置连接池
func Connect(cfg *config.Config) *gorm.DB {
	db, err := gorm.Open(postgres.Open(cfg.DBDSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn), // 生产环境 WARN，开发可改为 Info
	})
	if err != nil {
		log.Fatalf("failed to connect to PostgreSQL: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("failed to get underlying sql.DB: %v", err)
	}

	// 连接池配置
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// 启动时验证
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("failed to ping PostgreSQL: %v", err)
	}

	ensureMessageMentionSchema(db)

	log.Println("PostgreSQL connected successfully")
	return db
}

func ensureMessageMentionSchema(db *gorm.DB) {
	var exists bool
	if err := db.Raw("SELECT to_regclass('public.messages') IS NOT NULL").Scan(&exists).Error; err != nil {
		log.Fatalf("failed to inspect messages table: %v", err)
	}
	if !exists {
		return
	}

	if err := db.Exec(`
		ALTER TABLE messages
		ADD COLUMN IF NOT EXISTS mention_ids JSONB NOT NULL DEFAULT '[]'::jsonb
	`).Error; err != nil {
		log.Fatalf("failed to ensure messages.mention_ids column: %v", err)
	}
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_messages_mentions
		ON messages USING gin(mention_ids)
	`).Error; err != nil {
		log.Fatalf("failed to ensure messages mention index: %v", err)
	}
}
