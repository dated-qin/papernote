package conversation

import "time"

// ---------- GORM 模型 ----------

type Conversation struct {
	ID          int64     `gorm:"primaryKey;column:id"`
	Type        string    `gorm:"column:type;size:8"`
	Title       string    `gorm:"column:title;size:128"`
	Avatar      string    `gorm:"column:avatar;size:512"`
	Description string    `gorm:"column:description;size:512"`
	OwnerID     *int64    `gorm:"column:owner_id"`
	LastMsgID   *int64    `gorm:"column:last_msg_id"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (Conversation) TableName() string { return "conversations" }

type ConversationMember struct {
	ID             int64     `gorm:"primaryKey;column:id"`
	ConversationID int64     `gorm:"column:conversation_id"`
	UserID         int64     `gorm:"column:user_id"`
	Role           string    `gorm:"column:role;size:16"`
	Muted          bool      `gorm:"column:muted"`
	Pinned         bool      `gorm:"column:pinned"`
	UnreadCount    int       `gorm:"column:unread_count"`
	LastReadMsgID  *int64    `gorm:"column:last_read_msg_id"`
	JoinedAt       time.Time `gorm:"column:joined_at"`
}

func (ConversationMember) TableName() string { return "conversation_members" }

// ---------- DTO ----------

type ListQuery struct {
	Type string `form:"type"` // all | dm | channel
}

type ListItem struct {
	ID           int64       `json:"id"`
	Type         string      `json:"type"`
	Title        string      `json:"title"`
	Avatar       string      `json:"avatar"`
	UnreadCount  int         `json:"unread_count"`
	Muted        bool        `json:"muted"`
	Pinned       bool        `json:"pinned"`
	UpdatedAt    string      `json:"updated_at"`
	LastMessage  *LastMsg    `json:"last_message,omitempty"`
}

type LastMsg struct {
	Content   string `json:"content"`
	SenderID  int64  `json:"sender_id"`
	MsgType   int16  `json:"msg_type"`
	CreatedAt string `json:"created_at"`
}

type CreateDMReq struct {
	UserID int64 `json:"user_id" binding:"required"`
}

type CreateChannelReq struct {
	Name      string  `json:"name" binding:"required,min=1,max=128"`
	MemberIDs []int64 `json:"member_ids" binding:"required,min=1"`
}

type UpdateGroupReq struct {
	Name        string `json:"name"`
	Avatar      string `json:"avatar"`
	Description string `json:"description"`
}

type ManageMemberReq struct {
	Action   string `json:"action" binding:"required"`
	Duration int64  `json:"duration"` // 禁言时长(秒), 0=解除
}

type InviteReq struct {
	UserIDs []int64 `json:"user_ids" binding:"required,min=1"`
}

type MemberResp struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Role     string `json:"role"`
	Muted    bool   `json:"muted"`
	JoinedAt string `json:"joined_at"`
}
