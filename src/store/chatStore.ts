/* ============================================
   纸条 PaperNote — Zustand Chat Store
   单一 Store：会话 actions、消息 actions、WebSocket 事件处理、Reactions、线程、主题
   完整实现 fetchConversations / createDM / createChannel / fetchHistory / sendMessage
   ============================================ */

import { create } from 'zustand';
import http from '../utils/http';
import { wsClient } from '../utils/ws';
import { isElectron } from '../utils/platform';
import type {
  ChatStore,
  Message,
  Reaction,
  User,
  Conversation,
  FriendRequest,
  MessageStatus,
  MessageType,
  SearchMessageResult,
  UpdateProfileData,
  Announcement,
} from '../types';

// http 将在 auth / conversations / messages action 实现中使用（详见后续上下文）
void http;

// ---------- API 类型 → 前端类型 转换 ----------

/** msg_type 枚举映射：DB 数值 → 前端字符串 */
export const msgTypeMap: Record<number, MessageType> = {
  0: 'text',
  1: 'image',
  2: 'video',
  3: 'file',
  4: 'system',
};

/** msg_type 反向映射：前端字符串 → DB 数值 */
const msgTypeToNum: Record<string, number> = {
  text: 0,
  image: 1,
  video: 2,
  file: 3,
  system: 4,
};

/** API 会话对象 → 前端 Conversation */
function apiToConversation(raw: Record<string, unknown>): Conversation {
  const lastMsg = raw.last_message as Record<string, unknown> | undefined;
  return {
    id: String(raw.id),
    type: raw.type as Conversation['type'],
    name: (raw.title as string) ?? '',
    avatarUrl: (raw.avatar as string) ?? '',
    unreadCount: (raw.unread_count as number) ?? 0,
    isMuted: (raw.muted as boolean) ?? false,
    isPinned: (raw.pinned as boolean) ?? false,
    lastMessage: lastMsg
      ? {
          id: String(lastMsg.id),
          conversationId: String(raw.id),
          senderId: String(lastMsg.sender_id),
          type: msgTypeMap[lastMsg.msg_type as number] ?? 'text',
          content: lastMsg.content as string,
          status: 'sent',
          createdAt: new Date(lastMsg.created_at as string).getTime(),
          mentionIds: apiToStringArray(lastMsg.mention_ids),
        }
      : undefined,
  };
}

/** API 消息对象 → 前端 Message */
function apiToMessage(raw: Record<string, unknown>): Message {
  return {
    id: String(raw.id),
    conversationId: String(raw.conversation_id),
    senderId: String(raw.sender_id),
    type: msgTypeMap[raw.msg_type as number] ?? 'text',
    content: raw.content as string,
    status: 'sent',
    createdAt: new Date(raw.created_at as string).getTime(),
    quoteId: raw.reply_to ? String(raw.reply_to) : undefined,
    threadRootId: raw.thread_root_id ? String(raw.thread_root_id) : undefined,
    replyCount: (raw.reply_count as number) ?? 0,
    mentionIds: apiToStringArray(raw.mention_ids),
    reactions: apiToReactions(raw.reactions),
  };
}

/** API reactions 数组 → 前端 Reaction[] */
function apiToReactions(raw: unknown): Reaction[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const reactions: Reaction[] = [];
  for (const item of raw) {
    const r = item as Record<string, unknown>;
    const emoji = r.emoji as string;
    const userIds = Array.isArray(r.user_ids)
      ? r.user_ids.map((id: unknown) => String(id))
      : [];
    if (emoji && userIds.length > 0) {
      reactions.push({ emoji, userIds });
    }
  }
  return reactions.length > 0 ? reactions : undefined;
}

function apiToSearchMessage(raw: Record<string, unknown>): SearchMessageResult {
  return {
    ...apiToMessage(raw),
    conversationName: (raw.conversation_name as string) ?? '',
    senderName: (raw.sender_name as string) ?? '',
  };
}

function apiToFriendRequest(raw: Record<string, unknown>): FriendRequest {
  return {
    id: String(raw.id ?? raw.request_id),
    fromUserId: String(raw.from_user_id ?? raw.user_id),
    fromUsername: String(raw.from_username ?? raw.username ?? ''),
    fromNickname: String(raw.from_nickname ?? raw.nickname ?? ''),
    fromAvatarUrl: String(raw.from_avatar ?? raw.avatar ?? ''),
    message: (raw.message as string) || undefined,
    status: ((raw.status as string) ?? 'pending') as 'pending' | 'accepted' | 'rejected',
    createdAt: raw.created_at ? new Date(raw.created_at as string).getTime() : Date.now(),
  };
}

