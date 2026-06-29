# 纸条 PaperNote

轻量即时通讯应用。前端 React + TypeScript，后端 Go + Gin，支持 Web 端与 Electron 桌面端（Windows / macOS / Linux）。

## 架构

```
浏览器 / Electron 桌面端
        │
     HTTPS/WSS
        │
      Nginx
   ├── /api/*  →  backend:8080   (REST)
   ├── /ws     →  backend:8081   (WebSocket)
   └── /*      →  dist/          (SPA 静态文件)
        │
   ┌────┴────┐
   │  Gin    │  Go 后端 (:8080 + :8081)
   │  GORM   │
   └────┬────┘
   ┌────┴────┐
   │PostgreSQL│  Redis
   └─────────┘
```

## 项目结构

```
papernote/
├── src/                        # 前端 React 应用
│   ├── components/
│   │   ├── ChatArea/           # 聊天区（消息气泡/输入框/灯箱）
│   │   ├── ConversationSidebar/ # 会话列表
│   │   ├── WorkspaceSidebar/   # 工作区导航
│   │   ├── FilesPanel/         # 会话文件面板
│   │   ├── ThreadPanel/        # 消息线程
│   │   ├── TitleBar/           # Electron 拖拽标题栏
│   │   ├── StatusBar/          # 底部连接状态
│   │   ├── SearchDialog/       # 全局搜索
│   │   ├── AuthGuard/          # 路由鉴权
│   │   ├── AdminGuard/         # 管理员鉴权
│   │   ├── ErrorBoundary/      # 错误边界
│   │   └── common/             # 通用组件（Avatar 等）
│   ├── pages/
│   │   ├── LoginPage/
│   │   ├── RegisterPage/
│   │   ├── ForgotPasswordPage/
│   │   ├── FriendsPage/
│   │   ├── GroupSettingsPage/
│   │   ├── SettingsPage/
│   │   ├── NotFoundPage/
│   │   └── admin/              # 管理后台
│   │       ├── AdminLayout/
│   │       ├── DashboardPage/
│   │       ├── UserManagementPage/
│   │       ├── GroupManagementPage/
│   │       └── OperationLogPage/
│   ├── store/                  # Zustand 状态（authStore / chatStore）
│   ├── utils/                  # http / ws / upload / fileUtils / platform
│   ├── types/                  # TypeScript 类型 + Electron API 声明
│   ├── styles/                 # theme.css（亮色/深色双主题变量）
│   ├── hooks/                  # 自定义 Hooks
│   └── __tests__/              # Vitest + MSW
├── backend/                    # Go 后端
│   ├── cmd/server/main.go     # 入口
│   ├── internal/
│   │   ├── auth/               # 注册/登录/JWT/刷新
│   │   ├── user/               # 用户信息/好友/设备管理
│   │   ├── conversation/       # 会话（私聊/频道/置顶/免打扰）
│   │   ├── message/            # 消息收发/撤回/表情反应/搜索
│   │   ├── file/               # 文件上传（腾讯云 COS / 本地存储）
│   │   ├── group/              # 群公告
│   │   ├── ws/                 # WebSocket Hub（多设备/心跳）
│   │   ├── admin/              # 管理后台（仪表盘/用户/群组/日志）
│   │   └── middleware/         # CORS / JWT Auth / Admin 鉴权
│   └── pkg/                    # config / db / redis
├── electron/                   # Electron 桌面端
│   ├── main.js                 # 主进程（窗口/托盘/快捷键/IPC）
│   ├── preload.js              # contextBridge 安全暴露 API
│   └── tray.js                 # 系统托盘（右键菜单/在线状态）
├── docker/                     # Docker Compose + Nginx 配置
├── scripts/                    # deploy.sh 一键部署
├── assets/                     # 应用图标
└── .env.desktop                # 桌面端构建环境变量
```

## 快速开始

### 1. 环境准备

- **Node.js** ≥ 20
- **Go** ≥ 1.22（仅后端开发）
- **Docker**（运行 PostgreSQL + Redis）

### 2. 启动数据库

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
```

### 3. 启动后端

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env 填写数据库密码和 JWT 密钥
cd backend
go mod tidy
go run ./cmd/server   # API :8080  WebSocket :8081
```

### 4. 启动前端

```bash
cp .env.example .env.development
npm install
npm run dev            # http://localhost:3000
```

### 5. 一键部署（服务器）

```bash
cp .env.example .env
# 编辑 .env 填写全部配置
./scripts/deploy.sh
```

## 环境变量

### 前端构建变量

| 变量 | Web 生产 | 桌面端 | 开发 |
|---|---|---|---|
| `VITE_API_BASE` | 空（同域相对路径） | `https://你的域名` | `http://localhost:8080` |
| `VITE_WS_URL` | 空（同域相对路径） | `wss://你的域名/ws` | `ws://localhost:8081/ws` |

