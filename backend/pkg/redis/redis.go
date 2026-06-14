// Package redis 提供 Redis 客户端连接
package redis

import (
	"context"
	"log"
	"time"

	"github.com/papernote/backend/pkg/config"
	goredis "github.com/redis/go-redis/v9"
)

// Connect 建立 Redis 连接并验证
func Connect(cfg *config.Config) *goredis.Client {
	rdb := goredis.NewClient(&goredis.Options{
		Addr:     cfg.RedisAddr(),
		Password: cfg.RedisPassword,
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("failed to connect to Redis: %v", err)
	}

	log.Println("Redis connected successfully")
	return rdb
}
