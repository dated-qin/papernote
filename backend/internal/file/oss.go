package file

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"
)

// OSSClient 对象存储接口 — 生产用七牛云，开发/测试用本地签名
type OSSClient interface {
	// GenerateUploadToken 签发上传凭证
	GenerateUploadToken(key string) (uploadURL string, token string)
	// GenerateAccessURL 生成私有文件访问签名 URL
	GenerateAccessURL(key string, expireSec int64) string
}

// ---------- 生产实现: 七牛云 ----------

type QiniuOSS struct {
	AccessKey string
	SecretKey string
	Bucket    string
	Endpoint  string
}

func NewQiniuOSS(ak, sk, bucket, endpoint string) *QiniuOSS {
	return &QiniuOSS{AccessKey: ak, SecretKey: sk, Bucket: bucket, Endpoint: endpoint}
}

func (q *QiniuOSS) GenerateUploadToken(key string) (string, string) {
	uploadURL := fmt.Sprintf("https://up.%s", q.Endpoint)

	// 七牛云上传策略
	putPolicy := map[string]interface{}{
		"scope":    fmt.Sprintf("%s:%s", q.Bucket, key),
		"deadline": time.Now().Unix() + 300,
	}
	policyJSON, _ := json.Marshal(putPolicy)
	encodedPolicy := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(policyJSON)

	sign := q.sign(encodedPolicy)
	token := fmt.Sprintf("%s:%s:%s", q.AccessKey, sign, encodedPolicy)

	return uploadURL, token
}

func (q *QiniuOSS) GenerateAccessURL(key string, expireSec int64) string {
	deadline := time.Now().Unix() + expireSec
	url := fmt.Sprintf("https://%s/%s?e=%d", q.Endpoint, key, deadline)
	// 下载凭证格式: AccessKey:EncodedSign（上传凭证是 AccessKey:Sign:EncodedPolicy）
	token := fmt.Sprintf("%s:%s", q.AccessKey, q.sign(url))
	return url + "&token=" + token
}

func (q *QiniuOSS) sign(data string) string {
	h := hmac.New(sha1.New, []byte(q.SecretKey))
	h.Write([]byte(data))
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(h.Sum(nil))
}

// ---------- 开发/本地实现（无真实 OSS 时使用） ----------

type LocalOSS struct{}

func NewLocalOSS() *LocalOSS { return &LocalOSS{} }

func (l *LocalOSS) GenerateUploadToken(key string) (string, string) {
	// 返回本地占位凭证
	return "http://localhost:8080/api/files/local-upload", "local-dev-token-" + key
}

func (l *LocalOSS) GenerateAccessURL(key string, expireSec int64) string {
	return fmt.Sprintf("http://localhost:8080/api/files/local/%s?expire=%d", key, expireSec)
}
