package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Hub 管理所有 WebSocket 连接
type Hub struct {
	clients    map[int64]map[*Client]bool // userId → 多设备连接
	register   chan *Client
	unregister chan *Client
	db         *gorm.DB
	rdb        *redis.Client
	jwtSecret  string
	msgSender  MessageSender
}

func NewHub(db *gorm.DB, rdb *redis.Client, jwtSecret string, msgSender MessageSender) *Hub {
	return &Hub{
		clients:    make(map[int64]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		db:         db,
		rdb:        rdb,
		jwtSecret:  jwtSecret,
		msgSender:  msgSender,
	}
}

// Run 启动 Hub 主循环
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.handleRegister(client)

		case client := <-h.unregister:
			h.handleUnregister(client)
		}
	}
}

// ---------- HTTP 升级 ----------

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}

	userID, username, err := h.parseJWT(tokenStr)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:      h,
		conn:     conn,
		send:     make(chan []byte, 256),
		userID:   userID,
		username: username,
		deviceID: r.Header.Get("User-Agent"),
	}

	h.register <- client

	go client.writePump()
	go client.readPump()
}

// ---------- 注册/注销 ----------

func (h *Hub) handleRegister(c *Client) {
	if h.clients[c.userID] == nil {
		h.clients[c.userID] = make(map[*Client]bool)
	}
	h.clients[c.userID][c] = true

	// Redis: 记录在线 + 连接设备
	ctx := context.Background()
	h.rdb.Set(ctx, fmt.Sprintf("user:%d:online", c.userID), "1", 60*time.Second)
	h.rdb.SAdd(ctx, fmt.Sprintf("user:%d:ws_conns", c.userID), c.deviceID)

	// 广播上线
	h.broadcastOnlineStatus(c.userID, true)

	log.Printf("ws: user %d connected (%d devices)", c.userID, len(h.clients[c.userID]))
}

func (h *Hub) handleUnregister(c *Client) {
	if clients, ok := h.clients[c.userID]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.clients, c.userID)
		}
	}

	close(c.send)

	// Redis: 移除设备连接
	ctx := context.Background()
	h.rdb.SRem(ctx, fmt.Sprintf("user:%d:ws_conns", c.userID), c.deviceID)

	// 所有设备离线才广播 offline
	count := h.rdb.SCard(ctx, fmt.Sprintf("user:%d:ws_conns", c.userID)).Val()
	if count == 0 {
		h.rdb.Del(ctx, fmt.Sprintf("user:%d:online", c.userID))
		h.broadcastOnlineStatus(c.userID, false)
	}

	log.Printf("ws: user %d disconnected (%d devices left)", c.userID, count)
}

// ---------- 消息路由 ----------

func (h *Hub) routeMessage(c *Client, env Envelope) {
	switch env.Action {
	case "ping":
		c.sendJSON(Envelope{Action: "pong"})

	case "send_msg":
		h.handleSendMsg(c, env)

	case "ack_read":
		h.handleAckRead(c, env)

	case "typing":
		h.handleTyping(c, env)

	case "sync_history":
		h.handleSyncHistory(c, env)

	case "reaction":
		h.handleReaction(c, env)

	default:
		c.sendJSON(Envelope{Action: "error", Data: map[string]interface{}{
			"message": "unknown action: " + env.Action,
		}})
	}
}

// ---------- send_msg 处理 ----------

