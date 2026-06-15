/* ============================================
   纸条 PaperNote — MSW API Mock Handlers
   模拟登录、会话、消息等 API 响应
   ============================================ */

import { http, HttpResponse } from 'msw';

const API = 'https://api.papernote.local';

export const handlers = [
  // POST /api/auth/login
  http.post(`${API}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { account: string; password: string };
    if (body.account === 'user123' && body.password === 'pass123') {
      return HttpResponse.json({
        code: 0,
        data: { user_id: 1, token: 'mock-jwt-token' },
      });
    }
    return HttpResponse.json(
      { code: 401, message: '密码错误' },
      { status: 401 },
    );
  }),

  // POST /api/auth/register
  http.post(`${API}/api/auth/register`, async () => {
    return HttpResponse.json({
      code: 0,
      data: { user_id: 2, token: 'mock-jwt-token-2' },
    });
  }),

  // GET /api/auth/me
  http.get(`${API}/api/auth/me`, () => {
    return HttpResponse.json({
      code: 0,
      data: {
        id: 1,
        username: 'user123',
        nickname: '测试用户',
        avatar: '',
        phone: '138****8000',
        email: 'u***@example.com',
        status: 0,
        created_at: '2026-06-01T12:00:00Z',
      },
    });
  }),

  // GET /api/conversations
  http.get(`${API}/api/conversations`, () => {
    return HttpResponse.json({
      code: 0,
      data: {
        conversations: [
          {
            id: 1,
            type: 'dm',
            title: '李四',
            avatar: null,
            unread_count: 3,
            muted: false,
            pinned: false,
            last_message: {
              id: 10,
              content: '你好!',
              sender_id: 2,
              msg_type: 0,
              created_at: '2026-06-14T10:00:00Z',
            },
          },
          {
            id: 2,
            type: 'channel',
            title: '项目组',
            avatar: null,
            unread_count: 0,
            muted: false,
            pinned: true,
          },
        ],
      },
    });
  }),

  // GET /api/conversations/:id/messages
  http.get(`${API}/api/conversations/:id/messages`, () => {
    return HttpResponse.json({
      code: 0,
      data: {
        messages: [
          {
            id: 1,
            conversation_id: 1,
            sender_id: 1,
            msg_type: 0,
            content: '你好',
            reply_to: null,
            thread_root_id: null,
            status: 0,
            created_at: '2026-06-14T09:00:00Z',
          },
          {
            id: 2,
            conversation_id: 1,
            sender_id: 2,
            msg_type: 0,
            content: 'Hi!',
            reply_to: null,
            thread_root_id: null,
            status: 0,
            created_at: '2026-06-14T09:05:00Z',
          },
        ],
      },
    });
  }),

  // GET /api/messages/:id
  http.get(`${API}/api/messages/:id`, ({ params }) => {
    return HttpResponse.json({
      code: 0,
      data: {
        message: {
          id: Number(params.id),
          conversation_id: 1,
          sender_id: 2,
          msg_type: 0,
          content: '被引用的消息',
          reply_to: null,
          thread_root_id: null,
          status: 0,
          created_at: '2026-06-14T09:02:00Z',
        },
      },
    });
  }),

  // POST /api/conversations/dm
  http.post(`${API}/api/conversations/dm`, () => {
    return HttpResponse.json({ code: 0, data: { id: 3 } });
  }),

  // POST /api/conversations/channel
  http.post(`${API}/api/conversations/channel`, () => {
    return HttpResponse.json({ code: 0, data: { id: 4 } });
  }),
];
