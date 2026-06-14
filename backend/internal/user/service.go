package user

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

// ---------- 搜索用户 ----------

func (s *Service) SearchUsers(query string) ([]SearchUserResp, error) {
	var users []User
	if err := s.db.Where("username LIKE ? OR nickname LIKE ?",
		"%"+query+"%", "%"+query+"%").
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
	if req.Nickname != "" {
		updates["nickname"] = req.Nickname
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.Email != "" {
		updates["email"] = req.Email
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
	return s.db.Create(&fr).Error
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

	now := time.Now()
	if action == "reject" {
		return s.db.Model(&fr).Updates(map[string]interface{}{
			"status": 2, "handled_at": now,
		}).Error
	}

	// accept
	return s.db.Transaction(func(tx *gorm.DB) error {
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
		return tx.Create(&f2).Error
	})
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
