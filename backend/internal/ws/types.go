// Package ws WebSocket 服务：连接管理、心跳、消息路由
package ws

import (
	"time"

	"github.com/gorilla/websocket"
)

// ---------- 消息信封 ----------

type Envelope struct {
	Action string                 `json:"action"`
	Seq    int64                  `json:"seq,omitempty"`
	Data   map[string]interface{} `json:"data"`
}

// ---------- 连接配置 ----------

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10 // 54s
	maxMessageSize = 10240               // 10KB
)

// ---------- 上游依赖接口 ----------

// MessageSender 消息发送接口（由 message.Service 实现）
type MessageSender interface {
	SendMessage(senderID int64, data SendMsgData) (msgID int64, conversationID int64, err error)
}

type SendMsgData struct {
	ConversationID int64
	MsgType        int16
	Content        string
	ReplyTo        *int64
	ThreadRootID   *int64
	FileID         *int64
}

// UserNotifier 在线状态通知接口
type UserNotifier interface {
	GetOnlineFriends(userID int64) []int64
}

// ---------- 升级器 ----------

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}
