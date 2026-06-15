/* ============================================
   纸条 PaperNote — chatStore 单元测试
   测试 markAsRead / incrementUnread / getUnreadTotal / sendMessage
   ============================================ */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../chatStore';
import { wsClient } from '../../utils/ws';
import http from '../../utils/http';

// 模拟 wsClient（避免 WebSocket 连接尝试）
vi.mock('../../utils/ws', () => ({
  wsClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getLastSeq: () => 0,
  },
}));

// 模拟 http（避免网络请求）
vi.mock('../../utils/http', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {} }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {} }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {} }),
    delete: vi.fn().mockResolvedValue({ code: 0, data: {} }),
    patch: vi.fn().mockResolvedValue({ code: 0, data: {} }),
  },
}));

describe('chatStore', () => {
  beforeEach(() => {
    vi.mocked(wsClient.send).mockClear();
    vi.mocked(wsClient.connect).mockClear();
    vi.mocked(wsClient.disconnect).mockClear();
    vi.mocked(wsClient.off).mockClear();
    vi.mocked(http.get).mockClear();
    vi.mocked(http.post).mockClear();
    vi.mocked(http.put).mockClear();
    vi.mocked(http.delete).mockClear();
    vi.mocked(http.patch).mockClear();
    useChatStore.setState({
      currentUser: { id: 'u1', username: 'test', nickname: 'Test', avatarUrl: '', status: 'online' },
      activeConversationId: null,
      conversations: [
        {
          id: '1',
          type: 'dm',
          name: 'User A',
          avatarUrl: '',
          unreadCount: 3,
          isMuted: false,
          isPinned: false,
        },
        {
          id: '2',
          type: 'channel',
          name: 'Group',
          avatarUrl: '',
          unreadCount: 0,
          isMuted: true,
          isPinned: true,
        },
      ],
      messagesByConversation: {},
      announcementsByConversation: {},
      lastSeq: 0,
      activeQuote: null,
    });
  });

  describe('markAsRead', () => {
    it('should set unreadCount to 0 for given conversation', () => {
      useChatStore.getState().markAsRead('1');
      const conv = useChatStore.getState().conversations.find((c) => c.id === '1');
      expect(conv?.unreadCount).toBe(0);
    });

    it('should not affect other conversations', () => {
      useChatStore.getState().markAsRead('1');
      const conv2 = useChatStore.getState().conversations.find((c) => c.id === '2');
      expect(conv2?.unreadCount).toBe(0);
    });
  });

  describe('incrementUnread', () => {
    it('should increment unreadCount by 1', () => {
      useChatStore.getState().incrementUnread('2');
      const conv = useChatStore.getState().conversations.find((c) => c.id === '2');
      expect(conv?.unreadCount).toBe(1);
    });

    it('should not affect other conversations', () => {
      useChatStore.getState().incrementUnread('2');
      const conv1 = useChatStore.getState().conversations.find((c) => c.id === '1');
      expect(conv1?.unreadCount).toBe(3);
    });
  });

  describe('getUnreadTotal', () => {
    it('should sum all unread counts', () => {
      const total = useChatStore.getState().getUnreadTotal();
      expect(total).toBe(3);
    });

    it('should return 0 when all read', () => {
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) => ({ ...c, unreadCount: 0 })),
      }));
      expect(useChatStore.getState().getUnreadTotal()).toBe(0);
    });

    it('should exclude muted conversations', () => {
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === '2' ? { ...c, unreadCount: 5, isMuted: true } : c,
        ),
      }));
      expect(useChatStore.getState().getUnreadTotal()).toBe(3);
    });
  });

  describe('conversation preferences', () => {
    it('should toggle pinned state', async () => {
      vi.mocked(http.put).mockResolvedValueOnce({ code: 0, message: 'ok', data: { pinned: true } });

      await useChatStore.getState().togglePin('1');

      expect(http.put).toHaveBeenCalledWith('/api/conversations/1/pin');
      expect(useChatStore.getState().conversations.find((c) => c.id === '1')?.isPinned).toBe(true);
    });

    it('should toggle muted state', async () => {
      vi.mocked(http.put).mockResolvedValueOnce({ code: 0, message: 'ok', data: { muted: true } });

      await useChatStore.getState().toggleMute('1');

      expect(http.put).toHaveBeenCalledWith('/api/conversations/1/mute');
      expect(useChatStore.getState().conversations.find((c) => c.id === '1')?.isMuted).toBe(true);
    });
  });

  describe('friend request websocket events', () => {
    it('should add incoming friend requests', () => {
      const handler = getWsHandler('friend_request');

      handler({
        action: 'friend_request',
        data: {
          id: 7,
          from_user_id: 2,
          from_username: 'alice',
          from_nickname: 'Alice',
          from_avatar: '',
          message: 'hello',
          status: 'pending',
          created_at: '2026-06-15T09:00:00Z',
        },
      });

      const request = useChatStore.getState().friendRequests[0];
      expect(request.id).toBe('7');
      expect(request.fromNickname).toBe('Alice');
      expect(request.status).toBe('pending');
    });

    it('should refresh friends and conversations when request is accepted', () => {
      const handler = getWsHandler('friend_request_result');
      handler({
        action: 'friend_request_result',
        data: {
          request_id: 7,
          action: 'accept',
          status: 'accepted',
          user_id: 2,
          username: 'alice',
          nickname: 'Alice',
          avatar: '',
          conversation_id: 9,
        },
      });

      expect(http.get).toHaveBeenCalledWith('/api/friends');
      expect(http.get).toHaveBeenCalledWith('/api/conversations');
      expect(useChatStore.getState().users['2']?.nickname).toBe('Alice');
    });
  });

  describe('announcement websocket events', () => {
    it('should refresh cached announcements when a group announcement changes', async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        code: 0,
        message: 'ok',
        data: {
          announcements: [
            {
              id: 11,
              content: '今晚 8 点同步',
              publisher_id: 1,
              publisher_name: 'Owner',
              read_count: 0,
              total_count: 3,
              created_at: '2026-06-15T09:00:00Z',
              updated_at: '2026-06-15T09:00:00Z',
            },
          ],
        },
      });
      const handler = getWsHandler('announcement_updated');

      handler({
        action: 'announcement_updated',
        data: {
          conversation_id: 2,
          announcement_id: 11,
          action: 'published',
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(http.get).toHaveBeenCalledWith('/api/conversations/2/announcements');
      expect(useChatStore.getState().announcementsByConversation['2'][0].content).toBe(
        '今晚 8 点同步',
      );
    });
  });

  describe('sendMessage', () => {
    it('should not send empty or whitespace-only content', () => {
      useChatStore.setState({ activeConversationId: '1' });
      const before = useChatStore.getState().getActiveMessages().length;
      useChatStore.getState().sendMessage('   ');
      expect(useChatStore.getState().getActiveMessages().length).toBe(before);
    });

    it('should not send without active conversation', () => {
      useChatStore.getState().sendMessage('hello');
      expect(useChatStore.getState().getActiveMessages().length).toBe(0);
    });

    it('should optimistically add pending message', () => {
      useChatStore.setState({ activeConversationId: '1' });
      useChatStore.getState().sendMessage('Hello world');
      const msgs = useChatStore.getState().getActiveMessages();
      expect(msgs.length).toBe(1);
      expect(msgs[0].content).toBe('Hello world');
      expect(msgs[0].status).toBe('sending');
      expect(msgs[0].type).toBe('text');
    });

    it('should support sending with file type', () => {
      useChatStore.setState({ activeConversationId: '1' });
      useChatStore.getState().sendMessage(
        JSON.stringify({ file_id: '1', url: '/test' }),
        undefined,
        undefined,
        'image',
      );
      const msgs = useChatStore.getState().getActiveMessages();
      expect(msgs[0].type).toBe('image');
    });

    it('should send with active quote and clear it', () => {
      useChatStore.setState({ activeConversationId: '1' });
      useChatStore.getState().setQuote('1', '42');
      useChatStore.getState().sendMessage('reply');

      const msgs = useChatStore.getState().getActiveMessages();
      expect(msgs[0].quoteId).toBe('42');
      expect(wsClient.send).toHaveBeenCalledWith(
        'send_msg',
        expect.objectContaining({ reply_to: 42 }),
      );
      expect(useChatStore.getState().activeQuote).toBeNull();
    });
  });

  describe('quote state', () => {
    it('should clear quote when switching conversations', () => {
      useChatStore.getState().setQuote('1', '42');
      useChatStore.getState().setActiveConversation('2');
      expect(useChatStore.getState().activeQuote).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should increment unread when not in active conversation', () => {
      useChatStore.setState({ activeConversationId: '2' });
      useChatStore.getState().addMessage({
        id: 'm1',
        conversationId: '1',
        senderId: 'u2',
        type: 'text',
        content: 'test',
        status: 'sent',
        createdAt: Date.now(),
      });
      const conv = useChatStore.getState().conversations.find((c) => c.id === '1');
      expect(conv?.unreadCount).toBe(4); // was 3, now +1
    });

    it('should not increment unread when in active conversation', () => {
      useChatStore.setState({ activeConversationId: '1' });
      useChatStore.getState().addMessage({
        id: 'm2',
        conversationId: '1',
        senderId: 'u2',
        type: 'text',
        content: 'test',
        status: 'sent',
        createdAt: Date.now(),
      });
      const conv = useChatStore.getState().conversations.find((c) => c.id === '1');
      expect(conv?.unreadCount).toBe(3); // unchanged
    });
  });
});

function getWsHandler(action: string): (env: { action: string; data: Record<string, unknown> }) => void {
  const call = vi.mocked(wsClient.on).mock.calls.find(([registeredAction]) => registeredAction === action);
  if (!call) throw new Error(`missing ws handler: ${action}`);
  return call[1] as (env: { action: string; data: Record<string, unknown> }) => void;
}
