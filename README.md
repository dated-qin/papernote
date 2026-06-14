# 纸条 PaperNote

轻量即时通讯应用。前端 React + TypeScript（Slack 风格聊天界面），后端 Go + Gin（REST + WebSocket），支持 Electron 桌面端。

## 项目结构

```
papernote/
├── src/                      # 前端 React 应用
│   ├── components/           # UI 组件 (ChatArea/Sidebar/ThreadPanel...)
│   ├── pages/                # 页面 (Login/Register/Friends/GroupSettings/Admin)
│   ├── store/                # Zustand 状态管理
│   ├── utils/                # 工具 (http/ws/upload/fileUtils/errorHandler)
│   ├── types/                # TypeScript 类型定义
│   ├── styles/               # CSS 变量 (双主题)
│   └── __tests__/            # 测试 (Vitest + MSW)
├── backend/                  # 后端 Go API
│   ├── cmd/server/           # 入口 (HTTP :8080 + WS :8081)
│   ├── internal/             # 业务模块
│   │   ├── auth/             # 认证 (注册/登录/JWT)
│   │   ├── user/             # 用户与好友
│   │   ├── conversation/     # 会话管理
│   │   ├── message/          # 消息收发
│   │   ├── file/             # 文件上传 (OSS)
│   │   ├── group/            # 群组管理 + 公告
│   │   ├── ws/               # WebSocket Hub
│   │   ├── admin/            # 管理后台 API
│   │   └── middleware/       # CORS/JWT Auth/Admin
│   ├── pkg/                  # 基础设施 (config/db/redis)
│   └── migrations/           # SQL DDL (12 张表)
├── electron/                 # Electron 桌面端
├── docker/                   # Docker Compose + Nginx
├── scripts/                  # 部署 & 备份脚本
└── docs/                     # 文档
```

## 快速开始

### 前端

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # 生产构建
npm test             # 38 个测试
```

### 后端

```bash
# 启动 PostgreSQL + Redis
docker compose -f docker/docker-compose.yml up -d

# 配置环境变量
cp backend/.env.example backend/.env

# 启动后端 (需要 Go 1.22+)
cd backend
go mod tidy
go run ./cmd/server   # API :8080  WS :8081
```

### 全栈一键部署

```bash
./scripts/deploy.sh
```

## 技术栈

| 层级 | 技术 |
|:-----|:-----|
| 前端 | React 18 + TypeScript + Vite + Zustand |
| UI | 自定义 Slack 风格组件 + Ant Design (管理后台) + ECharts |
| 测试 | Vitest + React Testing Library + MSW |
| 后端 | Go + Gin + GORM + gorilla/websocket |
| 数据库 | PostgreSQL 15 |
| 缓存 | Redis 7 |
| 存储 | 七牛云 Kodo (OSS) |
| 桌面端 | Electron |
| 部署 | Docker Compose + Nginx + GitHub Actions |

## 功能概览

- 双主题 (亮色/深色) 暖色调聊天界面
- 实时消息 (WebSocket 推送 + 已读回执)
- 会话管理 (私聊/频道/置顶/免打扰)
- 消息功能 (文本/图片/视频/文件/引用回复/Emoji 回应/线程/撤回)
- 好友系统 (搜索/请求/拉黑/在线状态)
- 群组管理 (角色权限/禁言/公告/转让)
- 文件上传 (OSS 直传 + 进度条 + 预览)
- 管理后台 (数据面板/用户管理/群组管理/操作日志)
- Electron 桌面端 (托盘/通知/快捷键/无边框窗口)
- 移动端响应式适配

## 路由

```
/login          — 登录
/register       — 注册
/               — 聊天主界面
/friends        — 好友页面
/channel/:id/settings — 群设置
/admin          — 管理后台 (数据面板)
/admin/users    — 用户管理
/admin/groups   — 群组管理
/admin/logs     — 操作日志
```
