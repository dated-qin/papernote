package message

import "time"

// ---------- GORM 模型 ----------

type Message struct {
	ID             int64     `gorm:"primaryKey;column:id"        json:"id"`
	ConversationID int64     `gorm:"column:conversation_id"      json:"conversation_id"`
	SenderID       int64     `gorm:"column:sender_id"            json:"sender_id"`
	MsgType        int16     `gorm:"column:msg_type"             json:"msg_type"`
	Content        string    `gorm:"column:content"              json:"content"`
	FileID         *int64    `gorm:"column:file_id"              json:"file_id"`
	ReplyTo        *int64    `gorm:"column:reply_to"             json:"reply_to"`
	ThreadRootID   *int64    `gorm:"column:thread_root_id"       json:"thread_root_id"`
	ReplyCount     int       `gorm:"column:reply_count"          json:"reply_count"`
	MentionIDs     []string  `gorm:"column:mention_ids;serializer:json;type:jsonb" json:"mention_ids"`
	MsgStatus      int16     `gorm:"column:msg_status"           json:"msg_status"`
	CreatedAt      time.Time `gorm:"column:created_at"           json:"created_at"`
}

func (Message) TableName() string { return "messages" }

// ---------- 发送消息结构 (WS) ----------

type SendMsgReq struct {
	ConversationID int64    `json:"conversation_id"`
	MsgType        int16    `json:"msg_type"`
	Content        string   `json:"content"`
	ReplyTo        *int64   `json:"reply_to"`
	ThreadRootID   *int64   `json:"thread_root_id"`
	FileID         *int64   `json:"file_id"`
	MentionIDs     []string `json:"mention_ids"`
}

// ---------- DTO ----------

type HistoryQuery struct {
	Before string `form:"before"`
	Limit  int    `form:"limit"`
}

type SearchQuery struct {
	Q              string `form:"q" binding:"required"`
	ConversationID string `form:"conversation_id"`
}

type ThreadQuery struct {
	Page     int `form:"page"`
	PageSize int `form:"page_size"`
}

type MessageResp struct {
	ID             int64    `json:"id"`
	ConversationID int64    `json:"conversation_id"`
	SenderID       int64    `json:"sender_id"`
	MsgType        int16    `json:"msg_type"`
	Content        string   `json:"content"`
	FileID         *int64   `json:"file_id"`
	ReplyTo        *int64   `json:"reply_to"`
	ThreadRootID   *int64   `json:"thread_root_id"`
	ReplyCount     int      `json:"reply_count"`
	MentionIDs     []string `json:"mention_ids"`
	Status         int16    `json:"status"`
	CreatedAt      string   `json:"created_at"`
}

type SearchMessageResp struct {
	MessageResp
	ConversationName string `json:"conversation_name"`
	SenderName       string `json:"sender_name"`
}
