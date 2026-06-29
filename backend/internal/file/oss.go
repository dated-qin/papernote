package file

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// OSSClient 对象存储接口
type OSSClient interface {
	GenerateUploadToken(key string) (uploadURL string, token string)
	GenerateAccessURL(key string, expireSec int64) string
}

// ---------- 腾讯云 COS ----------

type TencentCOS struct {
	SecretID     string
	SecretKey    string
	Bucket       string // papernote-1443300859
	Region       string // ap-shanghai
	CustomDomain string // static.qingliu.tech（可选）
}

func NewTencentCOS(secretID, secretKey, bucket, region, customDomain string) *TencentCOS {
	return &TencentCOS{
		SecretID:     secretID,
		SecretKey:    secretKey,
		Bucket:       bucket,
		Region:       region,
		CustomDomain: strings.TrimSpace(customDomain),
	}
}

// cosHost 返回访问域名
func (t *TencentCOS) cosHost() string {
	if t.CustomDomain != "" {
		return fmt.Sprintf("https://%s", t.CustomDomain)
	}
	return fmt.Sprintf("https://%s.cos.%s.myqcloud.com", t.Bucket, t.Region)
}

// uploadHost 返回上传域名
func (t *TencentCOS) uploadHost() string {
	return fmt.Sprintf("https://%s.cos.%s.myqcloud.com", t.Bucket, t.Region)
}

// GenerateUploadToken 生成预签名上传 URL（PUT）
func (t *TencentCOS) GenerateUploadToken(key string) (string, string) {
	// COS 预签名 PUT URL，token 返回空（前端 PUT 直传）
	return t.signURL("put", key, 300), ""
}

// GenerateAccessURL 生成预签名下载 URL（GET）
func (t *TencentCOS) GenerateAccessURL(key string, expireSec int64) string {
	if expireSec <= 0 {
		expireSec = 3600
	}
	return t.signURL("get", key, expireSec)
}

// signURL 腾讯云 COS 签名 V4/V5
func (t *TencentCOS) signURL(method, key string, expireSec int64) string {
	now := time.Now().Unix()
	keyTime := fmt.Sprintf("%d;%d", now, now+expireSec)
	signTime := keyTime

	// SignKey = HMAC-SHA1(SecretKey, key_time)
	signKey := t.hmacSHA1(t.SecretKey, keyTime)

	// 去除 URL 参数部分用于签名
	uriPath := "/" + key

	// HttpString = "method\nuri\n\n\n"
	httpString := fmt.Sprintf("%s\n%s\n\n\n", strings.ToLower(method), uriPath)

	// StringToSign = "sha1\nsign_time\nSHA1(HttpString)\n"
	sha1ed := sha1Sum(httpString)
	stringToSign := fmt.Sprintf("sha1\n%s\n%s\n", signTime, sha1ed)

	// Signature = HMAC-SHA1(SignKey, StringToSign)
	signature := t.hmacSHA1(signKey, stringToSign)

	host := t.cosHost()
	if method == "put" {
		host = t.uploadHost()
	}

	return fmt.Sprintf("%s/%s?q-sign-algorithm=sha1&q-ak=%s&q-sign-time=%s&q-key-time=%s&q-header-list=&q-url-param-list=&q-signature=%s",
		host, key, t.SecretID, signTime, keyTime, signature)
}

func (t *TencentCOS) hmacSHA1(key, data string) string {
	h := hmac.New(sha1.New, []byte(key))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

func sha1Sum(s string) string {
	h := sha1.New()
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
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
