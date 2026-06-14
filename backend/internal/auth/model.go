// Package auth 用户认证：模型定义
package auth

import "time"

// User GORM 模型，映射 users 表
type User struct {
	ID           int64      `gorm:"primaryKey;column:id"            json:"id"`
	Username     string     `gorm:"column:username;size:32"         json:"username"`
	PasswordHash string     `gorm:"column:password_hash;size:255"   json:"-"`
	Nickname     string     `gorm:"column:nickname;size:64"         json:"nickname"`
	Avatar       string     `gorm:"column:avatar;size:512"          json:"avatar"`
	Phone        string     `gorm:"column:phone;size:20"            json:"phone"`
	Email        string     `gorm:"column:email;size:128"           json:"email"`
	Status       int16      `gorm:"column:status;default:0"         json:"status"`
	Role         string     `gorm:"column:role;size:16;default:user" json:"role"`
	CreatedAt    time.Time  `gorm:"column:created_at"               json:"created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at"               json:"updated_at"`
}

func (User) TableName() string { return "users" }

// ---------- DTO ----------

type RegisterReq struct {
	Username string `json:"username" binding:"required,min=3,max=32"`
	Password string `json:"password" binding:"required,min=6,max=64"`
	Nickname string `json:"nickname" binding:"required,min=1,max=64"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
}

type LoginReq struct {
	Account  string `json:"account" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResp struct {
	UserID int64  `json:"user_id"`
	Token  string `json:"token"`
}

type MeResp struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	Avatar    string `json:"avatar"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Status    int16  `json:"status"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}