func (h *Hub) handleSendMsg(c *Client, env Envelope) {
	// 频率限制: 5 msg/s
	if !h.checkRateLimit(c.userID) {
		c.sendJSON(Envelope{Action: "error", Data: map[string]interface{}{
			"message": "发送过于频繁，请稍后再试",
		}})
		return
	}

	data := env.Data
	convID := getInt64(data, "conversation_id")
	msgType := int16(getInt64(data, "msg_type"))
	content := getString(data, "content")
	clientMsgID := getString(data, "client_msg_id")
	mentionIDs := normalizeMentionIDs(data["mention_ids"])

	// 校验会话成员
	if !h.isMember(convID, c.userID) {
		c.sendJSON(Envelope{Action: "error", Data: map[string]interface{}{
			"message": "你不是该会话的成员",
		}})
		return
	}

	// 校验禁言
	if h.isMuted(convID, c.userID) {
		c.sendJSON(Envelope{Action: "error", Data: map[string]interface{}{
			"message": "你已被禁言",
		}})
		return
	}

	if containsMentionAll(mentionIDs) {
		if h.conversationType(convID) != "channel" || !h.hasRole(convID, c.userID, "owner", "admin") {
			c.sendJSON(Envelope{Action: "error", Data: map[string]interface{}{
				"message": "只有群主或管理员可以 @所有人",
			}})
			return
		}
	}

	msgID, _, err := h.msgSender.SendMessage(c.userID, SendMsgData{
		ConversationID: convID,
		MsgType:        msgType,
		Content:        content,
		ReplyTo:        int64Ptr(data, "reply_to"),
		ThreadRootID:   int64Ptr(data, "thread_root_id"),
		FileID:         int64Ptr(data, "file_id"),
		MentionIDs:     mentionIDs,
	})
	if err != nil {
		c.sendJSON(Envelope{Action: "error", Data: map[string]interface{}{
			"message": err.Error(),
		}})
		return
	}

	// 分配 seq + 入队
	seq := h.rdb.Incr(context.Background(), fmt.Sprintf("user:%d:msg_seq", c.userID)).Val()

	// 广播给会话所有在线成员
	h.broadcastToConversation(convID, Envelope{
		Action: "new_msg",
		Seq:    seq,
		Data: map[string]interface{}{
			"id":              msgID,
			"message_id":      msgID,
			"client_msg_id":   clientMsgID,
			"conversation_id": convID,
			"sender_id":       c.userID,
			"msg_type":        msgType,
			"content":         content,
			"reply_to":        int64Ptr(data, "reply_to"),
			"thread_root_id":  int64Ptr(data, "thread_root_id"),
			"mention_ids":     mentionIDs,
			"created_at":      time.Now().Format(time.RFC3339),
		},
	})

	// 回复发送者确认
	c.sendJSON(Envelope{Action: "msg_ack", Data: map[string]interface{}{
		"message_id": msgID, "client_msg_id": clientMsgID, "seq": seq,
	}})
}

// ---------- ack_read 处理 ----------

func (h *Hub) handleAckRead(c *Client, env Envelope) {
	convID := getInt64(env.Data, "conversation_id")
	lastMsgID := getInt64(env.Data, "last_msg_id")

	h.db.Table("conversation_members").
		Where("conversation_id = ? AND user_id = ?", convID, c.userID).
		Updates(map[string]interface{}{
			"unread_count":     0,
			"last_read_msg_id": lastMsgID,
		})
}

// ---------- typing 处理 ----------

func (h *Hub) handleTyping(c *Client, env Envelope) {
	convID := getInt64(env.Data, "conversation_id")
	h.broadcastToConversation(convID, Envelope{
		Action: "typing",
		Data: map[string]interface{}{
			"conversation_id": convID,
			"user_id":         c.userID,
			"status":          env.Data["status"],
		},
	}, c.userID) // 排除自己
}

// ---------- sync_history 处理 ----------

func (h *Hub) handleSyncHistory(c *Client, env Envelope) {
	lastSeq := getInt64(env.Data, "last_seq")

	ctx := context.Background()
	queueKey := fmt.Sprintf("user:%d:msg_queue", c.userID)
	entries := h.rdb.LRange(ctx, queueKey, int64(lastSeq+1), -1).Val()

	var messages []map[string]interface{}
	for _, entry := range entries {
		var m map[string]interface{}
		if json.Unmarshal([]byte(entry), &m) == nil {
			messages = append(messages, m)
		}
	}

	currentSeq := h.rdb.Get(ctx, fmt.Sprintf("user:%d:msg_seq", c.userID)).Val()
	lastSeqI, _ := strconv.ParseInt(currentSeq, 10, 64)

	c.sendJSON(Envelope{Action: "sync_result", Data: map[string]interface{}{
		"messages": messages,
		"last_seq": lastSeqI,
	}})
}

