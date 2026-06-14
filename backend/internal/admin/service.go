package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Service struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewService(db *gorm.DB, rdb *redis.Client) *Service {
	return &Service{db: db, rdb: rdb}
}

// ===================== Dashboard =====================

func (s *Service) GetDashboard() (*DashboardData, error) {
	ctx := context.Background()

	// Redis 缓存优先
	cached, _ := s.rdb.Get(ctx, "admin:dashboard").Result()
	if cached != "" {
		var data DashboardData
		if json.Unmarshal([]byte(cached), &data) == nil {
			return &data, nil
		}
	}

	data := &DashboardData{}

	// 核心指标
	s.db.Raw("SELECT COUNT(*) FROM users WHERE status = 0").Scan(&data.TotalUsers)
	s.db.Raw("SELECT COUNT(DISTINCT sender_id) FROM messages WHERE created_at > CURRENT_DATE").Scan(&data.TodayActive)
	s.db.Raw("SELECT COUNT(*) FROM conversations WHERE type = 'channel'").Scan(&data.TotalGroups)
	s.db.Raw("SELECT COUNT(*) FROM messages WHERE created_at > CURRENT_DATE").Scan(&data.TodayMessages)
	s.db.Raw("SELECT COUNT(*) FROM conversations WHERE type = 'channel' AND created_at > CURRENT_DATE").Scan(&data.TodayNewGroups)

	// 在线人数
	keys, _ := s.rdb.Keys(ctx, "user:*:online").Result()
	data.OnlineUsers = int64(len(keys))

	// 文件统计
	type fc struct {
		Images int64 `gorm:"column:images"`
		Videos int64 `gorm:"column:videos"`
		Others int64 `gorm:"column:others"`
	}
	var fcRes fc
	s.db.Raw(`SELECT
		COUNT(*) FILTER (WHERE mime_type LIKE 'image/%') AS images,
		COUNT(*) FILTER (WHERE mime_type LIKE 'video/%') AS videos,
		COUNT(*) FILTER (WHERE mime_type NOT LIKE 'image/%' AND mime_type NOT LIKE 'video/%') AS others
		FROM files`).Scan(&fcRes)
	data.FilesCount = FilesCount{Images: fcRes.Images, Videos: fcRes.Videos, Others: fcRes.Others}

	// 存储用量
	var totalSize int64
	s.db.Raw("SELECT COALESCE(SUM(file_size), 0) FROM files").Scan(&totalSize)
	data.StorageUsed = formatSize(totalSize)

	// 消息趋势 (7天)
	type tp struct {
		Date    string `gorm:"column:date"`
		Count   int64  `gorm:"column:count"`
		DM      int64  `gorm:"column:dm"`
		Channel int64  `gorm:"column:channel"`
	}
	var trends []tp
	s.db.Raw(`SELECT DATE(m.created_at) AS date,
		COUNT(*) AS count,
		COUNT(*) FILTER (WHERE c.type = 'dm') AS dm,
		COUNT(*) FILTER (WHERE c.type = 'channel') AS channel
		FROM messages m JOIN conversations c ON c.id = m.conversation_id
		WHERE m.created_at > NOW() - INTERVAL '7 days'
		GROUP BY DATE(m.created_at) ORDER BY date`).Scan(&trends)
	for _, t := range trends {
		data.MessageTrend = append(data.MessageTrend, TrendPoint{
			Date: t.Date, Count: t.Count, DM: t.DM, Channel: t.Channel,
		})
	}

	// 活跃趋势 (7天)
	type dau struct {
		Date string `gorm:"column:date"`
		DAU  int64  `gorm:"column:dau"`
	}
	var daus []dau
	s.db.Raw(`SELECT DATE(created_at) AS date, COUNT(DISTINCT sender_id) AS dau
		FROM messages WHERE created_at > NOW() - INTERVAL '7 days'
		GROUP BY DATE(created_at) ORDER BY date`).Scan(&daus)
	for _, d := range daus {
		data.ActiveTrend = append(data.ActiveTrend, DAUPoint{Date: d.Date, DAU: d.DAU})
	}

	// 写入缓存 5min
	jsonData, _ := json.Marshal(data)
	s.rdb.Set(ctx, "admin:dashboard", jsonData, 5*time.Minute)

	return data, nil
}

