package conversation

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func getInt64(c *gin.Context, key string) int64 {
	val, _ := c.Get(key)
	id, _ := strconv.ParseInt(val.(string), 10, 64)
	return id
}

func paramInt64(c *gin.Context, name string) (int64, error) {
	return strconv.ParseInt(c.Param(name), 10, 64)
}

// ---------- GET /api/conversations ----------

func (h *Handler) List(c *gin.Context) {
	userID := getInt64(c, "user_id")
	var q ListQuery
	c.ShouldBindQuery(&q)

	items, err := h.svc.List(userID, q)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取会话列表失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"conversations": items}})
}

// ---------- POST /api/conversations/dm ----------

func (h *Handler) CreateDM(c *gin.Context) {
	userID := getInt64(c, "user_id")
	var req CreateDMReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	id, err := h.svc.CreateDM(userID, req.UserID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"id": id}})
}

// ---------- POST /api/conversations/channel ----------

func (h *Handler) CreateChannel(c *gin.Context) {
	userID := getInt64(c, "user_id")
	var req CreateChannelReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误: " + err.Error()})
		return
	}

	conv, err := h.svc.CreateChannel(userID, req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": conv})
}

// ---------- GET /api/conversations/:id ----------

func (h *Handler) GetDetail(c *gin.Context) {
	userID := getInt64(c, "user_id")
	convID, err := paramInt64(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的会话ID"})
		return
	}

	detail, members, err := h.svc.GetDetail(userID, convID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 403, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{
		"conversation": detail, "members": members,
	}})
}

// ---------- PATCH /api/conversations/:id ----------

func (h *Handler) UpdateGroup(c *gin.Context) {
	userID := getInt64(c, "user_id")
	convID, err := paramInt64(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的会话ID"})
		return
	}

	var req UpdateGroupReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.UpdateGroup(userID, convID, req); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 403, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- DELETE /api/conversations/:id ----------

func (h *Handler) DeleteGroup(c *gin.Context) {
	userID := getInt64(c, "user_id")
	convID, err := paramInt64(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的会话ID"})
		return
	}

	if err := h.svc.DeleteGroup(userID, convID); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 403, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- GET /api/conversations/:id/members ----------

func (h *Handler) GetMembers(c *gin.Context) {
	userID := getInt64(c, "user_id")
	convID, err := paramInt64(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的会话ID"})
		return
	}

	if !h.svc.isMember(convID, userID) {
		c.JSON(http.StatusOK, gin.H{"code": 403, "message": "非会话成员"})
		return
	}

	members, err := h.svc.GetMembers(convID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取成员列表失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"members": members}})
}

// ---------- PUT /api/conversations/:id/members/:user_id ----------

func (h *Handler) ManageMember(c *gin.Context) {
	userID := getInt64(c, "user_id")
	convID, _ := paramInt64(c, "id")
	targetID, _ := paramInt64(c, "user_id")

	var req ManageMemberReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.ManageMember(userID, convID, targetID, req); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 403, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- POST /api/conversations/:id/members ----------

func (h *Handler) InviteMembers(c *gin.Context) {
	convID, err := paramInt64(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的会话ID"})
		return
	}

	var req InviteReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.InviteMembers(convID, req.UserIDs); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}
