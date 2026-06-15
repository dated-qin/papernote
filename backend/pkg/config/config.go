// Package config 从环境变量加载全部配置
// 关键变量缺失时直接 panic，确保启动即发现问题
package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	// 数据库
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string

	// Redis
	RedisHost     string
	RedisPort     int
	RedisPassword string

	// JWT
	JWTSecret      string
	JWTExpireHours int

	// OSS
	OSSAccessKey string
	OSSSecretKey string
	OSSBucket    string
	OSSEndpoint  string

	// 端口
	Port   int
	WSPort int
}

// loadEnvFile 从 .env 文件加载环境变量（只设置尚未设置的变量）
func loadEnvFile(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.Index(line, "=")
		if idx < 0 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		if key == "" || val == "" {
			continue
		}
		os.Setenv(key, val)
	}
}

func Load() *Config {
	loadEnvFile(".env")
	cfg := &Config{
		DBHost:         requireEnv("DB_HOST"),
		DBPort:         requireIntEnv("DB_PORT"),
		DBUser:         requireEnv("DB_USER"),
		DBPassword:     requireEnv("DB_PASSWORD"),
		DBName:         requireEnv("DB_NAME"),
		RedisHost:      requireEnv("REDIS_HOST"),
		RedisPort:      requireIntEnv("REDIS_PORT"),
		RedisPassword:  getEnv("REDIS_PASSWORD", ""),
		JWTSecret:      requireEnv("JWT_SECRET"),
		JWTExpireHours: getIntEnv("JWT_EXPIRE_HOURS", 24),
		OSSAccessKey:   getEnv("OSS_ACCESS_KEY", ""),
		OSSSecretKey:   getEnv("OSS_SECRET_KEY", ""),
		OSSBucket:      getEnv("OSS_BUCKET", "papernote"),
		OSSEndpoint:    getEnv("OSS_ENDPOINT", ""),
		Port:           getIntEnv("PORT", 8080),
		WSPort:         getIntEnv("WS_PORT", 8081),
	}

	// JWT Secret 长度校验
	if len(cfg.JWTSecret) < 32 {
		panic("JWT_SECRET must be at least 32 characters")
	}

	return cfg
}

func (c *Config) DBDSN() string {
	return "host=" + c.DBHost +
		" port=" + strconv.Itoa(c.DBPort) +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" dbname=" + c.DBName +
		" sslmode=disable TimeZone=Asia/Shanghai"
}

func (c *Config) RedisAddr() string {
	return c.RedisHost + ":" + strconv.Itoa(c.RedisPort)
}

// ---------- helper functions ----------

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required environment variable: " + key)
	}
	return v
}

func getIntEnv(key string, defaultVal int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		panic("invalid integer value for " + key + ": " + v)
	}
	return n
}

func requireIntEnv(key string) int {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required environment variable: " + key)
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		panic("invalid integer value for " + key + ": " + v)
	}
	return n
}
