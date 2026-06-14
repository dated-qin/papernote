package group

import (
	"context"
	"errors"
	"fmt"
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

// ---------- 公告列表 ----------

func (s *Service) GetAnnouncements(convID int64) ([]AnnouncementResp, error) {
	type row struct {
		Announcement
		PublisherName string `gorm:"column:publisher_name"`
		ReadCount     int    `gorm:"column:read_count"`
		TotalCount    int    `gorm:"column:total_count"`
	}

	var rows []row
	err := s.db.Table("announcements a").
		Select(`a.*, u.nickname AS publisher_name,
			(SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) AS read_count,
			(SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = a.conversation_id) AS total_count`).
		Joins("JOIN users u ON u.id = a.publisher_id").
		Where("a.conversation_id = ?", convID).
		Order("a.updated_at DESC").
		Limit(5).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	resp := make([]AnnouncementResp, len(rows))
	for i, r := range rows {
		resp[i] = AnnouncementResp{
			ID:            r.ID,
			Content:       r.Content,
			PublisherID:   r.PublisherID,
			PublisherName: r.PublisherName,
			ReadCount:     r.ReadCount,
			TotalCount:    r.TotalCount,
			CreatedAt:     r.CreatedAt.Format(time.RFC3339),
			UpdatedAt:     r.UpdatedAt.Format(time.RFC3339),
		}
	}
	return resp, nil
}

// ---------- 发布公告 ----------

func (s *Service) PublishAnnouncement(userID, convID int64, content string) (*AnnouncementResp, error) {
	if !s.hasRole(convID, userID, "owner", "admin") {
		return nil, errors.New("无权限：仅群主/管理员可发布公告")
	}

	ann := Announcement{
		ConversationID: convID,
		PublisherID:    userID,
		Content:        content,
	}
	if err := s.db.Create(&ann).Error; err != nil {
		return nil, err
	}

	// 查发布者昵称
	var pubName string
	s.db.Table("users").Select("nickname").Where("id = ?", userID).Scan(&pubName)

	// 查总人数
	var total int64
	s.db.Table("conversation_members").Where("conversation_id = ?", convID).Count(&total)

	return &AnnouncementResp{
		ID:            ann.ID,
		Content:       ann.Content,
		PublisherID:   ann.PublisherID,
		PublisherName: pubName,
		ReadCount:     0,
		TotalCount:    int(total),
		CreatedAt:     ann.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     ann.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// ---------- 编辑公告 ----------

func (s *Service) UpdateAnnouncement(userID, annID int64, content string) error {
	var ann Announcement
	if err := s.db.First(&ann, annID).Error; err != nil {
		return errors.New("公告不存在")
	}
	// 权限: 发布者 或 owner/admin
	if ann.PublisherID != userID && !s.hasRole(ann.ConversationID, userID, "owner", "admin") {
		return errors.New("无权限：仅发布者或群主/管理员可编辑")
	}
	return s.db.Model(&ann).Updates(map[string]interface{}{
		"content": content, "updated_at": time.Now(),
	}).Error
}

// ---------- 标记已读 ----------

func (s *Service) MarkAnnouncementRead(userID, annID int64) error {
	ar := AnnouncementRead{AnnouncementID: annID, UserID: userID}
	// ON CONFLICT DO NOTHING
	return s.db.Where(ar).FirstOrCreate(&ar).Error
}

// ---------- 禁言 (Redis TTL) ----------

func (s *Service) MuteMember(convID, targetID int64, durationSec int64) error {
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:muted:%d", targetID, convID)

	if durationSec > 0 {
		return s.rdb.Set(ctx, key, "1", time.Duration(durationSec)*time.Second).Err()
	}
	return s.rdb.Del(ctx, key).Err()
}

func (s *Service) IsMuted(convID, userID int64) bool {
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:muted:%d", userID, convID)
	exists, _ := s.rdb.Exists(ctx, key).Result()
	return exists > 0
}

// ---------- helpers ----------

func (s *Service) hasRole(convID, userID int64, roles ...string) bool {
	var role string
	s.db.Table("conversation_members").
		Select("role").
		Where("conversation_id = ? AND user_id = ?", convID, userID).
		Scan(&role)
	for _, r := range roles {
		if role == r {
			return true
		}
	}
	return false
}