// ===================== 用户管理 =====================

func (s *Service) ListUsers(q UserListQuery) ([]AdminUserResp, int64, error) {
	page, pageSize := normalizePage(q.Page, q.PageSize)

	query := s.db.Table("users")
	if q.Status == "active" {
		query = query.Where("status = 0")
	} else if q.Status == "banned" {
		query = query.Where("status = 1")
	}
	if q.Keyword != "" {
		kw := "%" + q.Keyword + "%"
		query = query.Where("username ILIKE ? OR nickname ILIKE ?", kw, kw)
	}

	var total int64
	query.Count(&total)

	var users []struct {
		ID        int64     `gorm:"column:id"`
		Username  string    `gorm:"column:username"`
		Nickname  string    `gorm:"column:nickname"`
		Avatar    string    `gorm:"column:avatar"`
		Status    int16     `gorm:"column:status"`
		Phone     string    `gorm:"column:phone"`
		Email     string    `gorm:"column:email"`
		CreatedAt time.Time `gorm:"column:created_at"`
	}
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&users)

	resp := make([]AdminUserResp, len(users))
	for i, u := range users {
		resp[i] = AdminUserResp{
			ID: u.ID, Username: u.Username, Nickname: u.Nickname,
			Avatar: u.Avatar, Status: u.Status, Banned: u.Status == 1,
			Phone: maskPhone(u.Phone), Email: maskEmail(u.Email),
			CreatedAt: u.CreatedAt.Format(time.RFC3339),
		}
	}
	return resp, total, nil
}

