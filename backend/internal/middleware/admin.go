package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Admin 校验当前用户角色是否为 admin，非 admin 返回 403
// 必须在 Auth 中间件之后使用
func Admin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "无权限：需要管理员角色",
			})
			return
		}
		c.Next()
	}
}
