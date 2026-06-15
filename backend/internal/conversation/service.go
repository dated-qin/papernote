package conversation

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// ---------- 会话列表 ----------

func (s *Service) List(userID int64, q ListQuery) ([]ListItem, error) {
	type row struct {
		Conversation
		UnreadCount int        `gorm:"column:unread_count"`
		Muted       bool       `gorm:"column:muted"`
		Pinned      bool       `gorm:"column:pinned"`
		MsgID       *int64     `gorm:"column:msg_id"`
		MsgContent  *string    `gorm:"column:msg_content"`
		MsgSenderID *int64     `gorm:"column:msg_sender_id"`
		MsgType     *int16     `gorm:"column:msg_type"`
		MsgMentions []byte     `gorm:"column:msg_mention_ids"`
		MsgCreated  *time.Time `gorm:"column:msg_created_at"`
	}

	query := s.db.Table("conversations c").
		Select(`c.id, c.type, c.owner_id, c.last_msg_id, c.description, c.created_at, c.updated_at,
			CASE WHEN c.type = 'dm'
				THEN COALESCE(NULLIF(dm_user.nickname, ''), dm_user.username, '私聊')
				ELSE COALESCE(NULLIF(c.title, ''), '未命名频道')
			END AS title,
			CASE WHEN c.type = 'dm'
				THEN COALESCE(dm_user.avatar, '')
				ELSE COALESCE(c.avatar, '')
			END AS avatar,
			cm.unread_count, cm.muted, cm.pinned,
			lm.id AS msg_id,
			lm.content AS msg_content, lm.sender_id AS msg_sender_id,
			lm.msg_type, lm.mention_ids AS msg_mention_ids, lm.created_at AS msg_created_at`).
		Joins("JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?", userID).
		Joins("LEFT JOIN conversation_members dm_cm ON dm_cm.conversation_id = c.id AND dm_cm.user_id != ? AND c.type = 'dm'", userID).
		Joins("LEFT JOIN users dm_user ON dm_user.id = dm_cm.user_id").
		Joins("LEFT JOIN messages lm ON lm.id = c.last_msg_id")

	if q.Type != "" && q.Type != "all" {
		query = query.Where("c.type = ?", q.Type)
	}

	var rows []row
	if err := query.Order("c.updated_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]ListItem, len(rows))
	for i, r := range rows {
		item := ListItem{
			ID:          r.ID,
			Type:        r.Type,
			Title:       r.Title,
			Avatar:      r.Avatar,
			UnreadCount: r.UnreadCount,
			Muted:       r.Muted,
			Pinned:      r.Pinned,
			UpdatedAt:   r.UpdatedAt.Format(time.RFC3339),
		}
		if r.MsgContent != nil {
			item.LastMessage = &LastMsg{
				ID:         *r.MsgID,
				Content:    *r.MsgContent,
				SenderID:   *r.MsgSenderID,
				MsgType:    *r.MsgType,
				MentionIDs: parseMentionIDs(r.MsgMentions),
				CreatedAt:  r.MsgCreated.Format(time.RFC3339),
			}
		}
		items[i] = item
	}

		// 批量填充 member_ids
		if len(items) > 0 {
			convIDs := make([]int64, len(items))
			for i, item := range items {
				convIDs[i] = item.ID
			}
			type memberRow struct {
				ConvID int64 `gorm:"column:conversation_id"`
				UserID int64 `gorm:"column:user_id"`
			}
			var members []memberRow
			s.db.Table("conversation_members").
				Select("conversation_id, user_id").
				Where("conversation_id IN ?", convIDs).
				Find(&members)
			memberMap := make(map[int64][]int64)
			for _, m := range members {
				memberMap[m.ConvID] = append(memberMap[m.ConvID], m.UserID)
			}
			for i := range items {
				items[i].MemberIDs = memberMap[items[i].ID]
			}
		}
	return items, nil
}

// ---------- 创建私聊 ----------

func (s *Service) CreateDM(creatorID, targetID int64) (int64, error) {
	// 检查是否已存在 DM
	existing, err := s.findExistingDM(creatorID, targetID)
	if err != nil {
		return 0, err
	}
	if existing != 0 {
		return existing, nil
	}

	// 创建新会话
	conv := Conversation{Type: "dm"}
	return s.createWithMembers(&conv, []int64{creatorID, targetID}, creatorID)
}

func (s *Service) findExistingDM(a, b int64) (int64, error) {
	var ids []int64
	err := s.db.Raw(`
		SELECT cm1.conversation_id FROM conversation_members cm1
		JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
		JOIN conversations c ON c.id = cm1.conversation_id
		WHERE cm1.user_id = ? AND cm2.user_id = ? AND c.type = 'dm'
		LIMIT 1`, a, b).Scan(&ids).Error
	if err != nil || len(ids) == 0 {
		return 0, err
	}
	return ids[0], nil
}

// ---------- 创建频道 ----------

func (s *Service) CreateChannel(creatorID int64, req CreateChannelReq) (*ListItem, error) {
	conv := Conversation{
		Type:    "channel",
		Title:   req.Name,
		OwnerID: &creatorID,
	}
	memberIDs := uniqueInt64s(append([]int64{creatorID}, req.MemberIDs...))
	id, err := s.createWithMembers(&conv, memberIDs, creatorID)
	if err != nil {
		return nil, err
	}
	return &ListItem{ID: id, Type: "channel", Title: req.Name}, nil
}

func (s *Service) createWithMembers(conv *Conversation, memberIDs []int64, creatorID int64) (int64, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(conv).Error; err != nil {
			return err
		}
		for _, uid := range memberIDs {
			role := "member"
			if uid == creatorID && conv.Type == "channel" {
				role = "owner"
			}
			cm := ConversationMember{
				ConversationID: conv.ID,
				UserID:         uid,
				Role:           role,
			}
			if err := tx.Create(&cm).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return conv.ID, err
}

// ---------- 会话详情 ----------

func (s *Service) GetDetail(userID, convID int64) (*ListItem, []MemberResp, error) {
	// 成员校验
	if !s.isMember(convID, userID) {
		return nil, nil, errors.New("非会话成员")
	}

	var conv Conversation
	if err := s.db.First(&conv, convID).Error; err != nil {
		return nil, nil, err
	}

	title := conv.Title
	avatar := conv.Avatar
	// DM 会话：用对方昵称/头像
	if conv.Type == "dm" {
		type dmInfo struct {
			Nickname string `gorm:"column:nickname"`
			Avatar   string `gorm:"column:avatar"`
			Username string `gorm:"column:username"`
		}
		var info dmInfo
		s.db.Table("conversation_members cm").
			Select("u.nickname, u.avatar, u.username").
			Joins("JOIN users u ON u.id = cm.user_id").
			Where("cm.conversation_id = ? AND cm.user_id != ?", convID, userID).
			First(&info)
		if info.Nickname != "" {
			title = info.Nickname
		} else if info.Username != "" {
			title = info.Username
		} else {
			title = "私聊"
		}
		avatar = info.Avatar
	}

	members, err := s.GetMembers(convID)
	if err != nil {
		return nil, nil, err
	}

	detail := &ListItem{
		ID:     conv.ID,
		Type:   conv.Type,
		Title:  title,
		Avatar: avatar,
	}
	return detail, members, nil
}

// ---------- 会话个人设置 ----------

func (s *Service) TogglePin(userID, convID int64) (bool, error) {
	return s.toggleMemberBool(userID, convID, "pinned")
}

func (s *Service) ToggleMute(userID, convID int64) (bool, error) {
	return s.toggleMemberBool(userID, convID, "muted")
}

func (s *Service) toggleMemberBool(userID, convID int64, column string) (bool, error) {
	var cm ConversationMember
	if err := s.db.Where("conversation_id = ? AND user_id = ?", convID, userID).
		First(&cm).Error; err != nil {
		return false, errors.New("非会话成员")
	}

	next := false
	switch column {
	case "pinned":
		next = !cm.Pinned
	case "muted":
		next = !cm.Muted
	default:
		return false, errors.New("未知设置")
	}

	if err := s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", convID, userID).
		Update(column, next).Error; err != nil {
		return false, err
	}
	return next, nil
}

// ---------- 修改群信息 ----------

func (s *Service) UpdateGroup(userID, convID int64, req UpdateGroupReq) error {
	if !s.hasRole(convID, userID, "owner", "admin") {
		return errors.New("无权限：仅群主/管理员可修改群信息")
	}
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["title"] = req.Name
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if len(updates) == 0 {
		return nil
	}
	return s.db.Model(&Conversation{}).Where("id = ?", convID).Updates(updates).Error
}

// ---------- 成员列表 ----------

func (s *Service) GetMembers(convID int64) ([]MemberResp, error) {
	var rows []struct {
		ConversationMember
		Username string `gorm:"column:username"`
		Nickname string `gorm:"column:nickname"`
		Avatar   string `gorm:"column:avatar"`
	}
	err := s.db.Table("conversation_members cm").
		Select("cm.*, u.username, u.nickname, u.avatar").
		Joins("JOIN users u ON u.id = cm.user_id").
		Where("cm.conversation_id = ?", convID).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	resp := make([]MemberResp, len(rows))
	for i, r := range rows {
		resp[i] = MemberResp{
			UserID:   r.UserID,
			Username: r.Username,
			Nickname: r.Nickname,
			Avatar:   r.Avatar,
			Role:     r.Role,
			Muted:    r.Muted,
			JoinedAt: r.JoinedAt.Format(time.RFC3339),
		}
	}
	return resp, nil
}

// ---------- 管理成员 ----------

func (s *Service) ManageMember(operatorID, convID, targetID int64, req ManageMemberReq) error {
	switch req.Action {
	case "remove":
		return s.removeMember(operatorID, convID, targetID)
	case "promote_admin":
		return s.promoteMember(operatorID, convID, targetID, "admin")
	case "demote_admin":
		return s.demoteAdmin(operatorID, convID, targetID)
	case "transfer_owner":
		return s.transferOwner(operatorID, convID, targetID)
	case "mute":
			return s.muteMember(operatorID, convID, targetID, req.Duration)
		case "unmute":
			return s.muteMember(operatorID, convID, targetID, 0)
	default:
		return errors.New("未知操作: " + req.Action)
	}
}

func (s *Service) removeMember(operatorID, convID, targetID int64) error {
	if operatorID == targetID {
		return errors.New("不能移除自己")
	}
	if err := s.requireAdmin(convID, operatorID); err != nil {
		return err
	}
	// 不能移除群主
	if s.hasRole(convID, targetID, "owner") {
		return errors.New("不能移除群主")
	}
	return s.db.Where("conversation_id = ? AND user_id = ?", convID, targetID).
		Delete(&ConversationMember{}).Error
}

func (s *Service) promoteMember(operatorID, convID, targetID int64, role string) error {
	if err := s.requireOwner(convID, operatorID); err != nil {
		return err
	}
	return s.updateRole(convID, targetID, role)
}

func (s *Service) demoteAdmin(operatorID, convID, targetID int64) error {
	if err := s.requireOwner(convID, operatorID); err != nil {
		return err
	}
	return s.updateRole(convID, targetID, "member")
}

func (s *Service) transferOwner(operatorID, convID, targetID int64) error {
	if err := s.requireOwner(convID, operatorID); err != nil {
		return err
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", convID, operatorID).
			Update("role", "admin").Error; err != nil {
			return err
		}
		if err := tx.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", convID, targetID).
			Update("role", "owner").Error; err != nil {
			return err
		}
		// 更新 conversations.owner_id
		return tx.Model(&Conversation{}).Where("id = ?", convID).
			Update("owner_id", targetID).Error
	})
}

func (s *Service) muteMember(operatorID, convID, targetID int64, duration int64) error {
	if err := s.requireAdmin(convID, operatorID); err != nil {
		return err
	}
	if s.hasRole(convID, targetID, "owner") {
		return errors.New("不能禁言群主")
	}
	if s.hasRole(convID, targetID, "admin") && !s.hasRole(convID, operatorID, "owner") {
		return errors.New("管理员不能禁言其他管理员")
	}
	muted := duration > 0
	return s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", convID, targetID).
		Update("muted", muted).Error
}

// ---------- 邀请成员 ----------

func (s *Service) InviteMembers(convID int64, userIDs []int64) error {
	for _, uid := range userIDs {
		if s.isMember(convID, uid) {
			continue
		}
		cm := ConversationMember{
			ConversationID: convID, UserID: uid, Role: "member",
		}
		if err := s.db.Create(&cm).Error; err != nil {
			return err
		}
	}
	return nil
}

// ---------- 解散群 ----------

func (s *Service) DeleteGroup(userID, convID int64) error {
	if err := s.requireOwner(convID, userID); err != nil {
		return err
	}
	return s.db.Delete(&Conversation{}, convID).Error
}

// ---------- helpers ----------

func (s *Service) isMember(convID, userID int64) bool {
	var count int64
	s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", convID, userID).Count(&count)
	return count > 0
}

func (s *Service) hasRole(convID, userID int64, roles ...string) bool {
	var role string
	s.db.Model(&ConversationMember{}).
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

func (s *Service) requireAdmin(convID, userID int64) error {
	if !s.hasRole(convID, userID, "owner", "admin") {
		return errors.New("无权限：仅群主/管理员可操作")
	}
	return nil
}

func (s *Service) requireOwner(convID, userID int64) error {
	if !s.hasRole(convID, userID, "owner") {
		return errors.New("无权限：仅群主可操作")
	}
	return nil
}

func (s *Service) updateRole(convID, userID int64, role string) error {
	return s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", convID, userID).
		Update("role", role).Error
}

func uniqueInt64s(ids []int64) []int64 {
	seen := make(map[int64]struct{}, len(ids))
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func parseMentionIDs(raw []byte) []string {
	if len(raw) == 0 {
		return nil
	}
	var ids []string
	if err := json.Unmarshal(raw, &ids); err != nil {
		return nil
	}
	return ids
}

// ---------- 声明使用 fmt ----------
var _ = fmt.Sprintf
