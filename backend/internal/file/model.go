package file

import "time"

// File GORM 模型
type File struct {
	ID        int64     `gorm:"primaryKey;column:id"   json:"id"`
	UserID    int64     `gorm:"column:user_id"          json:"user_id"`
	FileName  string    `gorm:"column:file_name"        json:"file_name"`
	FileSize  int64     `gorm:"column:file_size"        json:"file_size"`
	MimeType  string    `gorm:"column:mime_type"        json:"mime_type"`
	OSSKey    string    `gorm:"column:oss_key"          json:"oss_key"`
	Width     *int      `gorm:"column:width"            json:"width"`
	Height    *int      `gorm:"column:height"           json:"height"`
	Duration  *int      `gorm:"column:duration"         json:"duration"`
	CreatedAt time.Time `gorm:"column:created_at"       json:"created_at"`
}

func (File) TableName() string { return "files" }

// ---------- DTO ----------

type UploadTokenReq struct {
	FileName    string `json:"file_name"    binding:"required"`
	FileSize    int64  `json:"file_size"    binding:"required"`
	ContentType string `json:"content_type" binding:"required"`
}

type UploadTokenResp struct {
	UploadURL string `json:"upload_url"`
	Token     string `json:"token"`
	Key       string `json:"key"`
}

type UploadCallbackReq struct {
	Key      string `json:"key"       binding:"required"`
	FileName string `json:"file_name" binding:"required"`
	FileSize int64  `json:"file_size" binding:"required"`
	MimeType string `json:"mime_type" binding:"required"`
	Width    *int   `json:"width"`
	Height   *int   `json:"height"`
	Duration *int   `json:"duration"`
}

type UploadCallbackResp struct {
	FileID int64  `json:"file_id"`
	URL    string `json:"url"`
}

type FileURLResp struct {
	URL       string `json:"url"`
	ExpiresIn int    `json:"expires_in"`
}