func (s *Service) GetUserDetail(userID int64) (*AdminUserResp, error) {
	var u struct {
		ID        int64     `gorm:"column:id"`
		Username  string    `gorm:"column:username"`
		Nickname  string    `gorm:"column:nickname"`
		Avatar    string    `gorm:"column:avatar"`
		Status    int16     `gorm:"column:status"`
		Phone     string    `gorm:"column:phone"`
		Email     string    `gorm:"column:email"`
		CreatedAt time.Time `gorm:"column:created_at"`
	}
	if err := s.db.Table("users").Where("id = ?", userID).Scan(&u).Error; err != nil {
		return nil, err
	}
	return &AdminUserResp{
		ID: u.ID, Username: u.Username, Nickname: u.Nickname,
		Avatar: u.Avatar, Status: u.Status, Banned: u.Status == 1,
		Phone: maskPhone(u.Phone), Email: maskEmail(u.Email),
		CreatedAt: u.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *Service) BanUser(adminID, userID int64, banned bool) error {
	status := int16(0)
	if banned {
		status = 1
	}
	if err := s.db.Table("users").Where("id = ?", userID).Update("status", status).Error; err != nil {
		return err
	}

	action := "unban_user"
	if banned {
		action = "ban_user"
	}
	LogAction(s.db, adminID, action, "user", userID, fmt.Sprintf("%s用户 #%d", action, userID))
	return nil
}

// ===================== 群组管理 =====================

func (s *Service) ListGroups(q GroupListQuery) ([]AdminGroupResp, int64, error) {
	page, pageSize := normalizePage(q.Page, q.PageSize)

	query := s.db.Table("conversations c").
		Select("c.id, c.title, u.nickname AS owner_name, c.created_at").
		Joins("LEFT JOIN users u ON u.id = c.owner_id").
		Where("c.type = 'channel'")
	if q.Keyword != "" {
		query = query.Where("c.title ILIKE ?", "%"+q.Keyword+"%")
	}

	var total int64
	s.db.Table("conversations").Where("type = 'channel'").Count(&total)

	type row struct {
		ID        int64     `gorm:"column:id"`
		Title     string    `gorm:"column:title"`
		OwnerName string    `gorm:"column:owner_name"`
		CreatedAt time.Time `gorm:"column:created_at"`
	}
	var rows []row
	query.Order("c.id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows)

	resp := make([]AdminGroupResp, len(rows))
	for i, r := range rows {
		var mc int64
		s.db.Table("conversation_members").Where("conversation_id = ?", r.ID).Count(&mc)
		resp[i] = AdminGroupResp{
			ID: r.ID, Title: r.Title, OwnerName: r.OwnerName,
			MemberCount: mc, CreatedAt: r.CreatedAt.Format(time.RFC3339),
		}
	}
	return resp, total, nil
}

func (s *Service) DeleteGroup(adminID, groupID int64) error {
	// 先查群名用于日志
	var title string
	s.db.Table("conversations").Select("title").Where("id = ?", groupID).Scan(&title)

	if err := s.db.Delete(& struct{ ID int64 }{ID: groupID}, groupID).Error; err != nil {
		// 尝试按 conversations 表删除
		s.db.Exec("DELETE FROM conversations WHERE id = ?", groupID)
	}

	LogAction(s.db, adminID, "delete_group", "group", groupID, fmt.Sprintf("解散群「%s」", title))
	return nil
}

// ===================== 强制撤回 =====================

func (s *Service) ForceRecall(adminID, msgID int64, reason string) error {
	s.db.Table("messages").Where("id = ?", msgID).Update("msg_status", 1)
	LogAction(s.db, adminID, "force_recall", "message", msgID, reason)
	return nil
}

// ===================== 操作日志 =====================

func (s *Service) ListLogs(q LogQuery) ([]AdminLogResp, int64, error) {
	page, pageSize := normalizePage(q.Page, q.PageSize)

	query := s.db.Table("admin_logs al").
		Select("al.*, u.nickname AS admin_name").
		Joins("LEFT JOIN users u ON u.id = al.admin_id")
	if q.Action != "" {
		query = query.Where("al.action = ?", q.Action)
	}
	if q.AdminID != "" {
		query = query.Where("al.admin_id = ?", q.AdminID)
	}

	var total int64
	s.db.Table("admin_logs").Count(&total)

	type row struct {
		ID         int64     `gorm:"column:id"`
		AdminName  string    `gorm:"column:admin_name"`
		Action     string    `gorm:"column:action"`
		TargetType string    `gorm:"column:target_type"`
		TargetID   int64     `gorm:"column:target_id"`
		Detail     string    `gorm:"column:detail"`
		CreatedAt  time.Time `gorm:"column:created_at"`
	}
	var rows []row
	query.Order("al.created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows)

	resp := make([]AdminLogResp, len(rows))
	for i, r := range rows {
		resp[i] = AdminLogResp{
			ID: r.ID, AdminName: r.AdminName, Action: r.Action,
			TargetType: r.TargetType, TargetID: r.TargetID,
			Detail: r.Detail, CreatedAt: r.CreatedAt.Format(time.RFC3339),
		}
	}
	return resp, total, nil
}

// ===================== helpers =====================

func LogAction(db *gorm.DB, adminID int64, action, targetType string, targetID int64, detail string) {
	db.Create(&AdminLog{
		AdminID: adminID, Action: action,
		TargetType: targetType, TargetID: targetID, Detail: detail,
	})
}

func normalizePage(page, pageSize int) (int, int) {
	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 20 }
	return page, pageSize
}

func maskPhone(phone string) string {
	if len(phone) < 7 { return phone }
	return phone[:3] + "****" + phone[len(phone)-4:]
}

func maskEmail(email string) string {
	if email == "" || len(email) < 3 { return email }
	return email[:1] + "***" + email[strings.LastIndexByte(email, '@'):]
}

func formatSize(bytes int64) string {
	switch {
	case bytes > 1024*1024*1024:
		return fmt.Sprintf("%.1fGB", float64(bytes)/(1024*1024*1024))
	case bytes > 1024*1024:
		return fmt.Sprintf("%.1fMB", float64(bytes)/(1024*1024))
	case bytes > 1024:
		return fmt.Sprintf("%.1fKB", float64(bytes)/1024)
	default:
		return fmt.Sprintf("%dB", bytes)
	}
}

var _ = time.Now
