/* ============================================
   纸条 PaperNote — 核心类型定义
   涵盖用户、工作区、会话、消息、Reaction、Store 接口等
   ============================================ */

// ==========================================
// 用户
// ==========================================

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  role?: string; // 'user' | 'admin' — 平台角色
  status: 'online' | 'offline' | 'away';
  lastSeen?: number; // timestamp ms
}

// ==========================================
// 工作区
// ==========================================

export interface Workspace {
  id: string;
  name: string;
  iconUrl: string;
}

// ==========================================
// 会话
// ==========================================

/** 会话类型：dm=私聊, channel=频道/群聊 */
export type ConversationType = 'dm' | 'channel';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  avatarUrl: string;
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  /** 仅 channel：成员 ID 列表 */
  memberIds?: string[];
  /** 草稿内容 */
  draft?: string;
}

// ==========================================
// 消息
// ==========================================

/** 消息类型：映射至 DB messages.msg_type (0/1/2/3/4) */
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'system';

/** 消息发送状态 */
export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string; // 文本内容或 JSON 序列化的媒体元数据
  status: MessageStatus;
  createdAt: number; // timestamp ms
  /** 引用的消息 ID（对应 DB reply_to） */
  quoteId?: string;
  /** 线程根消息 ID；非 null 表示属于某线程的回复（对应 DB thread_root_id） */
  threadRootId?: string;
  /** 该消息的线程回复数（仅 threadRootId 为 null/undefined 时有效） */
  replyCount?: number;
  /** 消息回应 */
  reactions?: Reaction[];
  /** @提及的用户 ID 列表 */
  mentionIds?: string[];
}

// ==========================================
// 消息回应
// ==========================================

export interface Reaction {
  emoji: string;
  userIds: string[];
}

// ==========================================
// 文件附件
// ==========================================

export interface FileAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

// ==========================================
// 好友
// ==========================================

export interface Friend {
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  remark?: string;
  online: boolean;
  lastActive?: number;
  blocked: boolean;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromNickname: string;
  fromAvatarUrl: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number; // timestamp ms
}

// ==========================================
// 群组
// ==========================================

export type MemberRole = 'owner' | 'admin' | 'member';

export interface GroupMember {
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  role: MemberRole;
  muted: boolean;
  mutedUntil?: number; // timestamp ms，禁言到期时间
}

export interface Announcement {
  id: string;
  content: string;
  publisherId: string;
  publisherName: string;
  readCount: number;
  totalCount: number; // 群成员总数
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// 注册表单数据
// ==========================================

export interface RegisterData {
  username: string;
  nickname: string;
  password: string;
  phone?: string;
  email?: string;
}

// ==========================================
// Zustand Chat Store 接口
// ==========================================

export interface ChatStore {
  // ---- 认证 ----
  token: string | null;
  currentUser: User | null;

  // ---- 用户缓存 ----
  users: Record<string, User>;

  // ---- 工作区 ----
  workspaces: Workspace[];
  activeWorkspaceId: string;

  // ---- 会话 ----
  conversations: Conversation[];
  activeConversationId: string | null;

  // ---- 消息 ----
  messagesByConversation: Record<string, Message[]>;
  lastSeq: number;

  // ---- 线程 ----
  activeThreadRootId: string | null;

  // ---- UI 状态 ----
  theme: 'light' | 'dark';
  inputDraft: Record<string, string>;       // 按会话 ID 存草稿
  typingUsers: Record<string, string[]>;    // 按会话 ID 存正在输入的用户名列表
  wsStatus: 'connected' | 'connecting' | 'disconnected';

  // ---- 好友 ----
  friends: Friend[];
  friendRequests: FriendRequest[];

  // ===================== Actions =====================

  // ---- 认证 ----
  login: (account: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;

  // ---- 用户缓存 ----
  setCurrentUser: (user: User) => void;
  setUsers: (users: User[]) => void;

  // ---- 工作区 & 会话 ----
  switchWorkspace: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  createDM: (userId: string) => Promise<string>;
  createChannel: (name: string, memberIds: string[]) => Promise<string>;

  // ---- 消息 ----
  sendMessage: (content: string, quoteId?: string, threadRootId?: string, msgType?: MessageType) => void;
  fetchHistory: (conversationId: string, before?: string) => Promise<void>;
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  updateMessageStatus: (convId: string, msgId: string, status: MessageStatus) => void;
  markAsRead: (convId: string) => void;
  incrementUnread: (convId: string) => void;

  // ---- Reactions ----
  addReaction: (convId: string, msgId: string, emoji: string, userId: string) => void;
  removeReaction: (convId: string, msgId: string, emoji: string, userId: string) => void;

  // ---- 线程 ----
  openThread: (msgId: string) => void;
  closeThread: () => void;

  // ---- 好友 ----
  searchUsers: (query: string) => Promise<User[]>;
  sendFriendRequest: (toUserId: string, message?: string) => Promise<void>;
  handleFriendRequest: (requestId: string, action: 'accept' | 'reject') => Promise<void>;
  fetchFriends: () => Promise<void>;
  deleteFriend: (userId: string) => Promise<void>;
  blockUser: (userId: string, blocked: boolean) => Promise<void>;

  // ---- 群组 ----
  updateGroupInfo: (id: string, data: { name?: string; avatar?: string; description?: string }) => Promise<void>;
  manageMember: (convId: string, userId: string, action: string, duration?: number) => Promise<void>;
  inviteMembers: (convId: string, userIds: string[]) => Promise<void>;
  getMembers: (convId: string) => Promise<GroupMember[]>;
  getAnnouncements: (convId: string) => Promise<Announcement[]>;
  publishAnnouncement: (convId: string, content: string) => Promise<void>;
  markAnnouncementRead: (convId: string, announcementId: string) => Promise<void>;
  dissolveGroup: (convId: string) => Promise<void>;

  // ---- 主题 ----
  setTheme: (theme: 'light' | 'dark') => void;

  // ---- Selectors（通过 get() 实现的派生数据） ----
  getActiveConversation: () => Conversation | undefined;
  getActiveMessages: () => Message[];
  getThreadMessages: () => Message[];
  getUnreadTotal: () => number;
}
