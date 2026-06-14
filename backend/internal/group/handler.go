package group

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

func uid(c *gin.Context) int64 {
	val, _ := c.Get("user_id")
	id, _ := strconv.ParseInt(val.(string), 10, 64)
	return id
}

func pid(c *gin.Context, name string) int64 {
	id, _ := strconv.ParseInt(c.Param(name), 10, 64)
	return id
}

// ---------- GET /api/conversations/:id/announcements ----------

func (h *Handler) ListAnnouncements(c *gin.Context) {
	convID := pid(c, "id")

	list, err := h.svc.GetAnnouncements(convID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "获取公告失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": gin.H{"announcements": list}})
}

// ---------- POST /api/conversations/:id/announcements ----------

func (h *Handler) PublishAnnouncement(c *gin.Context) {
	userID := uid(c)
	convID := pid(c, "id")

	var req CreateAnnReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "公告内容不能为空"})
		return
	}

	ann, err := h.svc.PublishAnnouncement(userID, convID, req.Content)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 403, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": ann})
}

// ---------- PUT /api/conversations/:id/announcements/:aid ----------

func (h *Handler) UpdateAnnouncement(c *gin.Context) {
	userID := uid(c)
	annID := pid(c, "aid")

	var req UpdateAnnReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "公告内容不能为空"})
		return
	}

	if err := h.svc.UpdateAnnouncement(userID, annID, req.Content); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 403, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- POST /api/conversations/:id/announcements/:aid/read ----------

func (h *Handler) MarkRead(c *gin.Context) {
	userID := uid(c)
	annID := pid(c, "aid")

	if err := h.svc.MarkAnnouncementRead(userID, annID); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "标记已读失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}
