package file

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/tencentyun/cos-go-sdk-v5"
)

// OSSClient 对象存储接口
type OSSClient interface {
	GenerateUploadToken(key string) (uploadURL string, token string)
	GenerateAccessURL(key string, expireSec int64) string
}

// ---------- 腾讯云 COS ----------

type TencentCOS struct {
	client       *cos.Client
	secretID     string
	secretKey    string
	bucket       string
	region       string
	customDomain string
}

func NewTencentCOS(secretID, secretKey, bucket, region, customDomain string) *TencentCOS {
	u, _ := cos.NewBucketURL(bucket, region, true)
	client := cos.NewClient(&cos.BaseURL{BucketURL: u}, &http.Client{
		Transport: &cos.AuthorizationTransport{
			SecretID:  secretID,
			SecretKey: secretKey,
		},
	})
	return &TencentCOS{
		client:       client,
		secretID:     secretID,
		secretKey:    secretKey,
		bucket:       bucket,
		region:       region,
		customDomain: strings.TrimSpace(customDomain),
	}
}

// GenerateUploadToken 生成预签名上传 URL（PUT）
func (t *TencentCOS) GenerateUploadToken(key string) (string, string) {
	ctx := context.Background()
	presigned, err := t.client.Object.GetPresignedURL(ctx, http.MethodPut, key, t.secretID, t.secretKey, 5*time.Minute, nil)
	if err != nil {
		return "", ""
	}
	// COS 预签名 URL 自带 auth，token 返回空
	return presigned.String(), ""
}

// GenerateAccessURL 生成预签名下载 URL（GET）
func (t *TencentCOS) GenerateAccessURL(key string, expireSec int64) string {
	if expireSec <= 0 {
		expireSec = 3600
	}
	ctx := context.Background()
	presigned, err := t.client.Object.GetPresignedURL(ctx, http.MethodGet, key, t.secretID, t.secretKey, time.Duration(expireSec)*time.Second, nil)
	if err != nil {
		return ""
	}
	return presigned.String()
}

// ---------- 开发/本地实现 ----------

type LocalOSS struct{}

func NewLocalOSS() *LocalOSS { return &LocalOSS{} }

func (l *LocalOSS) GenerateUploadToken(key string) (string, string) {
	return "http://localhost:8080/api/files/local-upload", "local-dev-token-" + key
}

func (l *LocalOSS) GenerateAccessURL(key string, expireSec int64) string {
	return fmt.Sprintf("http://localhost:8080/api/files/local/%s?expire=%d", key, expireSec)
}