function apiToAnnouncement(raw: Record<string, unknown>): Announcement {
  return {
    id: String(raw.id),
    content: (raw.content as string) ?? '',
    publisherId: String(raw.publisher_id),
    publisherName: (raw.publisher_name as string) ?? '',
    readCount: (raw.read_count as number) ?? 0,
    totalCount: (raw.total_count as number) ?? 0,
    createdAt: new Date(raw.created_at as string).getTime(),
    updatedAt: new Date(raw.updated_at as string).getTime(),
  };
}

// ---------- 工具函数 ----------

/** 将主题应用到 document & 持久化到 localStorage */
function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function apiToStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value.map((id) => String(id)).filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

// ---------- Store 创建 ----------

export const useChatStore = create<ChatStore>((set, get) => ({
  // ===================== 初始状态 =====================

  token: localStorage.getItem('token'),
  currentUser: null,
  users: {},
  workspaces: [],
  activeWorkspaceId: '',
  conversations: [],
  activeConversationId: null,
  messagesByConversation: {},
  announcementsByConversation: {},
  lastSeq: 0,
  highlightedMessageId: null,
  activeQuote: null,
  activeThreadRootId: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  inputDraft: {},
  typingUsers: {},
  wsStatus: 'disconnected' as const,

  // 好友
  friends: [],
  friendRequests: [],

  // ===================== 认证 Actions =====================
  // 认证逻辑由 authStore.ts 独立管理，此处保留签名以兼容 ChatStore 接口

  login: async (_account: string, _password: string) => {
    /* 由 authStore 实现 */
  },

  register: async (_data) => {
    /* 由 authStore 实现 */
  },

  logout: () => {
    localStorage.removeItem('token');
    wsClient.disconnect();
    set({
      token: null,
      currentUser: null,
      conversations: [],
      activeConversationId: null,
      messagesByConversation: {},
      announcementsByConversation: {},
      lastSeq: 0,
      activeQuote: null,
      users: {},
      workspaces: [],
      activeWorkspaceId: '',
      wsStatus: 'disconnected',
    });
  },

  fetchCurrentUser: async () => {
    /* 由 authStore 实现 */
  },

  // ===================== 用户缓存 Actions =====================

  setCurrentUser: (user: User) => set({ currentUser: user }),

  setUsers: (users: User[]) => {
    const map: Record<string, User> = {};
    for (const u of users) {
      map[u.id] = u;
    }
    set({ users: map });
  },

  updateProfile: async (data: UpdateProfileData) => {
    await http.patch('/api/users/me', data);
    set((state) => {
      if (!state.currentUser) return state;
      const updatedUser: User = {
        ...state.currentUser,
        nickname: data.nickname ?? state.currentUser.nickname,
        avatarUrl: data.avatar ?? state.currentUser.avatarUrl,
        bio: data.bio ?? state.currentUser.bio,
      };
      return {
        currentUser: updatedUser,
        users: {
          ...state.users,
          [updatedUser.id]: updatedUser,
        },
      };
    });
  },

  setPresenceStatus: (status: User['status']) => {
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, status } : null,
    }));
  },

  // ===================== 工作区 Actions =====================

  switchWorkspace: (id: string) => set({ activeWorkspaceId: id }),

  // ===================== 会话 Actions =====================

  setActiveConversation: (id: string | null) => {
    set((state) => ({
      activeConversationId: id,
      activeQuote:
        state.activeQuote && state.activeQuote.conversationId !== id ? null : state.activeQuote,
    }));
    if (id) {
      get().markAsRead(id);
    }
  },

  /** 获取会话列表：GET /api/conversations */
  fetchConversations: async () => {
    try {
      const res = await http.get<{ conversations: Record<string, unknown>[] }>(
        '/api/conversations',
      );
      if (res.code === 0) {
        const conversations: Conversation[] = (res.data.conversations ?? []).map(
          apiToConversation,
        );
        set({ conversations });
      }
    } catch {
      // 网络错误静默处理，保留已有会话列表
    }
  },

  /** 创建私聊：POST /api/conversations/dm */
  createDM: async (userId: string): Promise<string> => {
    const res = await http.post<{ id: number }>('/api/conversations/dm', {
      user_id: parseInt(userId, 10),
    });
    if (res.code === 0) {
      await get().fetchConversations();
      return String(res.data.id);
    }
    throw new Error('创建私聊失败');
  },

  /** 创建频道/群聊：POST /api/conversations/channel */
  createChannel: async (name: string, memberIds: string[]): Promise<string> => {
    const res = await http.post<{ id: number }>('/api/conversations/channel', {
      name,
      member_ids: memberIds.map(Number),
    });
    if (res.code === 0) {
      await get().fetchConversations();
      return String(res.data.id);
    }
    throw new Error('创建群聊失败');
  },

  togglePin: async (convId: string): Promise<void> => {
    const current = get().conversations.find((c) => c.id === convId);
    if (!current) return;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, isPinned: !c.isPinned } : c,
      ),
    }));

    try {
      const res = await http.put<{ pinned: boolean }>(`/api/conversations/${convId}/pin`);
      if (res.code === 0 && typeof res.data.pinned === 'boolean') {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId ? { ...c, isPinned: res.data.pinned } : c,
          ),
        }));
      }
    } catch {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === convId ? { ...c, isPinned: current.isPinned } : c,
        ),
      }));
    }
  },

  toggleMute: async (convId: string): Promise<void> => {
    const current = get().conversations.find((c) => c.id === convId);
    if (!current) return;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, isMuted: !c.isMuted } : c,
      ),
    }));

    try {
      const res = await http.put<{ muted: boolean }>(`/api/conversations/${convId}/mute`);
      if (res.code === 0 && typeof res.data.muted === 'boolean') {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId ? { ...c, isMuted: res.data.muted } : c,
          ),
        }));
      }
    } catch {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === convId ? { ...c, isMuted: current.isMuted } : c,
        ),
      }));
    }
  },

  // ===================== 消息 Actions =====================

  /**
   * 发送消息（乐观更新）
   * 1. 创建 pending 消息立即显示
   * 2. 通过 WebSocket 发送到服务端
   * 3. 服务端返回 new_msg 后由 ws handler 更新状态
   * 4. 5 秒超时自动标记为 failed
   */
  sendMessage: (
    content: string,
    quoteId?: string,
    threadRootId?: string,
    msgType?: MessageType,
    mentionIds?: string[],
  ) => {
    const {
      currentUser,
      activeConversationId,
      messagesByConversation,
      activeQuote,
    } = get();
    if (!activeConversationId || !currentUser || !content.trim()) return;

    const type = msgType ?? 'text';
    const numericType = msgTypeToNum[type] ?? 0;
    const effectiveQuoteId =
      quoteId ??
      (!threadRootId && activeQuote?.conversationId === activeConversationId
        ? activeQuote.messageId
        : undefined);

    const pendingMsg: Message = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      conversationId: activeConversationId,
      senderId: currentUser.id,
      type,
      content: content.trim(),
      status: 'sending',
      createdAt: Date.now(),
      quoteId: effectiveQuoteId,
      threadRootId,
      mentionIds,
    };

    // 乐观插入到消息列表
    const convMessages = messagesByConversation[activeConversationId] ?? [];
    set({
      messagesByConversation: {
        ...messagesByConversation,
        [activeConversationId]: [...convMessages, pendingMsg],
      },
    });

    // 通过 WebSocket 发送
    wsClient.send('send_msg', {
      client_msg_id: pendingMsg.id,
      conversation_id: parseInt(activeConversationId, 10),
      msg_type: numericType,
      content: pendingMsg.content,
      reply_to: effectiveQuoteId ? parseInt(effectiveQuoteId, 10) : null,
      thread_root_id: threadRootId ? parseInt(threadRootId, 10) : null,
      mention_ids: mentionIds ?? [],
    });

    if (effectiveQuoteId && activeQuote?.messageId === effectiveQuoteId) {
      set({ activeQuote: null });
    }

    // 5 秒超时检测
    setTimeout(() => {
      const msgs = get().messagesByConversation[activeConversationId];
      const msg = msgs?.find((m) => m.id === pendingMsg.id);
      if (msg?.status === 'sending') {
        get().updateMessageStatus(activeConversationId, pendingMsg.id, 'failed');
      }
    }, 5000);
  },

  /** 加载历史消息：GET /api/conversations/:id/messages?before=&limit=30 */
  fetchHistory: async (conversationId: string, before?: string) => {
    try {
      const params: Record<string, string | number> = { limit: 30 };
      if (before) params.before = before;
      const res = await http.get<{ messages: Record<string, unknown>[] }>(
        `/api/conversations/${conversationId}/messages`,
        { params } as Record<string, unknown>,
      );
      if (res.code === 0) {
        const messages = (res.data.messages ?? []).map(apiToMessage);
        get().addMessages(messages);
      }
    } catch {
      // 网络错误静默处理
    }
  },

  fetchMessage: async (messageId: string): Promise<Message | null> => {
    const cached = Object.values(get().messagesByConversation)
      .flat()
      .find((message) => message.id === messageId);
    if (cached) return cached;

    try {
      const res = await http.get<{ message: Record<string, unknown> | null }>(
        `/api/messages/${messageId}`,
      );
      if (res.code !== 0 || !res.data.message) return null;
      return apiToMessage(res.data.message);
    } catch {
      return null;
    }
  },

  searchMessages: async (query: string, conversationId?: string): Promise<SearchMessageResult[]> => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const params = new URLSearchParams({ q: trimmed });
    if (conversationId) params.set('conversation_id', conversationId);
    const res = await http.get<{ messages: Record<string, unknown>[] }>(
      `/api/messages/search?${params.toString()}`,
    );
    if (res.code !== 0) return [];
    return (res.data.messages ?? []).map(apiToSearchMessage);
  },

  jumpToMessage: async (conversationId: string, messageId: string, message?: Message) => {
    set({ activeConversationId: conversationId, highlightedMessageId: messageId });
    if (!get().messagesByConversation[conversationId]?.some((m) => m.id === messageId)) {
      await get().fetchHistory(conversationId);
    }
    if (
      message &&
      !get().messagesByConversation[conversationId]?.some((m) => m.id === messageId)
    ) {
      get().addMessages([message]);
    }
  },

  setQuote: (conversationId: string, messageId: string) => {
    set({ activeQuote: { conversationId, messageId } });
  },

  clearQuote: () => set({ activeQuote: null }),

  clearHighlightedMessage: () => set({ highlightedMessageId: null }),

  addMessage: (message: Message) => {
    const { messagesByConversation, activeConversationId } = get();
    const convId = message.conversationId;
    const msgs = messagesByConversation[convId] ?? [];
    if (msgs.some((m) => m.id === message.id)) return;
    set({
      messagesByConversation: {
        ...messagesByConversation,
        [convId]: [...msgs, message],
      },
      conversations: get().conversations.map((c) =>
        c.id === convId ? { ...c, lastMessage: message } : c,
      ),
      // 更新 lastSeq（WebSocket 下发的 new_msg 携带 seq）
      lastSeq: wsClient.getLastSeq(),
    });
    // 如果非活跃会话，增加未读
    if (convId !== activeConversationId) {
      get().incrementUnread(convId);
    }
  },

  addMessages: (messages: Message[]) => {
    const { messagesByConversation } = get();
    if (messages.length === 0) return;
    const convId = messages[0].conversationId;
    const existing = messagesByConversation[convId] ?? [];
    // 合并去重
    const existingIds = new Set(existing.map((m) => m.id));
    const newMsgs = messages.filter((m) => !existingIds.has(m.id));
    if (newMsgs.length === 0) return;
    set({
      messagesByConversation: {
        ...messagesByConversation,
        [convId]: [...existing, ...newMsgs].sort((a, b) => a.createdAt - b.createdAt),
      },
    });
  },

  updateMessageStatus: (convId: string, msgId: string, status: MessageStatus) => {
    const { messagesByConversation } = get();
    const msgs = messagesByConversation[convId];
    if (!msgs) return;
    set({
      messagesByConversation: {
        ...messagesByConversation,
        [convId]: msgs.map((m) =>
          m.id === msgId
            ? {
                ...m,
                status,
                // 撤回时将内容替换为提示文字
                content:
                  status === 'sent' && m.content === '___RECALLED___'
                    ? (m.senderId === get().currentUser?.id
                        ? '你撤回了一条消息'
                        : '对方撤回了一条消息')
                    : m.content,
              }
            : m,
        ),
      },
    });
  },

  markAsRead: (convId: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c,
      ),
    }));
    // 通过 WebSocket 发送已读回执
    const lastMsgId = get().messagesByConversation[convId]?.slice(-1)[0]?.id;
    wsClient.send('ack_read', {
      conversation_id: parseInt(convId, 10),
      last_msg_id: lastMsgId ? parseInt(lastMsgId, 10) : 0,
    });
  },

  incrementUnread: (convId: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: c.unreadCount + 1 } : c,
      ),
    }));
  },

  // ===================== 好友 Actions =====================

  /** 搜索用户：GET /api/users/search?q= */
  searchUsers: async (query: string): Promise<User[]> => {
    try {
      const res = await http.get<{ users: Record<string, unknown>[] }>(
        `/api/users/search?q=${encodeURIComponent(query)}`,
      );
      if (res.code === 0) {
        return (res.data.users ?? []).map((u: Record<string, unknown>) => ({
          id: String(u.id),
          username: (u.username as string) ?? '',
          nickname: (u.nickname as string) ?? '',
          avatarUrl: (u.avatar as string) ?? '',
          status: (u.online ? 'online' : 'offline') as User['status'],
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  /** 发送好友请求：POST /api/friends/requests */
  sendFriendRequest: async (toUserId: string, message?: string) => {
    await http.post('/api/friends/requests', {
      to_user_id: parseInt(toUserId, 10),
      message: message ?? '',
    });
  },

  /** 处理好友请求：PUT /api/friends/requests/:id */
  handleFriendRequest: async (requestId: string, action: 'accept' | 'reject') => {
    await http.put(`/api/friends/requests/${requestId}`, { action });
    // 从本地列表移除已处理的请求
    set((s) => ({
      friendRequests: s.friendRequests.filter((r) => r.id !== requestId),
    }));
    // 如果接受，刷新好友列表
    if (action === 'accept') {
      await get().fetchFriends();
      await get().fetchConversations();
    }
  },

  /** 获取好友请求：GET /api/friends/requests */
  fetchFriendRequests: async () => {
    try {
      const res = await http.get<{ requests: Record<string, unknown>[] }>(
        '/api/friends/requests',
      );
      if (res.code === 0) {
        const friendRequests = (res.data.requests ?? []).map(apiToFriendRequest);
        set({ friendRequests });
      }
    } catch {
      // 静默处理
    }
  },

  /** 获取好友列表：GET /api/friends */
  fetchFriends: async () => {
    try {
      const res = await http.get<{ friends: Record<string, unknown>[] }>('/api/friends');
      if (res.code === 0) {
        const friends = (res.data.friends ?? []).map((f: Record<string, unknown>) => ({
          userId: String(f.user_id),
          username: (f.username as string) ?? '',
          nickname: (f.nickname as string) ?? '',
          avatarUrl: (f.avatar as string) ?? '',
          remark: f.remark as string | undefined,
          online: (f.online as boolean) ?? false,
          lastActive: f.last_active
            ? new Date(f.last_active as string).getTime()
            : undefined,
          blocked: (f.blocked as boolean) ?? false,
        }));
        set({ friends });
      }
    } catch {
      // 静默处理
    }
  },

  /** 删除好友：DELETE /api/friends/:user_id */
  deleteFriend: async (userId: string) => {
    await http.delete(`/api/friends/${userId}`);
    set((s) => ({
      friends: s.friends.filter((f) => f.userId !== userId),
    }));
  },

  /** 拉黑/取消拉黑：PUT /api/friends/:user_id/block */
  blockUser: async (userId: string, blocked: boolean) => {
    await http.put(`/api/friends/${userId}/block`, { blocked });
    set((s) => ({
      friends: s.friends.map((f) =>
        f.userId === userId ? { ...f, blocked } : f,
      ),
    }));
  },

  // ===================== 群组 Actions =====================

  /** 修改群信息：PATCH /api/conversations/:id */
  updateGroupInfo: async (id: string, data: { name?: string; avatar?: string; description?: string }) => {
    await http.patch(`/api/conversations/${id}`, data);
    // 刷新本地会话信息
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id
          ? { ...c, name: data.name ?? c.name, avatarUrl: data.avatar ?? c.avatarUrl }
          : c,
      ),
    }));
  },

  /** 管理成员：PUT /api/conversations/:id/members/:user_id */
  manageMember: async (convId: string, userId: string, action: string, duration?: number) => {
    const body: Record<string, unknown> = { action };
    if (duration !== undefined) body.duration = duration;
    await http.put(`/api/conversations/${convId}/members/${userId}`, body);
  },

  /** 邀请成员：POST /api/conversations/:id/members */
  inviteMembers: async (convId: string, userIds: string[]) => {
    await http.post(`/api/conversations/${convId}/members`, {
      user_ids: userIds.map(Number),
    });
  },

  /** 获取成员列表：GET /api/conversations/:id/members */
  getMembers: async (convId: string) => {
    const res = await http.get<{ members: Record<string, unknown>[] }>(
      `/api/conversations/${convId}/members`,
    );
    if (res.code === 0) {
      return (res.data.members ?? []).map((m: Record<string, unknown>) => ({
        userId: String(m.user_id),
        username: (m.username as string) ?? '',
        nickname: (m.nickname as string) ?? '',
        avatarUrl: (m.avatar as string) ?? '',
        role: ((m.role as string) ?? 'member') as 'owner' | 'admin' | 'member',
        muted: (m.muted as boolean) ?? false,
        mutedUntil: m.muted_until ? new Date(m.muted_until as string).getTime() : undefined,
      }));
    }
    return [];
  },

  /** 获取群公告：GET /api/conversations/:id/announcements */
  getAnnouncements: async (convId: string) => {
    const res = await http.get<{ announcements: Record<string, unknown>[] }>(
      `/api/conversations/${convId}/announcements`,
    );
    if (res.code === 0) {
      const announcements = (res.data.announcements ?? []).map(apiToAnnouncement);
      set((state) => ({
        announcementsByConversation: {
          ...state.announcementsByConversation,
          [convId]: announcements,
        },
      }));
      return announcements;
    }
    return [];
  },

  /** 发布/更新群公告：POST /api/conversations/:id/announcements */
  publishAnnouncement: async (convId: string, content: string) => {
    await http.post(`/api/conversations/${convId}/announcements`, { content });
    await get().getAnnouncements(convId);
  },

  /** 标记公告已读：POST /api/conversations/:id/announcements/:aid/read */
  markAnnouncementRead: async (convId: string, announcementId: string) => {
    await http.post(
      `/api/conversations/${convId}/announcements/${announcementId}/read`,
    );
    await get().getAnnouncements(convId);
  },

  /** 解散群聊：DELETE /api/conversations/:id */
  dissolveGroup: async (convId: string) => {
    await http.delete(`/api/conversations/${convId}`);
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== convId),
      messagesByConversation: (() => {
        const { [convId]: _, ...rest } = s.messagesByConversation;
        return rest;
      })(),
      activeConversationId:
        s.activeConversationId === convId ? null : s.activeConversationId,
    }));
  },

  // ===================== Reaction Actions =====================

  addReaction: (convId: string, msgId: string, emoji: string, userId: string) => {
    const { messagesByConversation } = get();
    const msgs = messagesByConversation[convId];
    if (!msgs) return;

    // 乐观更新
    set({
      messagesByConversation: {
        ...messagesByConversation,
        [convId]: msgs.map((m) => {
          if (m.id !== msgId) return m;
          const reactions = m.reactions ? [...m.reactions] : [];
          const existing = reactions.find((r) => r.emoji === emoji);
          if (existing) {
            if (!existing.userIds.includes(userId)) {
              existing.userIds = [...existing.userIds, userId];
            }
          } else {
            reactions.push({ emoji, userIds: [userId] });
          }
          return { ...m, reactions };
        }),
      },
    });

    // 同步到服务端
    wsClient.send('reaction', { message_id: Number(msgId), emoji, action: 'add' });
  },

  removeReaction: (convId: string, msgId: string, emoji: string, userId: string) => {
    const { messagesByConversation } = get();
    const msgs = messagesByConversation[convId];
    if (!msgs) return;

    // 乐观更新
    set({
      messagesByConversation: {
        ...messagesByConversation,
        [convId]: msgs.map((m) => {
          if (m.id !== msgId || !m.reactions) return m;
          const reactions = m.reactions
            .map((r) => {
              if (r.emoji !== emoji) return r;
              return { ...r, userIds: r.userIds.filter((id) => id !== userId) };
            })
            .filter((r) => r.userIds.length > 0);
          return { ...m, reactions };
        }),
      },
    });

    // 同步到服务端
    wsClient.send('reaction', { message_id: Number(msgId), emoji, action: 'remove' });
  },

  // ===================== 线程 Actions =====================

  openThread: (msgId: string) => set({ activeThreadRootId: msgId }),

  closeThread: () => set({ activeThreadRootId: null }),

  // ===================== 主题 Action =====================

  setTheme: (theme: 'light' | 'dark') => {
    applyTheme(theme);
    set({ theme });
  },

  // ===================== Selectors =====================

  getActiveConversation: (): Conversation | undefined => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId);
  },

  getActiveMessages: (): Message[] => {
    const { messagesByConversation, activeConversationId } = get();
    if (!activeConversationId) return [];
    return (messagesByConversation[activeConversationId] ?? []).filter(
      (m) => m.threadRootId === null || m.threadRootId === undefined,
    );
  },

  getThreadMessages: (): Message[] => {
    const { messagesByConversation, activeConversationId, activeThreadRootId } = get();
    if (!activeConversationId || !activeThreadRootId) return [];
    return (messagesByConversation[activeConversationId] ?? []).filter(
      (m) => m.threadRootId === activeThreadRootId || m.id === activeThreadRootId,
    );
  },

  getUnreadTotal: (): number => {
    return get().conversations.reduce(
      (sum, c) => (c.isMuted ? sum : sum + c.unreadCount),
      0,
    );
  },
}));

