package admin

import "time"

// ---------- GORM 模型 ----------

type AdminLog struct {
	ID         int64     `gorm:"primaryKey;column:id"      json:"id"`
	AdminID    int64     `gorm:"column:admin_id"            json:"admin_id"`
	Action     string    `gorm:"column:action"              json:"action"`
	TargetType string    `gorm:"column:target_type"         json:"target_type"`
	TargetID   int64     `gorm:"column:target_id"           json:"target_id"`
	Detail     string    `gorm:"column:detail"              json:"detail"`
	CreatedAt  time.Time `gorm:"column:created_at"          json:"created_at"`
}

func (AdminLog) TableName() string { return "admin_logs" }

// ---------- Dashboard ----------

type DashboardData struct {
	TotalUsers     int64          `json:"total_users"`
	TodayActive    int64          `json:"today_active"`
	TotalGroups    int64          `json:"total_groups"`
	TodayMessages  int64          `json:"today_messages"`
	OnlineUsers    int64          `json:"online_users"`
	TodayNewGroups int64          `json:"today_new_groups"`
	StorageUsed    string         `json:"storage_used"`
	FilesCount     FilesCount     `json:"files_count"`
	MessageTrend   []TrendPoint   `json:"message_trend"`
	ActiveTrend    []DAUPoint     `json:"active_trend"`
}

type FilesCount struct {
	Images int64 `json:"images"`
	Videos int64 `json:"videos"`
	Others int64 `json:"others"`
}

type TrendPoint struct {
	Date    string `json:"date"`
	Count   int64  `json:"count"`
	DM      int64  `json:"dm"`
	Channel int64  `json:"channel"`
}

type DAUPoint struct {
	Date string `json:"date"`
	DAU  int64  `json:"dau"`
}

// ---------- 用户管理 ----------

type UserListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"page_size"`
	Status   string `form:"status"`
	Keyword  string `form:"keyword"`
}

type AdminUserResp struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	Avatar    string `json:"avatar"`
	Status    int16  `json:"status"`
	Banned    bool   `json:"banned"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
}

type BanReq struct {
	Banned bool `json:"banned"`
}

// ---------- 群组管理 ----------

type GroupListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"page_size"`
	Keyword  string `form:"keyword"`
}

type AdminGroupResp struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	OwnerName   string `json:"owner_name"`
	MemberCount int64  `json:"member_count"`
	CreatedAt   string `json:"created_at"`
}

// ---------- 强制撤回 ----------

type ForceRecallReq struct {
	Reason string `json:"reason"`
}

// ---------- 日志 ----------

type LogQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"page_size"`
	AdminID  string `form:"admin_id"`
	Action   string `form:"action"`
}

type AdminLogResp struct {
	ID         int64  `json:"id"`
	AdminName  string `json:"admin_name"`
	Action     string `json:"action"`
	TargetType string `json:"target_type"`
	TargetID   int64  `json:"target_id"`
	Detail     string `json:"detail"`
	CreatedAt  string `json:"created_at"`
}
