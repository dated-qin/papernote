// Package main 纸条 PaperNote 后端服务入口
// 启动 HTTP API (:8080) + WebSocket (:8081)
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/papernote/backend/internal/admin"
	"github.com/papernote/backend/internal/auth"
	"github.com/papernote/backend/internal/conversation"
	"github.com/papernote/backend/internal/file"
	"github.com/papernote/backend/internal/group"
	"github.com/papernote/backend/internal/message"
	"github.com/papernote/backend/internal/middleware"
	"github.com/papernote/backend/internal/user"
	"github.com/papernote/backend/internal/ws"
	"github.com/papernote/backend/pkg/config"
	"github.com/papernote/backend/pkg/db"
	"github.com/papernote/backend/pkg/redis"
)

func main() {
	// ---------- 加载配置 ----------
	cfg := config.Load()

	// ---------- 初始化数据库 ----------
	database := db.Connect(cfg)
	sqlDB, _ := database.DB()
	defer sqlDB.Close()

	// ---------- 初始化 Redis ----------
	rdb := redis.Connect(cfg)
	defer rdb.Close()

	// ---------- 初始化服务 ----------
	authSvc := auth.NewService(database, rdb, auth.AuthConfig{
		JWTSecret:      cfg.JWTSecret,
		JWTExpireHours: cfg.JWTExpireHours,
	})
	authHandler := auth.NewHandler(authSvc)

	convSvc := conversation.NewService(database)
	convHandler := conversation.NewHandler(convSvc)

	msgSvc := message.NewService(database, rdb)

	var ossClient file.OSSClient
	if cfg.OSSAccessKey != "" && cfg.OSSSecretKey != "" {
		ossClient = file.NewQiniuOSS(cfg.OSSAccessKey, cfg.OSSSecretKey, cfg.OSSBucket, cfg.OSSEndpoint)
	} else {
		ossClient = file.NewLocalOSS()
	}
	fileSvc := file.NewService(database, ossClient)
	fileHandler := file.NewHandler(fileSvc)

	// WS 消息发送适配器：将 message.Service 适配为 ws.MessageSender 接口
	msgSender := &wsMsgSender{svc: msgSvc}

	// ---------- WebSocket Hub ----------
	hub := ws.NewHub(database, rdb, cfg.JWTSecret, msgSender)
	go hub.Run()
	msgHandler := message.NewHandler(msgSvc, &wsMsgNotifier{hub: hub})

	groupSvc := group.NewService(database, rdb, &wsGroupNotifier{hub: hub})
	groupHandler := group.NewHandler(groupSvc)

	userSvc := user.NewService(database, rdb, &wsUserNotifier{hub: hub})
	userHandler := user.NewHandler(userSvc)

	adminSvc := admin.NewService(database, rdb)
	adminHandler := admin.NewHandler(adminSvc)

	// ---------- 初始化 Gin ----------
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(middleware.CORS())
	r.POST("/api/files/local-upload", fileHandler.LocalUpload)
	r.GET("/api/files/local/*key", fileHandler.ServeLocal)

	// ===================== 公开路由 =====================
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
			authGroup.POST("/send-code", authHandler.SendCode)
			authGroup.POST("/verify-code", authHandler.VerifyCode)
			authGroup.POST("/reset-password", authHandler.ResetPassword)
			authGroup.POST("/refresh", authHandler.RefreshToken)
	}

	// ===================== 需认证路由 =====================
	api := r.Group("/api")
	api.Use(middleware.Auth(cfg.JWTSecret))
	{
		api.GET("/auth/me", authHandler.Me)
		api.PUT("/auth/password", authHandler.ChangePassword)

		// 用户 & 好友
		users := api.Group("/users")
		{
			users.GET("/search", userHandler.Search)
			users.PATCH("/me", userHandler.UpdateMe)
				users.GET("/me/devices", userHandler.GetDevices)
				users.DELETE("/me/devices/:device_id", userHandler.KickDevice)
		}
		friends := api.Group("/friends")
		{
			friends.GET("", userHandler.ListFriends)
			friends.GET("/requests", userHandler.ListRequests)
			friends.POST("/requests", userHandler.SendRequest)
			friends.PUT("/requests/:id", userHandler.HandleRequest)
			friends.DELETE("/:user_id", userHandler.DeleteFriend)
			friends.PUT("/:user_id/block", userHandler.BlockUser)
		}

		// 会话
		conversations := api.Group("/conversations")
		{
			conversations.GET("", convHandler.List)
			conversations.POST("/dm", convHandler.CreateDM)
			conversations.POST("/channel", convHandler.CreateChannel)
			conversations.GET("/:id", convHandler.GetDetail)
			conversations.PUT("/:id/pin", convHandler.TogglePin)
			conversations.PUT("/:id/mute", convHandler.ToggleMute)
			conversations.PATCH("/:id", convHandler.UpdateGroup)
			conversations.DELETE("/:id", convHandler.DeleteGroup)
			conversations.GET("/:id/members", convHandler.GetMembers)
			conversations.PUT("/:id/members/:user_id", convHandler.ManageMember)
			conversations.POST("/:id/members", convHandler.InviteMembers)
			conversations.GET("/:id/announcements", groupHandler.ListAnnouncements)
			conversations.POST("/:id/announcements", groupHandler.PublishAnnouncement)
			conversations.PUT("/:id/announcements/:aid", groupHandler.UpdateAnnouncement)
			conversations.POST("/:id/announcements/:aid/read", groupHandler.MarkRead)
			conversations.GET("/:id/messages", msgHandler.GetHistory)
		}

		// 消息
		messages := api.Group("/messages")
		{
			messages.GET("/search", msgHandler.Search)
			messages.GET("/:id", msgHandler.Get)
			messages.PUT("/:id/recall", msgHandler.Recall)
			messages.GET("/:id/thread", msgHandler.GetThread)
			messages.POST("/:id/reactions", msgHandler.AddReaction)
			messages.DELETE("/:id/reactions/:emoji", msgHandler.RemoveReaction)
		}

		// 文件
		files := api.Group("/files")
		{
			files.POST("/upload-token", fileHandler.GetUploadToken)
			files.POST("/upload-callback", fileHandler.UploadCallback)
			files.GET("/:id/url", fileHandler.GetFileURL)
				files.GET("/:id/thumbnail", fileHandler.GetThumbnail)
		}
	}

	// ===================== 管理后台 =====================
	admin := r.Group("/api/admin")
	admin.Use(middleware.Auth(cfg.JWTSecret), middleware.Admin())
	{
		admin.GET("/dashboard", adminHandler.Dashboard)
		admin.GET("/users", adminHandler.ListUsers)
		admin.GET("/users/:id", adminHandler.GetUserDetail)
		admin.PUT("/users/:id/ban", adminHandler.BanUser)
		admin.GET("/groups", adminHandler.ListGroups)
		admin.DELETE("/groups/:id", adminHandler.DeleteGroup)
		admin.PUT("/messages/:id/force-recall", adminHandler.ForceRecall)
		admin.GET("/logs", adminHandler.ListLogs)
	}


		// ===================== 静态文件（前端 SPA） =====================
		r.Use(func(c *gin.Context) {
			path := c.Request.URL.Path
			if len(path) >= 5 && path[:5] == "/api/" {
				c.Next()
				return
			}
			filePath := filepath.Join("dist", path)
			if _, err := os.Stat(filePath); err == nil {
				c.File(filePath)
				return
			}
			c.File("dist/index.html")
		})

	// ===================== 启动服务 =====================
	// HTTP API
	go func() {
		addr := fmt.Sprintf(":%d", cfg.Port)
		log.Printf("HTTP server listening on %s", addr)
		if err := r.Run(addr); err != nil {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// WebSocket
	wsAddr := fmt.Sprintf(":%d", cfg.WSPort)
	log.Printf("WebSocket server listening on %s", wsAddr)
	http.HandleFunc("/ws", hub.ServeWS)
	if err := http.ListenAndServe(wsAddr, nil); err != nil {
		log.Fatalf("WebSocket server error: %v", err)
	}
}

// wsMsgSender 将 message.Service 适配为 ws.MessageSender 接口
type wsMsgSender struct {
	svc *message.Service
}

func (s *wsMsgSender) SendMessage(senderID int64, data ws.SendMsgData) (int64, int64, error) {
	resp, err := s.svc.SendMessage(senderID, message.SendMsgReq{
		ConversationID: data.ConversationID,
		MsgType:        data.MsgType,
		Content:        data.Content,
		ReplyTo:        data.ReplyTo,
		ThreadRootID:   data.ThreadRootID,
		FileID:         data.FileID,
		MentionIDs:     data.MentionIDs,
	})
	if err != nil {
		return 0, 0, err
	}
	return resp.ID, resp.ConversationID, nil
}

type wsUserNotifier struct {
	hub *ws.Hub
}

func (n *wsUserNotifier) NotifyUser(userID int64, action string, data map[string]interface{}) {
	n.hub.SendToUser(userID, ws.Envelope{Action: action, Data: data})
}

func (n *wsUserNotifier) NotifyConversation(convID int64, action string, data map[string]interface{}) {
	n.hub.BroadcastToConversation(convID, ws.Envelope{Action: action, Data: data})
}

type wsGroupNotifier struct {
	hub *ws.Hub
}

func (n *wsGroupNotifier) NotifyConversation(convID int64, action string, data map[string]interface{}) {
	n.hub.BroadcastToConversation(convID, ws.Envelope{Action: action, Data: data})
}

type wsMsgNotifier struct {
	hub *ws.Hub
}

func (n *wsMsgNotifier) NotifyConversation(convID int64, action string, data map[string]interface{}) {
	n.hub.BroadcastToConversation(convID, ws.Envelope{Action: action, Data: data})
}