// ===================== WebSocket 事件处理 =====================
// 在模块加载时注册，确保只注册一次

/** 接收新消息：服务端通过 new_msg 推送 */
wsClient.on('new_msg', (env) => {
  const apiMsg = env.data as Record<string, unknown>;
  const clientMsgId = apiMsg.client_msg_id ? String(apiMsg.client_msg_id) : undefined;
  const message: Message = {
    id: String(apiMsg.id ?? apiMsg.message_id),
    conversationId: String(apiMsg.conversation_id),
    senderId: String(apiMsg.sender_id),
    type: msgTypeMap[apiMsg.msg_type as number] ?? 'text',
    content: apiMsg.content as string,
    status: 'sent',
    createdAt: apiMsg.created_at ? new Date(apiMsg.created_at as string).getTime() : Date.now(),
    quoteId: apiMsg.reply_to ? String(apiMsg.reply_to) : undefined,
    threadRootId: apiMsg.thread_root_id ? String(apiMsg.thread_root_id) : undefined,
    mentionIds: apiToStringArray(apiMsg.mention_ids),
  };

  if (clientMsgId) {
    const store = useChatStore.getState();
    const msgs = store.messagesByConversation[message.conversationId] ?? [];
    const pendingIndex = msgs.findIndex((m) => m.id === clientMsgId);
    if (pendingIndex >= 0) {
      const nextMsgs = [...msgs];
      nextMsgs[pendingIndex] = message;
      useChatStore.setState((s) => ({
        messagesByConversation: {
          ...s.messagesByConversation,
          [message.conversationId]: nextMsgs,
        },
        lastSeq: wsClient.getLastSeq(),
      }));
      return;
    }
  }

  useChatStore.getState().addMessage(message);

  // 桌面通知（Electron 环境 + 窗口不在前台 + 非活跃会话）
  if (isElectron() && !document.hasFocus()) {
    const store = useChatStore.getState();
    const sender = store.users[message.senderId];
    const conv = store.conversations.find((c) => c.id === message.conversationId);
    const isMentioned =
      !!store.currentUser &&
      message.senderId !== store.currentUser.id &&
      !!message.mentionIds?.some((id) => id === store.currentUser?.id || id === 'all');
    if (message.senderId !== store.currentUser?.id && (!conv?.isMuted || isMentioned)) {
      const title = conv
        ? `${isMentioned ? '[有人@你] ' : ''}${sender?.nickname ?? '新消息'}${conv.type === 'channel' ? ` - ${conv.name}` : ''}`
        : '纸条 · 新消息';
      const body =
        message.type === 'text'
          ? message.content
          : message.type === 'image'
            ? '[图片]'
            : message.type === 'video'
              ? '[视频]'
              : '[文件]';
      window.electronAPI?.showNotification(title, body);
    }
  }
});

