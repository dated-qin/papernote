package user

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

// ---------- GET /api/users/search?q= ----------

func (h *Handler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "搜索关键词不能为空"})
		return
	}

	users, err := h.svc.SearchUsers(q)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "搜索失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0, "message": "ok",
		"data": gin.H{"users": users},
	})
}

// ---------- PATCH /api/users/me ----------

func (h *Handler) UpdateMe(c *gin.Context) {
	userID := getInt64FromCtx(c, "user_id")

	var req UpdateMeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.UpdateMe(userID, req); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- GET /api/friends ----------

func (h *Handler) ListFriends(c *gin.Context) {
	userID := getInt64FromCtx(c, "user_id")

	friends, err := h.svc.GetFriends(userID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取好友列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0, "message": "ok",
		"data": gin.H{"friends": friends},
	})
}

// ---------- POST /api/friends/requests ----------

func (h *Handler) SendRequest(c *gin.Context) {
	userID := getInt64FromCtx(c, "user_id")

	var req SendRequestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.SendFriendRequest(userID, req); err != nil {
		code := 500
		if isConflict(err) {
			code = 409
		}
		c.JSON(http.StatusOK, gin.H{"code": code, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- GET /api/friends/requests (额外，前端需要) ----------

func (h *Handler) ListRequests(c *gin.Context) {
	userID := getInt64FromCtx(c, "user_id")

	requests, err := h.svc.GetFriendRequests(userID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取好友请求失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0, "message": "ok",
		"data": gin.H{"requests": requests},
	})
}

// ---------- PUT /api/friends/requests/:id ----------

func (h *Handler) HandleRequest(c *gin.Context) {
	userID := getInt64FromCtx(c, "user_id")
	requestID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的请求ID"})
		return
	}

	var req HandleRequestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误: action 必须为 accept 或 reject"})
		return
	}

	if err := h.svc.HandleFriendRequest(requestID, userID, req.Action); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- DELETE /api/friends/:user_id ----------

func (h *Handler) DeleteFriend(c *gin.Context) {
	userID := getInt64FromCtx(c, "user_id")
	friendID, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的用户ID"})
		return
	}

	if err := h.svc.DeleteFriend(userID, friendID); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "删除失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- PUT /api/friends/:user_id/block ----------

func (h *Handler) BlockUser(c *gin.Context) {
	userID := getInt64FromCtx(c, "user_id")
	targetID, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的用户ID"})
		return
	}

	var req BlockReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.BlockUser(userID, targetID, req.Blocked); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "操作失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- helper ----------

func getInt64FromCtx(c *gin.Context, key string) int64 {
	val, _ := c.Get(key)
	id, _ := strconv.ParseInt(val.(string), 10, 64)
	return id
}

func isConflict(err error) bool {
	msg := err.Error()
	return msg == "已是好友" || msg == "已有待处理的好友请求" || msg == "用户不存在"
}
