package user

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Service struct {
	db       *gorm.DB
	rdb      *redis.Client
	notifier UserNotifier
}

type UserNotifier interface {
	NotifyUser(userID int64, action string, data map[string]interface{})
}

func NewService(db *gorm.DB, rdb *redis.Client, notifier ...UserNotifier) *Service {
	var n UserNotifier
	if len(notifier) > 0 {
		n = notifier[0]
	}
	return &Service{db: db, rdb: rdb, notifier: n}
}

// ---------- 搜索用户 ----------

func (s *Service) SearchUsers(query string) ([]SearchUserResp, error) {
	var users []User
	kw := "%" + query + "%"
	if err := s.db.Where("username LIKE ? OR nickname LIKE ? OR phone LIKE ?",
		kw, kw, kw).
		Limit(20).Find(&users).Error; err != nil {
		return nil, err
	}

	resp := make([]SearchUserResp, len(users))
	for i, u := range users {
		resp[i] = SearchUserResp{
			ID:       u.ID,
			Username: u.Username,
			Nickname: u.Nickname,
			Avatar:   u.Avatar,
			Online:   s.isOnline(u.ID),
		}
	}
	return resp, nil
}

// ---------- 更新个人资料 ----------

func (s *Service) UpdateMe(userID int64, req UpdateMeReq) error {
	updates := map[string]interface{}{}
	if req.Nickname != nil {
		nickname := strings.TrimSpace(*req.Nickname)
		if nickname == "" {
			return errors.New("昵称不能为空")
		}
		updates["nickname"] = nickname
	}
	if req.Avatar != nil {
		updates["avatar"] = strings.TrimSpace(*req.Avatar)
	}
	if req.Bio != nil {
		bio := strings.TrimSpace(*req.Bio)
		if len([]rune(bio)) > 256 {
			return errors.New("简介不能超过 256 个字符")
		}
		updates["bio"] = bio
	}
	if req.Email != nil {
		email := strings.TrimSpace(*req.Email)
		if email != "" && !strings.Contains(email, "@") {
			return errors.New("邮箱格式不正确")
		}
		updates["email"] = email
	}
	if len(updates) == 0 {
		return errors.New("无更新字段")
	}
	return s.db.Model(&User{}).Where("id = ?", userID).Updates(updates).Error
}

// ---------- 好友列表 ----------

func (s *Service) GetFriends(userID int64) ([]FriendResp, error) {
	var rows []struct {
		Friendship
		Nickname string `gorm:"column:nickname"`
		Username string `gorm:"column:username"`
		Avatar   string `gorm:"column:avatar"`
	}

	err := s.db.Table("friendships f").
		Select("f.*, u.nickname, u.username, u.avatar").
		Joins("JOIN users u ON u.id = f.friend_id").
		Where("f.user_id = ?", userID).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	resp := make([]FriendResp, len(rows))
	for i, r := range rows {
		resp[i] = FriendResp{
			UserID:   r.FriendID,
			Username: r.Username,
			Nickname: r.Nickname,
			Avatar:   r.Avatar,
			Remark:   r.Remark,
			Online:   s.isOnline(r.FriendID),
			Blocked:  r.Blocked,
		}
	}
	return resp, nil
}

// ---------- 发送好友请求 ----------

func (s *Service) SendFriendRequest(fromUserID int64, req SendRequestReq) error {
	// 检查目标用户存在
	var count int64
	if err := s.db.Model(&User{}).Where("id = ?", req.ToUserID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return errors.New("用户不存在")
	}

	// 检查是否已是好友
	if s.isFriend(fromUserID, req.ToUserID) {
		return errors.New("已是好友")
	}

	// 检查是否有待处理请求
	var pending int64
	s.db.Model(&FriendRequest{}).
		Where("from_user_id = ? AND to_user_id = ? AND status = 0", fromUserID, req.ToUserID).
		Count(&pending)
	if pending > 0 {
		return errors.New("已有待处理的好友请求")
	}

	fr := FriendRequest{
		FromUserID: fromUserID,
		ToUserID:   req.ToUserID,
		Message:    req.Message,
		Status:     0,
	}
	if err := s.db.Create(&fr).Error; err != nil {
		return err
	}

	if s.notifier != nil {
		if resp, err := s.friendRequestResp(fr); err == nil {
			s.notifier.NotifyUser(req.ToUserID, "friend_request", friendRequestRespToMap(resp))
		}
	}
	return nil
}

// ---------- 处理好友请求 ----------

func (s *Service) HandleFriendRequest(requestID, currentUserID int64, action string) error {
	var fr FriendRequest
	if err := s.db.First(&fr, requestID).Error; err != nil {
		return errors.New("好友请求不存在")
	}
	if fr.ToUserID != currentUserID {
		return errors.New("无权处理该请求")
	}
	if fr.Status != 0 {
		return errors.New("该请求已处理")
	}

	handler, err := s.getUser(currentUserID)
	if err != nil {
		return err
	}

	now := time.Now()
	if action == "reject" {
		if err := s.db.Model(&fr).Updates(map[string]interface{}{
			"status": 2, "handled_at": now,
		}).Error; err != nil {
			return err
		}
		s.notifyFriendRequestResult(fr, handler, "reject", 0)
		return nil
	}

	// accept
	var conversationID int64
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&fr).Updates(map[string]interface{}{
			"status": 1, "handled_at": now,
		}).Error; err != nil {
			return err
		}
		// 双向插入好友关系
		f1 := Friendship{UserID: fr.FromUserID, FriendID: fr.ToUserID}
		f2 := Friendship{UserID: fr.ToUserID, FriendID: fr.FromUserID}
		if err := tx.Create(&f1).Error; err != nil {
			return err
		}
		if err := tx.Create(&f2).Error; err != nil {
			return err
		}
		id, err := s.ensureDM(tx, fr.FromUserID, fr.ToUserID)
		if err != nil {
			return err
		}
		conversationID = id
		return nil
	}); err != nil {
		return err
	}
	s.notifyFriendRequestResult(fr, handler, "accept", conversationID)
	return nil
}