wsClient.on('connected', () => {
  useChatStore.setState({ wsStatus: 'connected' });
});

wsClient.on('connecting', () => {
  useChatStore.setState({ wsStatus: 'connecting' });
});

wsClient.on('disconnected', () => {
  useChatStore.setState({ wsStatus: 'disconnected' });
});

wsClient.on('error', (env) => {
  const message = (env.data.message as string) || 'WebSocket 错误';
  alert(message);
});

/** 消息状态更新（撤回等）：服务端通过 msg_status 推送 */
wsClient.on('msg_status', (env) => {
  const data = env.data as { message_id: number; conversation_id: number; status: number };
  const convId = String(data.conversation_id);
  const msgId = String(data.message_id);

  if (data.status === 1) {
    // 撤回：更新消息内容为撤回提示
    const store = useChatStore.getState();
    const msgs = store.messagesByConversation[convId];
    if (!msgs) return;
    const msg = msgs.find((m) => m.id === msgId);
    if (!msg) return;

    const isOwn = msg.senderId === store.currentUser?.id;
    const newMsgs = msgs.map((m) =>
      m.id === msgId
        ? {
            ...m,
            content: isOwn ? '你撤回了一条消息' : '对方撤回了一条消息',
            status: 'sent' as const,
          }
        : m,
    );
    useChatStore.setState((s) => ({
      messagesByConversation: { ...s.messagesByConversation, [convId]: newMsgs },
    }));
  }
});

