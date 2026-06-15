/* ============================================
   纸条 PaperNote — 认证 Store
   独立 Zustand Store：login / register / logout / fetchCurrentUser
   登录成功后自动建立 WebSocket 连接，并同步 currentUser 到 chatStore
   ============================================ */

import { create } from 'zustand';
import { AxiosError } from 'axios';
import http from '../utils/http';
import { wsClient } from '../utils/ws';
import { tokenStorage } from '../utils/token';
import { useChatStore } from './chatStore';
import type { User, RegisterData } from '../types';

// ---------- 认证 Store 类型 ----------

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  isLoading: boolean;
  errorMessage: string | null;

  login: (account: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

// ---------- 认证/当前用户 API 响应 data 字段类型 ----------

interface AuthResponse {
  user_id: number;
  token: string;
  refresh_token?: string;
}

interface MeResponse {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  bio?: string;
  phone: string;
  email: string;
  status: number;
  role?: string;
  created_at: string;
}

// ---------- 辅助函数：提取 Axios 错误消息 ----------

function getErrorMessage(e: unknown): string {
  if (e instanceof AxiosError) {
    const data = e.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return '网络错误，请稍后重试';
}

// ---------- Store 创建 ----------

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: !!tokenStorage.get(),
  currentUser: null,
  isLoading: false,
  errorMessage: null,

  /** 登录：纸条ID / 手机号 / 邮箱 + 密码 */
  login: async (account: string, password: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const res = await http.post<AuthResponse>('/api/auth/login', {
        account,
        password,
      });
      if (res.code === 0) {
        tokenStorage.set(res.data.token);
        set({ isAuthenticated: true, isLoading: false });
        // 建立 WebSocket 连接
        wsClient.connect(res.data.token);
        // 登录后拉取当前用户信息并同步到 chatStore
        await get().fetchCurrentUser();
      } else {
        set({ isLoading: false, errorMessage: res.message || '登录失败' });
      }
    } catch (e) {
      set({ isLoading: false, errorMessage: getErrorMessage(e) });
      throw e;
    }
  },

  /** 注册 */
  register: async (data: RegisterData) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const res = await http.post<AuthResponse>('/api/auth/register', data);
      if (res.code === 0) {
        tokenStorage.set(res.data.token);
        if (res.data.refresh_token) tokenStorage.setRefresh(res.data.refresh_token);
        set({ isAuthenticated: true, isLoading: false });
        wsClient.connect(res.data.token);
        await get().fetchCurrentUser();
      } else {
        set({ isLoading: false, errorMessage: res.message || '注册失败' });
      }
    } catch (e) {
      set({ isLoading: false, errorMessage: getErrorMessage(e) });
      throw e;
    }
  },

  /** 登出：清除 token、断开 WebSocket、重置状态 */
  logout: () => {
    tokenStorage.clear();
    wsClient.disconnect();
    useChatStore.getState().logout();
    set({ isAuthenticated: false, currentUser: null, errorMessage: null });
  },

  /** 获取当前用户信息并写入 chatStore */
  fetchCurrentUser: async () => {
    try {
      const res = await http.get<MeResponse>('/api/auth/me');
      if (res.code === 0) {
        const user: User = {
          id: String(res.data.id),
          username: res.data.username,
          nickname: res.data.nickname,
          avatarUrl: res.data.avatar || '',
          bio: res.data.bio || '',
          role: res.data.role || 'user',
          status: 'online',
        };
        set({ currentUser: user });
        // 同步到 chatStore
        useChatStore.getState().setCurrentUser(user);
      }
    } catch {
      // token 无效则静默失败，401 拦截器会处理跳转
    }
  },

  /** 清除错误信息 */
  clearError: () => set({ errorMessage: null }),
}));

// ---------- WebSocket "被踢" 处理 ----------
wsClient.on('kick', (env) => {
  const reason = (env.data.reason as string) || '账号在别处登录';
  tokenStorage.clear();
  wsClient.disconnect();
  useChatStore.getState().logout();
  useAuthStore.setState({ isAuthenticated: false, currentUser: null, errorMessage: null });
  alert(reason);
  window.location.hash = '#/login';
});
