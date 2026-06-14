package file

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

func getUID(c *gin.Context) int64 {
	val, _ := c.Get("user_id")
	id, _ := strconv.ParseInt(val.(string), 10, 64)
	return id
}

// ---------- POST /api/files/upload-token ----------

func (h *Handler) GetUploadToken(c *gin.Context) {
	userID := getUID(c)

	var req UploadTokenReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误: " + err.Error()})
		return
	}

	resp, err := h.svc.GetUploadToken(userID, req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": resp})
}

// ---------- POST /api/files/upload-callback ----------

func (h *Handler) UploadCallback(c *gin.Context) {
	userID := getUID(c)

	var req UploadCallbackReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误: " + err.Error()})
		return
	}

	resp, err := h.svc.UploadCallback(userID, req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 500, "message": "上传回调失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": resp})
}

// ---------- GET /api/files/:id/url ----------

func (h *Handler) GetFileURL(c *gin.Context) {
	fileID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的文件ID"})
		return
	}

	resp, err := h.svc.GetFileURL(fileID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": resp})
}