/** 群公告更新实时推送 */
wsClient.on('announcement_updated', (env) => {
  const data = env.data as Record<string, unknown>;
  const convId = String(data.conversation_id ?? '');
  if (!convId) return;

  void useChatStore.getState().getAnnouncements(convId);

  if (isElectron() && !document.hasFocus()) {
    const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
    window.electronAPI?.showNotification(
      '纸条 · 群公告更新',
      conv ? `${conv.name} 发布了新公告` : '有群聊发布了新公告',
    );
  }
});

/** 好友请求实时推送 */
wsClient.on('friend_request', (env) => {
  const request = apiToFriendRequest(env.data as Record<string, unknown>);
  useChatStore.setState((state) => {
    const exists = state.friendRequests.some((r) => r.id === request.id);
    return {
      friendRequests: exists
        ? state.friendRequests.map((r) => (r.id === request.id ? request : r))
        : [request, ...state.friendRequests],
      users: {
        ...state.users,
        [request.fromUserId]: {
          id: request.fromUserId,
          username: request.fromUsername,
          nickname: request.fromNickname,
          avatarUrl: request.fromAvatarUrl,
          status: 'offline',
        },
      },
    };
  });
  showFriendNotification('纸条 · 好友请求', `${request.fromNickname || request.fromUsername} 请求添加你为好友`);
});

