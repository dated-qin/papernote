package admin

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

func adminID(c *gin.Context) int64 {
	val, _ := c.Get("user_id")
	id, _ := strconv.ParseInt(val.(string), 10, 64)
	return id
}

// ---------- GET /api/admin/dashboard ----------

func (h *Handler) Dashboard(c *gin.Context) {
	data, err := h.svc.GetDashboard()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取数据面板失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": data})
}

// ---------- GET /api/admin/users ----------

func (h *Handler) ListUsers(c *gin.Context) {
	var q UserListQuery
	c.ShouldBindQuery(&q)

	users, total, err := h.svc.ListUsers(q)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取用户列表失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{
		"users": users, "total": total,
	}})
}

// ---------- GET /api/admin/users/:id ----------

func (h *Handler) GetUserDetail(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	user, err := h.svc.GetUserDetail(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 404, "message": "用户不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": user})
}

// ---------- PUT /api/admin/users/:id/ban ----------

func (h *Handler) BanUser(c *gin.Context) {
	aid := adminID(c)
	uid, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req BanReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.BanUser(aid, uid, req.Banned); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "操作失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- GET /api/admin/groups ----------

func (h *Handler) ListGroups(c *gin.Context) {
	var q GroupListQuery
	c.ShouldBindQuery(&q)

	groups, total, err := h.svc.ListGroups(q)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取群组列表失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{
		"groups": groups, "total": total,
	}})
}

// ---------- DELETE /api/admin/groups/:id ----------

func (h *Handler) DeleteGroup(c *gin.Context) {
	aid := adminID(c)
	gid, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	if err := h.svc.DeleteGroup(aid, gid); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "解散失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- PUT /api/admin/messages/:id/force-recall ----------

func (h *Handler) ForceRecall(c *gin.Context) {
	aid := adminID(c)
	mid, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req ForceRecallReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.ForceRecall(aid, mid, req.Reason); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "操作失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- GET /api/admin/logs ----------

func (h *Handler) ListLogs(c *gin.Context) {
	var q LogQuery
	c.ShouldBindQuery(&q)

	logs, total, err := h.svc.ListLogs(q)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取操作日志失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{
		"logs": logs, "total": total,
	}})
}
