/* ============================================
   纸条 PaperNote — 演示数据注入
   ============================================ */

import { useChatStore } from './store/chatStore';
import type { User, Workspace, Conversation, Message } from './types';

/** Zustand store 的底层 setState（绕过类型限制批量注入） */
const setState = useChatStore.setState as (partial: Partial<ReturnType<typeof useChatStore.getState>>) => void;

/** 注入演示数据 */
export function seedDemoData() {
  const store = useChatStore.getState();

  // 避免重复注入
  if (store.currentUser) return;

  // ---- 用户 ----
  const users: User[] = [
    { id: 'u1', username: 'leah', nickname: 'Leah', avatarUrl: '', status: 'online' },
    { id: 'u2', username: 'mike', nickname: 'Mike Chen', avatarUrl: '', status: 'online' },
    { id: 'u3', username: 'sarah', nickname: 'Sarah Wang', avatarUrl: '', status: 'away' },
    { id: 'u4', username: 'alex', nickname: 'Alex Li', avatarUrl: '', status: 'offline' },
    { id: 'u5', username: 'emma', nickname: 'Emma Zhang', avatarUrl: '', status: 'online' },
  ];
  store.setUsers(users);
  store.setCurrentUser(users[0]);

  // ---- 工作区 ----
  const workspaces: Workspace[] = [
    { id: 'ws1', name: '纸条', iconUrl: '' },
    { id: 'ws2', name: '团队', iconUrl: '' },
    { id: 'ws3', name: '个人', iconUrl: '' },
  ];
  setState({ workspaces, activeWorkspaceId: 'ws1' });

  // ---- 会话 ----
  const now = Date.now();
  const conversations: Conversation[] = [
    {
      id: 'conv-1', type: 'channel', name: '综合讨论',
      avatarUrl: '', memberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
      unreadCount: 0, isMuted: false, isPinned: true,
      lastMessage: { id: 'm3', conversationId: 'conv-1', senderId: 'u3', type: 'text', content: '好的，明天会议见！', status: 'sent', createdAt: now - 60000 },
    },
    {
      id: 'conv-2', type: 'channel', name: '前端技术交流',
      avatarUrl: '', memberIds: ['u1', 'u2', 'u3'],
      unreadCount: 5, isMuted: false, isPinned: false,
      lastMessage: { id: 'm7', conversationId: 'conv-2', senderId: 'u2', type: 'text', content: 'React 19 的新特性确实不错', status: 'sent', createdAt: now - 120000 },
    },
    {
      id: 'conv-3', type: 'channel', name: '产品需求讨论',
      avatarUrl: '', memberIds: ['u1', 'u4', 'u5'],
      unreadCount: 0, isMuted: false, isPinned: false,
      lastMessage: { id: 'm12', conversationId: 'conv-3', senderId: 'u4', type: 'text', content: 'PRD 我已经更新到 V2.3 了', status: 'sent', createdAt: now - 3600000 },
    },
    {
      id: 'conv-4', type: 'dm', name: 'Mike Chen',
      avatarUrl: '', unreadCount: 2, isMuted: false, isPinned: false,
      lastMessage: { id: 'm15', conversationId: 'conv-4', senderId: 'u2', type: 'text', content: '午餐约吗？', status: 'sent', createdAt: now - 300000 },
    },
    {
      id: 'conv-5', type: 'dm', name: 'Sarah Wang',
      avatarUrl: '', unreadCount: 0, isMuted: true, isPinned: false,
      lastMessage: { id: 'm18', conversationId: 'conv-5', senderId: 'u3', type: 'text', content: '收到，谢谢！', status: 'sent', createdAt: now - 7200000 },
    },
    {
      id: 'conv-6', type: 'dm', name: 'Alex Li',
      avatarUrl: '', unreadCount: 0, isMuted: false, isPinned: false,
      lastMessage: { id: 'm22', conversationId: 'conv-6', senderId: 'u1', type: 'text', content: '好的，我今天看一下', status: 'sent', createdAt: now - 86400000 },
    },
  ];
  setState({ conversations, activeConversationId: 'conv-1' });

  // ---- 消息 ----
  const messagesConv1: Message[] = [
    { id: 'm1', conversationId: 'conv-1', senderId: 'u2', type: 'text', content: '大家好！周末的活动安排出来了吗？', status: 'sent', createdAt: now - 3600000 * 3, reactions: [{ emoji: '👀', userIds: ['u1', 'u3'] }] },
    { id: 'm2', conversationId: 'conv-1', senderId: 'u1', type: 'text', content: '还没有，等 Sarah 确认场地。', status: 'sent', createdAt: now - 3600000 * 2.5, replyCount: 2 },
    { id: 'm2-reply1', conversationId: 'conv-1', senderId: 'u3', type: 'text', content: '场地已经订好了，周六下午 2 点', status: 'sent', createdAt: now - 3600000 * 2.4, threadRootId: 'm2' },
    { id: 'm2-reply2', conversationId: 'conv-1', senderId: 'u1', type: 'text', content: '太好了！我通知其他人', status: 'sent', createdAt: now - 3600000 * 2.3, threadRootId: 'm2' },
    { id: 'm3', conversationId: 'conv-1', senderId: 'u3', type: 'text', content: '好的，明天会议见！', status: 'sent', createdAt: now - 60000, reactions: [{ emoji: '👍', userIds: ['u1', 'u2', 'u3', 'u4'] }] },
  ];

  const messagesConv2: Message[] = [
    { id: 'm5', conversationId: 'conv-2', senderId: 'u2', type: 'text', content: '有人用过 Zustand 吗？和 Redux 比怎么样？', status: 'sent', createdAt: now - 3600000 },
    { id: 'm6', conversationId: 'conv-2', senderId: 'u1', type: 'text', content: 'Zustand 轻量很多，API 也很直观，推荐试试', status: 'sent', createdAt: now - 1800000 },
    { id: 'm7', conversationId: 'conv-2', senderId: 'u2', type: 'text', content: 'React 19 的新特性确实不错', status: 'sent', createdAt: now - 120000 },
    { id: 'm8', conversationId: 'conv-2', senderId: 'u3', type: 'text', content: 'Server Components 现在稳定了吗？', status: 'sent', createdAt: now - 600000 },
    { id: 'm9', conversationId: 'conv-2', senderId: 'u1', type: 'text', content: '稳定了，Next.js 15 已经全面支持', status: 'sent', createdAt: now - 300000, replyCount: 1 },
    { id: 'm9-r1', conversationId: 'conv-2', senderId: 'u3', type: 'text', content: '太好了，我试试看！', status: 'sent', createdAt: now - 280000, threadRootId: 'm9' },
  ];

  const messagesConv3: Message[] = [
    { id: 'm10', conversationId: 'conv-3', senderId: 'u4', type: 'text', content: '新版本的需求文档我整理好了', status: 'sent', createdAt: now - 7200000 },
    { id: 'm11', conversationId: 'conv-3', senderId: 'u5', type: 'text', content: '收到了，我看看先', status: 'sent', createdAt: now - 7000000, reactions: [{ emoji: '👍', userIds: ['u4'] }] },
    { id: 'm12', conversationId: 'conv-3', senderId: 'u4', type: 'text', content: 'PRD 我已经更新到 V2.3 了', status: 'sent', createdAt: now - 3600000, replyCount: 1 },
    { id: 'm12-r1', conversationId: 'conv-3', senderId: 'u1', type: 'text', content: 'V2.3 的登录流程改得很好', status: 'sent', createdAt: now - 3500000, threadRootId: 'm12' },
  ];

  const messagesConv4: Message[] = [
    { id: 'm14', conversationId: 'conv-4', senderId: 'u1', type: 'text', content: 'Mike，部署文档更新了吗？', status: 'sent', createdAt: now - 3600000 },
    { id: 'm15', conversationId: 'conv-4', senderId: 'u2', type: 'text', content: '午餐约吗？', status: 'sent', createdAt: now - 300000 },
    { id: 'm16', conversationId: 'conv-4', senderId: 'u2', type: 'text', content: '楼下面馆怎么样？', status: 'sent', createdAt: now - 280000 },
    { id: 'm17', conversationId: 'conv-4', senderId: 'u1', type: 'text', content: '好啊，12 点楼下见', status: 'sent', createdAt: now - 250000, reactions: [{ emoji: '🎉', userIds: ['u2'] }] },
  ];

  const messagesConv5: Message[] = [
    { id: 'm18', conversationId: 'conv-5', senderId: 'u3', type: 'text', content: '周末的活动场地我已经定好了，周六下午2点', status: 'sent', createdAt: now - 7200000 },
    { id: 'm19', conversationId: 'conv-5', senderId: 'u1', type: 'text', content: '太棒了！需要我帮忙通知其他人吗？', status: 'sent', createdAt: now - 7100000 },
    { id: 'm20', conversationId: 'conv-5', senderId: 'u3', type: 'text', content: '收到，谢谢！', status: 'sent', createdAt: now - 7000000 },
  ];

  const messagesConv6: Message[] = [
    { id: 'm21', conversationId: 'conv-6', senderId: 'u4', type: 'text', content: 'Leah，上次说的 CI/CD 流程优化你有空看看吗？', status: 'sent', createdAt: now - 86400000 * 2 },
    { id: 'm22', conversationId: 'conv-6', senderId: 'u1', type: 'text', content: '好的，我今天看一下', status: 'sent', createdAt: now - 86400000 },
  ];

  setState({
    messagesByConversation: {
      'conv-1': messagesConv1,
      'conv-2': messagesConv2,
      'conv-3': messagesConv3,
      'conv-4': messagesConv4,
      'conv-5': messagesConv5,
      'conv-6': messagesConv6,
    },
  });
}
