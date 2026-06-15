package auth

import (
	"errors"
	"net/http"
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

// ---------- POST /api/auth/register ----------

func (h *Handler) Register(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	resp, err := h.svc.Register(req)
	if err != nil {
		code := 500
		if isConflict(err) {
			code = 409
		}
		c.JSON(http.StatusOK, gin.H{
			"code":    code,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    resp,
	})
}

// ---------- POST /api/auth/login ----------

func (h *Handler) Login(c *gin.Context) {
	// 限流
	ip := c.ClientIP()
	if !h.svc.CheckLoginRateLimit(ip) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"code":    429,
			"message": "登录尝试过于频繁，请1分钟后再试",
		})
		return
	}

	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	resp, err := h.svc.Login(req)
	if err != nil {
		code := 401
		msg := err.Error()
		if strings.Contains(msg, "封禁") {
			code = 403
		} else if strings.Contains(msg, "不存在") || strings.Contains(msg, "密码") {
			code = 401
		}
		c.JSON(http.StatusOK, gin.H{
			"code":    code,
			"message": msg,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    resp,
	})
}

// ---------- GET /api/auth/me ----------

func (h *Handler) Me(c *gin.Context) {
	userIDStr, _ := c.Get("user_id")
	userID, err := strconv.ParseInt(userIDStr.(string), 10, 64)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "无法解析用户身份",
		})
		return
	}

	resp, err := h.svc.GetMe(userID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code":    404,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    resp,
	})
}

// ---------- PUT /api/auth/password ----------

func (h *Handler) ChangePassword(c *gin.Context) {
	userIDStr, _ := c.Get("user_id")
	userID, err := strconv.ParseInt(userIDStr.(string), 10, 64)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "无法解析用户身份",
		})
		return
	}

	var req ChangePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	if err := h.svc.ChangePassword(userID, req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code":    400,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok"})
}

// ---------- POST /api/auth/refresh ----------

func (h *Handler) RefreshToken(c *gin.Context) {
	var req RefreshReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	resp, err := h.svc.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 40101, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": resp})
}

// ---------- POST /api/auth/send-code ----------

func (h *Handler) SendCode(c *gin.Context) {
	var req SendCodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请填写手机号或邮箱"})
		return
	}

	if err := h.svc.SendResetCode(req.Target); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "验证码已发送"})
}

// ---------- POST /api/auth/verify-code ----------

func (h *Handler) VerifyCode(c *gin.Context) {
	var req VerifyCodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.VerifyResetCode(req.Target, req.Code); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "验证通过"})
}

// ---------- POST /api/auth/reset-password ----------

func (h *Handler) ResetPassword(c *gin.Context) {
	var req ResetPasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if err := h.svc.ResetPassword(req.Target, req.Code, req.NewPassword); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "密码重置成功，请登录"})
}

// ---------- helper ----------

func isConflict(err error) bool {
	msg := err.Error()
	return strings.Contains(msg, "已被注册") ||
		strings.Contains(msg, "至少填一项") ||
		strings.Contains(msg, "格式不正确") ||
		errors.Is(err, errors.New("手机号或邮箱至少填一项"))
}