- `.env` — 生产构建（Web），留空走同域
- `.env.desktop` — 桌面端构建，填写服务器绝对地址
- `.env.development` — 本地开发

### 后端环境变量

| 变量 | 说明 | 示例 |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | PostgreSQL 连接 | `localhost:5432` |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis 连接 | `localhost:6379` |
| `JWT_SECRET` | JWT 签名密钥（≥ 32 字符） | |
| `COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_BUCKET` / `COS_REGION` | 腾讯云 COS（文件存储） | |
| `PORT` | HTTP 端口 | `8080` |
| `WS_PORT` | WebSocket 端口 | `8081` |

## Electron 桌面端

```bash
# 开发（Vite 热更新 + Electron 窗口）
npm run electron:dev

# 构建安装包
npm run electron:build:win      # Windows (.exe NSIS 安装包)
npm run electron:build:mac      # macOS (.dmg)
npm run electron:build:linux    # Linux (.AppImage)
```

构建前确保 `.env.desktop` 中 `VITE_API_BASE` 和 `VITE_WS_URL` 指向正确的服务器地址。

输出在 `release/` 目录：
- `纸条 Setup 1.0.0.exe` — 安装包
- `win-unpacked/纸条.exe` — 免安装版（可直接运行）

桌面端特性：
- 无边框窗口，自定义标题栏拖拽
- 系统托盘（关闭隐藏、右键在线状态切换、双击恢复）
- 全局快捷键（`Ctrl+Shift+N` 显示窗口、`Ctrl+Shift+Space` 聚焦搜索）
- 桌面通知（窗口在后台时弹新消息通知）
- 单实例运行

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 状态管理 | Zustand |
| UI | 自定义组件 + Ant Design 6（管理后台）+ ECharts |
| HTTP | Axios（JWT 自动附加 + 401 刷新） |
| WebSocket | 原生 WebSocket（心跳 + 指数退避重连） |
| 后端框架 | Go + Gin |
| ORM | GORM |
| WebSocket | gorilla/websocket |
| 数据库 | PostgreSQL 15 |
| 缓存 | Redis 7 |
| 文件存储 | 腾讯云 COS（也支持七牛云 OSS / 本地存储） |
| 桌面端 | Electron 42 |
| 部署 | Docker Compose + Nginx |

## 功能

### 消息
- 文本 / 图片 / 视频 / 文件消息
- 引用回复、Emoji 表情反应
- 消息撤回（2 分钟内）
- 消息搜索（全文检索）
- 线程回复
- @提及（@某人 / @所有人）
- 已读回执

### 会话
- 私聊 / 频道（群组）
- 会话置顶 / 免打扰
- 会话文件面板（按类型筛选）

### 好友
- 搜索添加好友
- 好友请求 / 接受 / 拒绝
- 拉黑
- 在线状态

### 群组
- 创建频道、邀请成员
- 角色权限（群主/管理员/成员）
- 群公告（发布/编辑/已读标记）
- 转让群主、踢人

### 管理后台
- 数据仪表盘（用户数/消息数/在线数）
- 用户管理（查看/封禁/解封）
- 群组管理（查看/删除）
- 操作日志
- 强制撤回消息

### 桌面端
- 无边框窗口拖拽
- 系统托盘隐藏/恢复
- 桌面通知
- 全局快捷键
- 单实例运行

### 通用
- 亮色/深色双主题
- JWT 双 Token 自动刷新
- 多设备 WebSocket 同步
- 响应式布局

## 路由

```
/login              — 登录
/forgot-password    — 忘记密码
/register           — 注册
/                   — 聊天主界面（需登录）
/friends            — 好友管理
/channel/:id/settings — 频道设置
/settings           — 个人设置
/admin              — 管理后台（需管理员）
/admin/users        — 用户管理
/admin/groups       — 群组管理
/admin/logs         — 操作日志
```

## API 概览

| 路径 | 方法 | 说明 | 鉴权 |
|---|---|---|---|
| `/api/auth/register` | POST | 注册 | — |
| `/api/auth/login` | POST | 登录 | — |
| `/api/auth/refresh` | POST | 刷新 Token | — |
| `/api/auth/me` | GET | 当前用户 | JWT |
| `/api/conversations` | GET/POST | 会话列表/创建 | JWT |
| `/api/messages/search` | GET | 消息搜索 | JWT |
| `/api/friends` | GET | 好友列表 | JWT |
| `/api/files/upload-token` | POST | 获取上传凭证 | JWT |
| `/api/files/:id/url` | GET | 获取文件访问 URL | — |
| `/api/admin/dashboard` | GET | 数据面板 | Admin |
| `/api/admin/users` | GET | 用户列表 | Admin |
| `/api/admin/logs` | GET | 操作日志 | Admin |
| `/ws` | — | WebSocket | token 参数 |

## License

MIT