/** 好友请求处理结果实时推送 */
wsClient.on('friend_request_result', (env) => {
  const data = env.data as Record<string, unknown>;
  const status = String(data.status ?? '');
  const friendId = String(data.user_id ?? '');
  const nickname = String(data.nickname ?? data.username ?? '对方');

  useChatStore.setState((state) => ({
    friendRequests: state.friendRequests.map((r) =>
      r.id === String(data.request_id)
        ? { ...r, status: status === 'accepted' ? 'accepted' : 'rejected' }
        : r,
    ),
    users: friendId
      ? {
          ...state.users,
          [friendId]: {
            id: friendId,
            username: String(data.username ?? ''),
            nickname,
            avatarUrl: String(data.avatar ?? ''),
            status: 'offline',
          },
        }
      : state.users,
  }));

  const store = useChatStore.getState();
  if (status === 'accepted') {
    void store.fetchFriends();
    void store.fetchConversations();
    showFriendNotification('纸条 · 好友请求已通过', `${nickname} 已同意你的好友请求`);
  } else if (status === 'rejected') {
    showFriendNotification('纸条 · 好友请求被拒绝', `${nickname} 已拒绝你的好友请求`);
  }
});

// ---------- profile_updated：资料变更实时同步 ----------
wsClient.on('profile_updated', (env) => {
  const data = env.data as Record<string, unknown>;
  const userId = String(data.user_id ?? '');
  const nickname = (data.nickname as string) ?? '';
  const avatar = (data.avatar as string) ?? '';
  if (!userId) return;

  const store = useChatStore.getState();
  const old = store.users[userId];

  useChatStore.setState((state) => ({
    users: {
      ...state.users,
      [userId]: {
        ...(state.users[userId] ?? { id: userId, username: '', nickname: '', avatarUrl: '', status: 'offline' }),
        nickname,
        avatarUrl: avatar,
      },
    },
  }));

  // 如果信息确实有变化，更新关联数据
  if (old && old.nickname !== nickname) {
    // 更新好友列表
    useChatStore.setState((state) => ({
      friends: state.friends.map((f) =>
        f.userId === userId ? { ...f, nickname, avatarUrl: avatar } : f,
      ),
    }));

    // 更新 DM 会话的 name / avatarUrl（以对方昵称/头像命名）
    useChatStore.setState((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.type !== 'dm') return c;
        // 检查该 DM 的成员是否包含此用户
        if (!c.memberIds?.includes(userId)) return c;
        return { ...c, name: nickname, avatarUrl: avatar };
      }),
    }));
  } else if (old && old.avatarUrl !== avatar) {
    // 仅头像变化：更新好友列表和 DM 会话头像
    useChatStore.setState((state) => ({
      friends: state.friends.map((f) =>
        f.userId === userId ? { ...f, avatarUrl: avatar } : f,
      ),
      conversations: state.conversations.map((c) => {
        if (c.type !== 'dm') return c;
        if (!c.memberIds?.includes(userId)) return c;
        return { ...c, avatarUrl: avatar };
      }),
    }));
  }
});

