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

	log.Println("PostgreSQL connected successfully")
	return db
}
