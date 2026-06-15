package file

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"
)

type Service struct {
	db  *gorm.DB
	oss OSSClient
}

func NewService(db *gorm.DB, oss OSSClient) *Service {
	return &Service{db: db, oss: oss}
}

// 白名单 MIME 类型前缀
var allowedMIMEs = []string{
	"image/", "video/", "audio/",
	"application/pdf", "application/zip", "application/x-rar",
	"application/msword", "application/vnd.openxmlformats",
	"application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml",
	"text/plain", "text/csv",
}

// ---------- 获取上传凭证 ----------

func (s *Service) GetUploadToken(userID int64, req UploadTokenReq) (*UploadTokenResp, error) {
	// 大小校验
	const maxSize = 100 * 1024 * 1024
	if req.FileSize > maxSize {
		return nil, fmt.Errorf("文件大小不能超过 100MB (当前: %.1fMB)", float64(req.FileSize)/1024/1024)
	}

	// MIME 白名单
	if !isAllowedMIME(req.ContentType) {
		return nil, fmt.Errorf("不支持的文件类型: %s", req.ContentType)
	}

	// 生成 OSS key
	key := s.generateKey(req.FileName)

	// 签发上传凭证
	uploadURL, token := s.oss.GenerateUploadToken(key)

	return &UploadTokenResp{
		UploadURL: uploadURL,
		Token:     token,
		Key:       key,
	}, nil
}

// ---------- 上传回调 ----------

func (s *Service) UploadCallback(userID int64, req UploadCallbackReq) (*UploadCallbackResp, error) {
	f := File{
		UserID:   userID,
		FileName: req.FileName,
		FileSize: req.FileSize,
		MimeType: req.MimeType,
		OSSKey:   req.Key,
		Width:    req.Width,
		Height:   req.Height,
		Duration: req.Duration,
	}

	if err := s.db.Create(&f).Error; err != nil {
		return nil, err
	}

	// 生成签名访问 URL (1h)
	url := s.oss.GenerateAccessURL(req.Key, 3600)

	return &UploadCallbackResp{FileID: f.ID, URL: url}, nil
}

// ---------- 获取文件访问 URL ----------

func (s *Service) GetFileURL(fileID int64) (*FileURLResp, error) {
	url, err := s.GetFileRawURL(fileID, 3600)
	if err != nil {
		return nil, err
	}
	return &FileURLResp{URL: url, ExpiresIn: 3600}, nil
}

// GetFileRawURL 返回原始签名字符串（供 handler 做 302 重定向）
func (s *Service) GetFileRawURL(fileID int64, expireSec int64) (string, error) {
	var f File
	if err := s.db.First(&f, fileID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("文件不存在")
		}
		return "", err
	}
	return s.oss.GenerateAccessURL(f.OSSKey, expireSec), nil
}

// ---------- helpers ----------

func (s *Service) generateKey(fileName string) string {
	ext := filepath.Ext(fileName)
	now := time.Now()
	return fmt.Sprintf("files/%s/%s%s",
		now.Format("2006/01/02"), newUUID(), ext)
}

func isAllowedMIME(mime string) bool {
	for _, prefix := range allowedMIMEs {
		if strings.HasPrefix(mime, prefix) {
			return true
		}
	}
	return false
}

// simple UUID v4 — 避免额外依赖
func newUUID() string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		rng(), rng()&0xffff, (rng()&0x0fff)|0x4000, (rng()&0x3fff)|0x8000, rng())
}

var rng = func() uint32 {
	return uint32(time.Now().UnixNano() ^ int64(time.Now().Nanosecond()))
}