// ---------- 删除好友 ----------

func (s *Service) DeleteFriend(userID, friendID int64) error {
	return s.db.Where(
		"(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userID, friendID, friendID, userID,
	).Delete(&Friendship{}).Error
}

// ---------- 拉黑/取消 ----------

func (s *Service) BlockUser(userID, targetID int64, blocked bool) error {
	return s.db.Model(&Friendship{}).
		Where("user_id = ? AND friend_id = ?", userID, targetID).
		Update("blocked", blocked).Error
}

// ---------- 获取好友请求列表 ----------

func (s *Service) GetFriendRequests(userID int64) ([]FriendRequestResp, error) {
	var rows []struct {
		FriendRequest
		FromUsername string `gorm:"column:from_username"`
		FromNickname string `gorm:"column:from_nickname"`
		FromAvatar   string `gorm:"column:from_avatar"`
	}

	err := s.db.Table("friend_requests fr").
		Select("fr.*, u.username AS from_username, u.nickname AS from_nickname, u.avatar AS from_avatar").
		Joins("JOIN users u ON u.id = fr.from_user_id").
		Where("fr.to_user_id = ?", userID).
		Order("fr.created_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	statusMap := map[int16]string{0: "pending", 1: "accepted", 2: "rejected"}
	resp := make([]FriendRequestResp, len(rows))
	for i, r := range rows {
		resp[i] = FriendRequestResp{
			ID:           r.ID,
			FromUserID:   r.FromUserID,
			FromUsername: r.FromUsername,
			FromNickname: r.FromNickname,
			FromAvatar:   r.FromAvatar,
			Message:      r.Message,
			Status:       statusMap[r.Status],
			CreatedAt:    r.CreatedAt.Format(time.RFC3339),
		}
	}
	return resp, nil
}

// ---------- helpers ----------

func (s *Service) getUser(userID int64) (*User, error) {
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *Service) friendRequestResp(fr FriendRequest) (*FriendRequestResp, error) {
	var from User
	if err := s.db.First(&from, fr.FromUserID).Error; err != nil {
		return nil, err
	}
	statusMap := map[int16]string{0: "pending", 1: "accepted", 2: "rejected"}
	return &FriendRequestResp{
		ID:           fr.ID,
		FromUserID:   fr.FromUserID,
		FromUsername: from.Username,
		FromNickname: from.Nickname,
		FromAvatar:   from.Avatar,
		Message:      fr.Message,
		Status:       statusMap[fr.Status],
		CreatedAt:    fr.CreatedAt.Format(time.RFC3339),
	}, nil
}

func friendRequestRespToMap(resp *FriendRequestResp) map[string]interface{} {
	return map[string]interface{}{
		"id":            resp.ID,
		"from_user_id":  resp.FromUserID,
		"from_username": resp.FromUsername,
		"from_nickname": resp.FromNickname,
		"from_avatar":   resp.FromAvatar,
		"message":       resp.Message,
		"status":        resp.Status,
		"created_at":    resp.CreatedAt,
	}
}

func (s *Service) notifyFriendRequestResult(fr FriendRequest, handler *User, action string, conversationID int64) {
	if s.notifier == nil {
		return
	}
	status := "rejected"
	if action == "accept" {
		status = "accepted"
	}
	data := map[string]interface{}{
		"request_id": fr.ID,
		"action":     action,
		"status":     status,
		"user_id":    handler.ID,
		"username":   handler.Username,
		"nickname":   handler.Nickname,
		"avatar":     handler.Avatar,
	}
	if conversationID > 0 {
		data["conversation_id"] = conversationID
	}
	s.notifier.NotifyUser(fr.FromUserID, "friend_request_result", data)
}

func (s *Service) ensureDM(tx *gorm.DB, userA, userB int64) (int64, error) {
	var existing int64
	err := tx.Raw(`
		SELECT cm1.conversation_id FROM conversation_members cm1
		JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
		JOIN conversations c ON c.id = cm1.conversation_id
		WHERE cm1.user_id = ? AND cm2.user_id = ? AND c.type = 'dm'
		LIMIT 1`, userA, userB).Scan(&existing).Error
	if err != nil || existing != 0 {
		return existing, err
	}

	var conv struct {
		ID   int64  `gorm:"column:id"`
		Type string `gorm:"column:type"`
	}
	conv.Type = "dm"
	if err := tx.Table("conversations").Create(&conv).Error; err != nil {
		return 0, err
	}
	members := []map[string]interface{}{
		{"conversation_id": conv.ID, "user_id": userA, "role": "member"},
		{"conversation_id": conv.ID, "user_id": userB, "role": "member"},
	}
	if err := tx.Table("conversation_members").Create(&members).Error; err != nil {
		return 0, err
	}
	return conv.ID, nil
}

func (s *Service) isOnline(userID int64) bool {
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:online", userID)
	val, err := s.rdb.Exists(ctx, key).Result()
	return err == nil && val > 0
}

func (s *Service) isFriend(a, b int64) bool {
	var count int64
	s.db.Model(&Friendship{}).
		Where("user_id = ? AND friend_id = ?", a, b).
		Count(&count)
	return count > 0
}
