package user

import "time"

// ---------- GORM 模型 ----------

type User struct {
	ID        int64     `gorm:"primaryKey;column:id"  json:"id"`
	Username  string    `gorm:"column:username"        json:"username"`
	Nickname  string    `gorm:"column:nickname"        json:"nickname"`
	Avatar    string    `gorm:"column:avatar"          json:"avatar"`
	Bio       string    `gorm:"column:bio"             json:"bio"`
	Phone     string    `gorm:"column:phone"           json:"phone"`
	Email     string    `gorm:"column:email"           json:"email"`
	Status    int16     `gorm:"column:status"          json:"status"`
	CreatedAt time.Time `gorm:"column:created_at"      json:"created_at"`
}

func (User) TableName() string { return "users" }

type Friendship struct {
	ID        int64     `gorm:"primaryKey;column:id"`
	UserID    int64     `gorm:"column:user_id"`
	FriendID  int64     `gorm:"column:friend_id"`
	Remark    string    `gorm:"column:remark"`
	Blocked   bool      `gorm:"column:blocked"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (Friendship) TableName() string { return "friendships" }

type FriendRequest struct {
	ID         int64      `gorm:"primaryKey;column:id"`
	FromUserID int64      `gorm:"column:from_user_id"`
	ToUserID   int64      `gorm:"column:to_user_id"`
	Message    string     `gorm:"column:message"`
	Status     int16      `gorm:"column:status"`
	CreatedAt  time.Time  `gorm:"column:created_at"`
	HandledAt  *time.Time `gorm:"column:handled_at"`
}

func (FriendRequest) TableName() string { return "friend_requests" }

// ---------- DTO ----------

type SearchUserResp struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Online   bool   `json:"online"`
}

type UpdateMeReq struct {
	Nickname *string `json:"nickname"`
	Avatar   *string `json:"avatar"`
	Bio      *string `json:"bio"`
	Email    *string `json:"email"`
}

type FriendResp struct {
	UserID     int64  `json:"user_id"`
	Username   string `json:"username"`
	Nickname   string `json:"nickname"`
	Avatar     string `json:"avatar"`
	Remark     string `json:"remark"`
	Online     bool   `json:"online"`
	Blocked    bool   `json:"blocked"`
	LastActive string `json:"last_active,omitempty"`
}

type SendRequestReq struct {
	ToUserID int64  `json:"to_user_id" binding:"required"`
	Message  string `json:"message"`
}

type HandleRequestReq struct {
	Action string `json:"action" binding:"required,oneof=accept reject"`
}

type BlockReq struct {
	Blocked bool `json:"blocked"`
}

type FriendRequestResp struct {
	ID           int64  `json:"id"`
	FromUserID   int64  `json:"from_user_id"`
	FromUsername string `json:"from_username"`
	FromNickname string `json:"from_nickname"`
	FromAvatar   string `json:"from_avatar"`
	Message      string `json:"message"`
	Status       string `json:"status"`
	CreatedAt    string `json:"created_at"`
}
