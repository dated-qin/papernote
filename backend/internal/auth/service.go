package auth

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Service struct {
	db  *gorm.DB
	rdb *redis.Client
	cfg AuthConfig
}

type AuthConfig struct {
	JWTSecret      string
	JWTExpireHours int
}

func NewService(db *gorm.DB, rdb *redis.Client, cfg AuthConfig) *Service {
	return &Service{db: db, rdb: rdb, cfg: cfg}
}

// ---------- 注册 ----------

func (s *Service) Register(req RegisterReq) (*AuthResp, error) {
	// 校验手机号或邮箱至少一个
	if req.Phone == "" && req.Email == "" {
		return nil, errors.New("手机号或邮箱至少填一项")
	}
	if req.Phone != "" && len(req.Phone) != 11 {
		return nil, errors.New("手机号格式不正确")
	}
	if req.Email != "" && !strings.Contains(req.Email, "@") {
		return nil, errors.New("邮箱格式不正确")
	}

	// 唯一性检查
	var count int64
	if err := s.db.Model(&User{}).
		Where("username = ? OR (phone = ? AND phone != '') OR (email = ? AND email != '')",
			req.Username, req.Phone, req.Email).
		Count(&count).Error; err != nil {
		return nil, fmt.Errorf("数据库查询失败: %w", err)
	}
	if count > 0 {
		return nil, errors.New("用户名、手机号或邮箱已被注册")
	}

	// bcrypt 哈希
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, fmt.Errorf("密码加密失败: %w", err)
	}

	// 插入用户
	user := User{
		Username:     req.Username,
		PasswordHash: string(hash),
		Nickname:     req.Nickname,
		Phone:        req.Phone,
		Email:        req.Email,
		Status:       0,
		Role:         "user",
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}

	// 生成 JWT
	token, err := s.generateToken(user.ID, user.Username, user.Role)
	if err != nil {
		return nil, err
	}

	return &AuthResp{UserID: user.ID, Token: token}, nil
}

// ---------- 登录 ----------

func (s *Service) Login(req LoginReq) (*AuthResp, error) {
	// 按 account 匹配 username OR phone OR email
	var user User
	err := s.db.Where("username = ? OR phone = ? OR email = ?",
		req.Account, req.Account, req.Account).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("账号不存在")
	}
	if err != nil {
		return nil, fmt.Errorf("数据库查询失败: %w", err)
	}

	// 校验密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("密码错误")
	}

	// 校验封禁
	if user.Status == 1 {
		return nil, errors.New("账号已被封禁")
	}

	// 生成 JWT
	token, err := s.generateToken(user.ID, user.Username, user.Role)
	if err != nil {
		return nil, err
	}

	return &AuthResp{UserID: user.ID, Token: token}, nil
}

// ---------- 获取当前用户 ----------

func (s *Service) GetMe(userID int64) (*MeResp, error) {
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, fmt.Errorf("数据库查询失败: %w", err)
	}

	return &MeResp{
		ID:        user.ID,
		Username:  user.Username,
		Nickname:  user.Nickname,
		Avatar:    user.Avatar,
		Bio:       user.Bio,
		Phone:     maskPhone(user.Phone),
		Email:     maskEmail(user.Email),
		Status:    user.Status,
		Role:      user.Role,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
	}, nil
}

// ---------- 修改密码 ----------

func (s *Service) ChangePassword(userID int64, req ChangePasswordReq) error {
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在")
		}
		return fmt.Errorf("数据库查询失败: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("旧密码错误")
	}
	if req.OldPassword == req.NewPassword {
		return errors.New("新密码不能与旧密码相同")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}
	return s.db.Model(&user).Update("password_hash", string(hash)).Error
}

// ---------- 密码找回 ----------

func (s *Service) SendResetCode(target string) error {
	// 查找用户
	var user User
	if err := s.db.Where("phone = ? OR email = ?", target, target).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("该手机号或邮箱未注册")
		}
		return err
	}

	// 频控：60s 内只能发送一次
	ctx := context.Background()
	rateKey := "reset_code_rate:" + target
	if exists, _ := s.rdb.Exists(ctx, rateKey).Result(); exists > 0 {
		return errors.New("验证码已发送，请60秒后再试")
	}

	// 生成 6 位验证码
	code := fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
	codeKey := "reset_code:" + target

	// 存储到 Redis，5 分钟过期
	s.rdb.Set(ctx, codeKey, code, 5*time.Minute)
	s.rdb.Set(ctx, rateKey, "1", 60*time.Second)

	// 开发模式：打印验证码到日志
	fmt.Printf("[DEV] 密码找回验证码 [%s]: %s (5分钟内有效)\n", target, code)
	return nil
}

func (s *Service) VerifyResetCode(target, code string) error {
	ctx := context.Background()
	codeKey := "reset_code:" + target
	stored, err := s.rdb.Get(ctx, codeKey).Result()
	if err != nil || stored != code {
		return errors.New("验证码错误或已过期")
	}
	return nil
}

func (s *Service) ResetPassword(target, code, newPassword string) error {
	// 先验证验证码
	if err := s.VerifyResetCode(target, code); err != nil {
		return err
	}

	// 查找用户
	var user User
	if err := s.db.Where("phone = ? OR email = ?", target, target).First(&user).Error; err != nil {
		return errors.New("用户不存在")
	}

	// 加密新密码
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}

	if err := s.db.Model(&user).Update("password_hash", string(hash)).Error; err != nil {
		return err
	}

	// 清除验证码
	ctx := context.Background()
	s.rdb.Del(ctx, "reset_code:"+target)
	return nil
}

// ---------- JWT ----------

func (s *Service) generateToken(userID int64, username, role string) (string, error) {
	claims := jwt.MapClaims{
		"sub":      strconv.FormatInt(userID, 10),
		"username": username,
		"role":     role,
		"iat":      time.Now().Unix(),
		"exp":      time.Now().Add(time.Duration(s.cfg.JWTExpireHours) * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

// ---------- 限流 ----------

func (s *Service) CheckLoginRateLimit(ip string) bool {
	ctx := context.Background()
	key := "ratelimit:login:" + ip
	count, err := s.rdb.Incr(ctx, key).Result()
	if err != nil {
		return true // Redis 故障时放行
	}
	if count == 1 {
		s.rdb.Expire(ctx, key, 60*time.Second)
	}
	return count <= 5
}

// ---------- 脱敏 ----------

func maskPhone(phone string) string {
	if len(phone) < 7 {
		return phone
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}

func maskEmail(email string) string {
	if email == "" || !strings.Contains(email, "@") {
		return email
	}
	parts := strings.SplitN(email, "@", 2)
	if len(parts[0]) <= 1 {
		return email
	}
	return parts[0][:1] + "***@" + parts[1]
}
