package file

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

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

// ---------- POST /api/files/local-upload ----------

func (h *Handler) LocalUpload(c *gin.Context) {
	key := c.PostForm("key")
	token := c.PostForm("token")
	if key == "" || token != "local-dev-token-"+key {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的本地上传凭证"})
		return
	}

	safeKey, ok := safeLocalKey(key)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的文件路径"})
		return
	}

	src, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "缺少上传文件"})
		return
	}

	dst := filepath.Join("uploads", safeKey)
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "创建目录失败"})
		return
	}
	if err := c.SaveUploadedFile(src, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "保存文件失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- GET /api/files/local/*key ----------

func (h *Handler) ServeLocal(c *gin.Context) {
	key := strings.TrimPrefix(c.Param("key"), "/")
	safeKey, ok := safeLocalKey(key)
	if !ok {
		c.Status(http.StatusBadRequest)
		return
	}
	c.File(filepath.Join("uploads", safeKey))
}

// ---------- GET /api/files/:id/url ----------

func (h *Handler) GetFileURL(c *gin.Context) {
	fileID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的文件ID"})
		return
	}

	// 支持 ?expire=N 参数控制过期时间（秒）
	expireSec := int64(3600)
	if s := c.Query("expire"); s != "" {
		if n, err := strconv.ParseInt(s, 10, 64); err == nil && n > 0 && n <= 86400 {
			expireSec = n
		}
	}

	url, err := h.svc.GetFileRawURL(fileID, expireSec)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.Redirect(http.StatusFound, url)
}

// ---------- GET /api/files/:id/thumbnail ----------

func (h *Handler) GetThumbnail(c *gin.Context) {
	fileID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的文件ID"})
		return
	}

	url, err := h.svc.GetFileRawURL(fileID, 3600)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.Redirect(http.StatusFound, url)
}

func safeLocalKey(key string) (string, bool) {
	clean := filepath.Clean(filepath.FromSlash(key))
	if clean == "." || filepath.IsAbs(clean) || strings.HasPrefix(clean, ".."+string(filepath.Separator)) || clean == ".." {
		return "", false
	}
	return clean, true
}
