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

// ---------- Reaction ----------

type MessageReaction struct {
	ID        int64     `gorm:"primaryKey;column:id" json:"id"`
	MessageID int64     `gorm:"column:message_id"    json:"message_id"`
	UserID    int64     `gorm:"column:user_id"       json:"user_id"`
	Emoji     string    `gorm:"column:emoji"         json:"emoji"`
	CreatedAt time.Time `gorm:"column:created_at"    json:"created_at"`
}

func (MessageReaction) TableName() string { return "message_reactions" }

type ReactionItem struct {
	Emoji   string  `json:"emoji"`
	UserIDs []int64 `json:"user_ids"`
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
	ID             int64          `json:"id"`
	ConversationID int64          `json:"conversation_id"`
	SenderID       int64          `json:"sender_id"`
	MsgType        int16          `json:"msg_type"`
	Content        string         `json:"content"`
	FileID         *int64         `json:"file_id"`
	ReplyTo        *int64         `json:"reply_to"`
	ThreadRootID   *int64         `json:"thread_root_id"`
	ReplyCount     int            `json:"reply_count"`
	MentionIDs     []string       `json:"mention_ids"`
	Status         int16          `json:"status"`
	CreatedAt      string         `json:"created_at"`
	Reactions      []ReactionItem `json:"reactions"`
}

type SearchMessageResp struct {
	MessageResp
	ConversationName string `json:"conversation_name"`
	SenderName       string `json:"sender_name"`
}
