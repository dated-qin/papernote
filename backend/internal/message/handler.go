package message

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	svc      *Service
	notifier MessageNotifier
}

type MessageNotifier interface {
	NotifyConversation(convID int64, action string, data map[string]interface{})
}

func NewHandler(svc *Service, notifier ...MessageNotifier) *Handler {
	h := &Handler{svc: svc}
	if len(notifier) > 0 {
		h.notifier = notifier[0]
	}
	return h
}

func userID(c *gin.Context) int64 {
	val, _ := c.Get("user_id")
	id, _ := strconv.ParseInt(val.(string), 10, 64)
	return id
}

// ---------- GET /api/conversations/:id/messages ----------

func (h *Handler) GetHistory(c *gin.Context) {
	convID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的会话ID"})
		return
	}

	var q HistoryQuery
	c.ShouldBindQuery(&q)

	msgs, err := h.svc.GetHistory(convID, q)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取历史消息失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"messages": msgs}})
}

// ---------- GET /api/messages/:id ----------

func (h *Handler) Get(c *gin.Context) {
	msgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的消息ID"})
		return
	}

	msg, err := h.svc.GetMessage(userID(c), msgID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"message": nil}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取消息失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"message": msg}})
}

// ---------- PUT /api/messages/:id/recall ----------

func (h *Handler) Recall(c *gin.Context) {
	uid := userID(c)
	msgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的消息ID"})
		return
	}

	if err := h.svc.RecallMessage(uid, msgID); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": err.Error()})
		return
	}

	// 广播撤回状态给会话所有成员
	if h.notifier != nil {
		convID := h.svc.GetConversationID(msgID)
		if convID > 0 {
			h.notifier.NotifyConversation(convID, "msg_status", map[string]interface{}{
				"message_id":      msgID,
				"conversation_id": convID,
				"status":          1,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- GET /api/messages/search ----------

func (h *Handler) Search(c *gin.Context) {
	var q SearchQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "搜索关键词不能为空"})
		return
	}

	msgs, err := h.svc.SearchMessages(userID(c), q)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "搜索失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"messages": msgs}})
}

// ---------- GET /api/messages/:id/thread ----------

func (h *Handler) GetThread(c *gin.Context) {
	msgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的消息ID"})
		return
	}

	var q ThreadQuery
	c.ShouldBindQuery(&q)

	msgs, err := h.svc.GetThreadMessages(msgID, q)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取线程消息失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"messages": msgs}})
}

// ---------- POST /api/messages/:id/reactions ----------

func (h *Handler) AddReaction(c *gin.Context) {
	uid := userID(c)
	msgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的消息ID"})
		return
	}

	var req struct {
		Emoji string `json:"emoji"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Emoji == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "缺少 emoji 参数"})
		return
	}

	reactions, err := h.svc.AddReaction(uid, msgID, req.Emoji)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"reactions": reactions}})
}

// ---------- DELETE /api/messages/:id/reactions/:emoji ----------

func (h *Handler) RemoveReaction(c *gin.Context) {
	uid := userID(c)
	msgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的消息ID"})
		return
	}

	emoji := c.Param("emoji")
	if emoji == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "缺少 emoji 参数"})
		return
	}

	reactions, err := h.svc.RemoveReaction(uid, msgID, emoji)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"reactions": reactions}})
}
