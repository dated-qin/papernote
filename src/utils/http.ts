/* ============================================
   纸条 PaperNote — Axios HTTP 客户端封装
   含 JWT Token 自动附加、401 拦截、统一错误处理
   响应拦截器自动解包 res.data → ApiResponse<T>
   ============================================ */

import axios, { AxiosError, InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios';
import { handleApiError } from './errorHandler';
import { tokenStorage } from './token';

// ---------- 统一响应类型 ----------
/** 所有 API 响应的统一结构 */
export interface ApiResponse<T = unknown> {
  code: number;   // 0 = 成功，非 0 = 错误码
  message: string;
  data: T;
}

// ---------- 创建 Axios 实例 ----------
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ---------- 请求拦截器：自动附加 JWT Token ----------
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ---------- Token 刷新：防并发 ----------

let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return null;

  // 如果已有刷新进行中，等待同一个 Promise
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await axios.post<{ code: number; data?: { token: string; refresh_token?: string } }>(
        `${instance.defaults.baseURL}/api/auth/refresh`,
        { refresh_token: refreshToken },
      );
      if (res.data.code === 0 && res.data.data?.token) {
        tokenStorage.set(res.data.data.token);
        if (res.data.data.refresh_token) tokenStorage.setRefresh(res.data.data.refresh_token);
        return res.data.data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------- 响应拦截器：统一数据解包 & 错误处理 ----------
instance.interceptors.response.use(
  (res) => {
    // 业务错误码处理（code !== 0）
    if (res.data && typeof res.data.code === 'number' && res.data.code !== 0) {
      handleApiError(res.data.code, res.data.message);
      return Promise.reject(new Error(res.data.message || '请求失败'));
    }
    return res.data;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data as { code?: number; message?: string } | undefined;

    if (status === 401 && data?.code === 40101) {
      // Token 过期 → 尝试刷新
      const newToken = await tryRefreshToken();
      if (newToken && error.config) {
        // 重试原请求
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return instance.request(error.config);
      }
      // 刷新失败 → 清除登录状态
      tokenStorage.clear();
      handleApiError(401, '登录已过期，请重新登录');
      window.location.hash = '#/login';
      return Promise.reject(error);
    }

    if (status === 401) {
      handleApiError(401, '登录已过期');
    } else if (status === 400) {
      const msg = data?.message || '请求参数错误';
      alert(msg);
    } else if (!error.response) {
      alert('网络连接失败，请检查网络');
    } else if (status && status >= 500) {
      handleApiError(500);
    }
    return Promise.reject(error);
  },
);

// ---------- 类型安全的 HTTP 方法包装 ----------
// 因为拦截器解包了 res.data，实际返回值已是 ApiResponse<T>

const http = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    instance.get<ApiResponse<T>>(url, config) as unknown as Promise<ApiResponse<T>>,

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.post<ApiResponse<T>>(url, data, config) as unknown as Promise<ApiResponse<T>>,

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.put<ApiResponse<T>>(url, data, config) as unknown as Promise<ApiResponse<T>>,

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.patch<ApiResponse<T>>(url, data, config) as unknown as Promise<ApiResponse<T>>,

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    instance.delete<ApiResponse<T>>(url, config) as unknown as Promise<ApiResponse<T>>,
};

export default http;