// ---------- reaction 处理 ----------

func (h *Hub) handleReaction(c *Client, env Envelope) {
	data := env.Data
	msgID := getInt64(data, "message_id")
	emoji := getString(data, "emoji")
	action := getString(data, "action") // "add" | "remove"
	if msgID == 0 || emoji == "" || (action != "add" && action != "remove") {
		c.sendJSON(Envelope{Action: "error", Data: map[string]interface{}{
			"message": "参数错误",
		}})
		return
	}

	// 获取消息的会话 ID 并校验成员身份
	var convID int64
	if err := h.db.Table("messages m").
		Select("m.conversation_id").
		Joins("JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = ?", c.userID).
		Where("m.id = ?", msgID).
		Pluck("conversation_id", &convID).Error; err != nil || convID == 0 {
		c.sendJSON(Envelope{Action: "error", Data: map[string]interface{}{
			"message": "消息不存在或无权操作",
		}})
		return
	}

	if action == "add" {
		h.db.Exec(`INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?) ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
			msgID, c.userID, emoji)
	} else {
		h.db.Where("message_id = ? AND user_id = ? AND emoji = ?", msgID, c.userID, emoji).
			Delete(&MessageReaction{})
	}

	// 查询更新后的 reactions
	reactions := h.getReactions(msgID)

	// 广播给会话所有成员
	h.broadcastToConversation(convID, Envelope{
		Action: "reaction_updated",
		Data: map[string]interface{}{
			"message_id": msgID,
			"reactions":  reactions,
		},
	})
}

type MessageReaction struct {
	ID        int64  `gorm:"primaryKey;column:id"`
	MessageID int64  `gorm:"column:message_id"`
	UserID    int64  `gorm:"column:user_id"`
	Emoji     string `gorm:"column:emoji"`
}

func (MessageReaction) TableName() string { return "message_reactions" }

func (h *Hub) getReactions(msgID int64) []map[string]interface{} {
	type row struct {
		Emoji  string `gorm:"column:emoji"`
		UserID int64  `gorm:"column:user_id"`
	}
	var rows []row
	h.db.Table("message_reactions").
		Select("emoji, user_id").
		Where("message_id = ?", msgID).
		Order("created_at ASC").
		Find(&rows)

	m := make(map[string][]int64)
	for _, r := range rows {
		m[r.Emoji] = append(m[r.Emoji], r.UserID)
	}
	reactions := make([]map[string]interface{}, 0, len(m))
	for _, emoji := range []string{"👍", "❤️", "😂", "😮", "😢", "🙏"} {
		if ids, ok := m[emoji]; ok {
			reactions = append(reactions, map[string]interface{}{"emoji": emoji, "user_ids": ids})
		}
	}
	for emoji, ids := range m {
		found := false
		for _, r := range reactions {
			if r["emoji"] == emoji {
				found = true
				break
			}
		}
		if !found {
			reactions = append(reactions, map[string]interface{}{"emoji": emoji, "user_ids": ids})
		}
	}
	return reactions
}

// ---------- 广播 ----------

func (h *Hub) SendToUser(userID int64, env Envelope) {
	data, _ := json.Marshal(env)
	for client := range h.clients[userID] {
		select {
		case client.send <- data:
		default:
		}
	}
}

func (h *Hub) BroadcastToConversation(convID int64, env Envelope, excludeUserIDs ...int64) {
	h.broadcastToConversation(convID, env, excludeUserIDs...)
}

func (h *Hub) broadcastToConversation(convID int64, env Envelope, excludeUserIDs ...int64) {
	// 查会话所有成员
	var memberIDs []int64
	h.db.Table("conversation_members").
		Select("user_id").
		Where("conversation_id = ?", convID).
		Pluck("user_id", &memberIDs)

	exclude := make(map[int64]bool)
	for _, id := range excludeUserIDs {
		exclude[id] = true
	}

	for _, uid := range memberIDs {
		if exclude[uid] {
			continue
		}
		h.SendToUser(uid, env)
	}
}

func (h *Hub) broadcastOnlineStatus(userID int64, online bool) {
	// 查 userID 的所有好友
	var friendIDs []int64
	h.db.Table("friendships").
		Select("friend_id").
		Where("user_id = ?", userID).
		Pluck("friend_id", &friendIDs)

	for _, fid := range friendIDs {
		if h.clients[fid] != nil && len(h.clients[fid]) > 0 {
			h.SendToUser(fid, Envelope{
				Action: "user_online",
				Data: map[string]interface{}{
					"user_id": userID,
					"online":  online,
				},
			})
		}
	}
}

// ---------- helpers ----------

func (h *Hub) parseJWT(tokenStr string) (int64, string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return 0, "", err
	}
	claims := token.Claims.(jwt.MapClaims)
	userID, _ := strconv.ParseInt(claims["sub"].(string), 10, 64)
	username, _ := claims["username"].(string)
	return userID, username, nil
}

func (h *Hub) renewOnline(userID int64) {
	ctx := context.Background()
	h.rdb.Expire(ctx, fmt.Sprintf("user:%d:online", userID), 60*time.Second)
}

func (h *Hub) isMember(convID, userID int64) bool {
	var count int64
	h.db.Table("conversation_members").
		Where("conversation_id = ? AND user_id = ?", convID, userID).
		Count(&count)
	return count > 0
}

func (h *Hub) isMuted(convID, userID int64) bool {
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:muted:%d", userID, convID)
	exists, _ := h.rdb.Exists(ctx, key).Result()
	return exists > 0
}

func (h *Hub) conversationType(convID int64) string {
	var convType string
	h.db.Table("conversations").Select("type").Where("id = ?", convID).Scan(&convType)
	return convType
}

func (h *Hub) hasRole(convID, userID int64, roles ...string) bool {
	var role string
	h.db.Table("conversation_members").
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

func (h *Hub) checkRateLimit(userID int64) bool {
	ctx := context.Background()
	key := fmt.Sprintf("ratelimit:ws:%d", userID)
	count, _ := h.rdb.Incr(ctx, key).Result()
	if count == 1 {
		h.rdb.Expire(ctx, key, 1*time.Second)
	}
	return count <= 5
}

// ---------- JSON helper ----------

func getInt64(m map[string]interface{}, key string) int64 {
	v, _ := m[key]
	switch n := v.(type) {
	case float64:
		return int64(n)
	case int64:
		return n
	case string:
		i, _ := strconv.ParseInt(n, 10, 64)
		return i
	}
	return 0
}

func getString(m map[string]interface{}, key string) string {
	v, _ := m[key]
	s, _ := v.(string)
	return s
}

func int64Ptr(m map[string]interface{}, key string) *int64 {
	v, ok := m[key]
	if !ok || v == nil {
		return nil
	}
	n := getInt64(m, key)
	if n == 0 {
		return nil
	}
	return &n
}

func normalizeMentionIDs(v interface{}) []string {
	raw, ok := v.([]interface{})
	if !ok {
		return nil
	}
	seen := make(map[string]struct{}, len(raw))
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		id := ""
		switch x := item.(type) {
		case string:
			id = x
		case float64:
			id = strconv.FormatInt(int64(x), 10)
		}
		if id == "" {
			continue
		}
		if id != "all" {
			if n, err := strconv.ParseInt(id, 10, 64); err != nil || n <= 0 {
				continue
			}
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func containsMentionAll(ids []string) bool {
	for _, id := range ids {
		if id == "all" {
			return true
		}
	}
	return false
}
