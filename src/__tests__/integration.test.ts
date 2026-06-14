/* ============================================
   纸条 PaperNote — 集成测试
   登录 → 获取会话列表 → 获取历史消息 → 发送消息 完整链路
   使用 MSW 模拟 API
   ============================================ */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../store/chatStore';
import { server } from '../mocks/setup';

// 模拟 wsClient
vi.mock('../utils/ws', () => ({
  wsClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getLastSeq: () => 0,
  },
}));

describe('Integration: Login → Conversations → Messages', () => {
  beforeEach(() => {
    server.resetHandlers();
    useChatStore.setState({
      token: null,
      currentUser: {
        id: '1',
        username: 'user123',
        nickname: '测试用户',
        avatarUrl: '',
        status: 'online',
      },
      activeConversationId: null,
      conversations: [],
      messagesByConversation: {},
    });
  });

  it('should fetch conversations and map to frontend types', async () => {
    const store = useChatStore.getState();

    // 获取会话列表
    await store.fetchConversations();

    const conversations = useChatStore.getState().conversations;
    expect(conversations.length).toBe(2);

    // 验证 API 字段映射
    const dm = conversations.find((c) => c.type === 'dm');
    expect(dm).toBeDefined();
    expect(dm?.name).toBe('李四'); // API title → frontend name
    expect(dm?.unreadCount).toBe(3);

    const channel = conversations.find((c) => c.type === 'channel');
    expect(channel).toBeDefined();
    expect(channel?.isPinned).toBe(true);
  });

  it('should fetch history messages', async () => {
    const store = useChatStore.getState();

    // 获取会话 1 的历史消息
    await store.fetchHistory('1');

    const messages = useChatStore.getState().messagesByConversation['1'];
    expect(messages).toBeDefined();
    expect(messages.length).toBe(2);
    expect(messages[0].content).toBe('你好');
    expect(messages[0].type).toBe('text');
  });

  it('should create a DM conversation', async () => {
    const store = useChatStore.getState();

    const convId = await store.createDM('2');
    expect(convId).toBe('3');
  });

  it('should create a channel', async () => {
    const store = useChatStore.getState();

    const convId = await store.createChannel('测试频道', ['2', '3']);
    expect(convId).toBe('4');
  });
});