// ---------- reaction_updated：消息回应实时同步 ----------
wsClient.on('reaction_updated', (env) => {
  const data = env.data as Record<string, unknown>;
  const msgId = String(data.message_id ?? '');
  const reactions = apiToReactions(data.reactions) ?? [];
  if (!msgId) return;

  useChatStore.setState((state) => {
    // 遍历所有会话的消息列表，找到目标消息并更新 reactions
    let found = false;
    const updated: Record<string, Message[]> = {};
    for (const convId of Object.keys(state.messagesByConversation)) {
      const msgs = state.messagesByConversation[convId];
      if (!msgs) continue;
      const idx = msgs.findIndex((m) => m.id === msgId);
      if (idx === -1) continue;
      found = true;
      updated[convId] = msgs.map((m, i) =>
        i === idx ? { ...m, reactions: reactions.length > 0 ? reactions : undefined } : m,
      );
      break;
    }
    if (!found) return state;
    return { messagesByConversation: { ...state.messagesByConversation, ...updated } };
  });
});

// ---------- 桌面通知点击：显示主窗口并跳转到对应会话 ----------
if (isElectron() && window.electronAPI) {
  window.electronAPI.onNotificationClick(() => {
    window.location.hash = '#/';
  });
}

function showFriendNotification(title: string, body: string): void {
  if (isElectron() && !document.hasFocus()) {
    window.electronAPI?.showNotification(title, body);
  }
}
