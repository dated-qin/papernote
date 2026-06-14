package group

import "time"

// ---------- GORM 模型 ----------

type Announcement struct {
	ID             int64     `gorm:"primaryKey;column:id"      json:"id"`
	ConversationID int64     `gorm:"column:conversation_id"    json:"conversation_id"`
	PublisherID    int64     `gorm:"column:publisher_id"       json:"publisher_id"`
	Content        string    `gorm:"column:content"            json:"content"`
	CreatedAt      time.Time `gorm:"column:created_at"         json:"created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"         json:"updated_at"`
}

func (Announcement) TableName() string { return "announcements" }

type AnnouncementRead struct {
	ID             int64     `gorm:"primaryKey;column:id"      json:"id"`
	AnnouncementID int64     `gorm:"column:announcement_id"    json:"announcement_id"`
	UserID         int64     `gorm:"column:user_id"            json:"user_id"`
	ReadAt         time.Time `gorm:"column:read_at"            json:"read_at"`
}

func (AnnouncementRead) TableName() string { return "announcement_reads" }

// ---------- DTO ----------

type CreateAnnReq struct {
	Content string `json:"content" binding:"required"`
}

type UpdateAnnReq struct {
	Content string `json:"content" binding:"required"`
}

type AnnouncementResp struct {
	ID             int64  `json:"id"`
	Content        string `json:"content"`
	PublisherID    int64  `json:"publisher_id"`
	PublisherName  string `json:"publisher_name"`
	ReadCount      int    `json:"read_count"`
	TotalCount     int    `json:"total_count"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}
