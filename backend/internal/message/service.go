package message

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
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

// ---------- 历史消息 ----------

func (s *Service) GetHistory(convID int64, q HistoryQuery) ([]MessageResp, error) {
	limit := q.Limit
	if limit <= 0 || limit > 100 {
		limit = 30
	}

	query := s.db.Model(&Message{}).
		Where("conversation_id = ? AND thread_root_id IS NULL", convID)

	if q.Before != "" {
		beforeID, err := strconv.ParseInt(q.Before, 10, 64)
		if err == nil && beforeID > 0 {
			query = query.Where("id < ?", beforeID)
		}
	}

	var msgs []Message
	if err := query.Order("created_at DESC").Limit(limit).Find(&msgs).Error; err != nil {
		return nil, err
	}

	// 反转顺序（前端期望升序）
	resp := make([]MessageResp, len(msgs))
	for i, m := range msgs {
		resp[len(msgs)-1-i] = toResp(m)
	}
	return resp, nil
}

// ---------- 发送消息 ----------

func (s *Service) SendMessage(senderID int64, req SendMsgReq) (*MessageResp, error) {
	// 校验 msg_type
	if req.MsgType < 0 || req.MsgType > 4 {
		return nil, errors.New("无效的消息类型")
	}

	msg := Message{
		ConversationID: req.ConversationID,
		SenderID:       senderID,
		MsgType:        req.MsgType,
		Content:        req.Content,
		ReplyTo:        req.ReplyTo,
		ThreadRootID:   req.ThreadRootID,
		FileID:         req.FileID,
		MentionIDs:     req.MentionIDs,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&msg).Error; err != nil {
			return err
		}

		// 更新会话 last_msg_id + updated_at
		if err := tx.Model(&Conversation{}).Where("id = ?", req.ConversationID).
			Updates(map[string]interface{}{
				"last_msg_id": msg.ID,
				"updated_at":  time.Now(),
			}).Error; err != nil {
			return err
		}

		// 线程回复：更新根消息 reply_count
		if req.ThreadRootID != nil {
			if err := tx.Model(&Message{}).Where("id = ?", *req.ThreadRootID).
				UpdateColumn("reply_count", gorm.Expr("reply_count + 1")).Error; err != nil {
				return err
			}
		}

		// 非发送者的成员 unread_count +1
		if err := tx.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id != ?", req.ConversationID, senderID).
			UpdateColumn("unread_count", gorm.Expr("unread_count + 1")).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	resp := toResp(msg)
	return &resp, nil
}

// ---------- 撤回消息 ----------

func (s *Service) RecallMessage(userID, msgID int64) error {
	var msg Message
	if err := s.db.First(&msg, msgID).Error; err != nil {
		return errors.New("消息不存在")
	}
	if msg.SenderID != userID {
		return errors.New("只能撤回自己的消息")
	}
	if time.Since(msg.CreatedAt) > 2*time.Minute {
		return errors.New("超过2分钟无法撤回")
	}
	if msg.MsgStatus == 1 {
		return errors.New("消息已撤回")
	}
	return s.db.Model(&msg).Update("msg_status", 1).Error
}

// ---------- 搜索消息 ----------

func (s *Service) SearchMessages(userID int64, q SearchQuery) ([]SearchMessageResp, error) {
	limit := 50
	type row struct {
		Message
		ConversationName string `gorm:"column:conversation_name"`
		SenderName       string `gorm:"column:sender_name"`
	}

	likeQ := "%" + q.Q + "%"
	query := s.db.Table("messages m").
		Select(`m.*,
			CASE
				WHEN c.type = 'dm' THEN COALESCE(NULLIF(dm_user.nickname, ''), dm_user.username, '私聊')
				ELSE COALESCE(NULLIF(c.title, ''), '未命名频道')
			END AS conversation_name,
			COALESCE(NULLIF(u.nickname, ''), u.username) AS sender_name`).
		Joins("JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = ?", userID).
		Joins("JOIN conversations c ON c.id = m.conversation_id").
		Joins("JOIN users u ON u.id = m.sender_id").
		Joins("LEFT JOIN conversation_members dm_cm ON dm_cm.conversation_id = c.id AND dm_cm.user_id <> ? AND c.type = 'dm'", userID).
		Joins("LEFT JOIN users dm_user ON dm_user.id = dm_cm.user_id").
		Where("m.msg_status = 0").
		Where("(to_tsvector('simple', m.content) @@ plainto_tsquery('simple', ?) OR m.content ILIKE ?)", q.Q, likeQ)

	if q.ConversationID != "" {
		if convID, err := strconv.ParseInt(q.ConversationID, 10, 64); err == nil {
			query = query.Where("m.conversation_id = ?", convID)
		}
	}

	var rows []row
	if err := query.Order("m.created_at DESC").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}

	resp := make([]SearchMessageResp, len(rows))
	for i, r := range rows {
		resp[i] = SearchMessageResp{
			MessageResp:      toResp(r.Message),
			ConversationName: r.ConversationName,
			SenderName:       r.SenderName,
		}
	}
	return resp, nil
}

// ---------- 线程消息 ----------

func (s *Service) GetThreadMessages(rootMsgID int64, q ThreadQuery) ([]MessageResp, error) {
	page := q.Page
	if page < 1 {
		page = 1
	}
	pageSize := q.PageSize
	if pageSize <= 0 || pageSize > 50 {
		pageSize = 20
	}

	var msgs []Message
	if err := s.db.Where("thread_root_id = ? OR id = ?", rootMsgID, rootMsgID).
		Order("created_at ASC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&msgs).Error; err != nil {
		return nil, err
	}

	resp := make([]MessageResp, len(msgs))
	for i, m := range msgs {
		resp[i] = toResp(m)
	}
	return resp, nil
}

// ---------- helpers ----------

func toResp(m Message) MessageResp {
	return MessageResp{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		SenderID:       m.SenderID,
		MsgType:        m.MsgType,
		Content:        m.Content,
		FileID:         m.FileID,
		ReplyTo:        m.ReplyTo,
		ThreadRootID:   m.ThreadRootID,
		ReplyCount:     m.ReplyCount,
		MentionIDs:     m.MentionIDs,
		Status:         m.MsgStatus,
		CreatedAt:      m.CreatedAt.Format(time.RFC3339),
	}
}

func (s *Service) allocateSeq(userID int64, msgID int64) {
	ctx := context.Background()
	seqKey := fmt.Sprintf("user:%d:msg_seq", userID)
	seq := s.rdb.Incr(ctx, seqKey).Val()

	// 入队（用于断线重连补全）
	queueKey := fmt.Sprintf("user:%d:msg_queue", userID)
	entry, _ := json.Marshal(map[string]interface{}{
		"seq": seq, "message_id": msgID,
	})
	s.rdb.RPush(ctx, queueKey, entry)
	// 保留最近 1000 条
	s.rdb.LTrim(ctx, queueKey, -1000, -1)
}

// ---------- 声明用到的类型 ----------

type Conversation struct {
	ID        int64     `gorm:"primaryKey;column:id"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
	LastMsgID *int64    `gorm:"column:last_msg_id"`
}

func (Conversation) TableName() string { return "conversations" }

type ConversationMember struct {
	ConversationID int64 `gorm:"column:conversation_id"`
	UserID         int64 `gorm:"column:user_id"`
	UnreadCount    int   `gorm:"column:unread_count"`
}

func (ConversationMember) TableName() string { return "conversation_members" }

var _ = fmt.Sprintf
