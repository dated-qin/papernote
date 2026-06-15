/* ============================================
   纸条 PaperNote — Axios HTTP 客户端封装
   含 JWT Token 自动附加、401 拦截、统一错误处理
   响应拦截器自动解包 res.data → ApiResponse<T>
   ============================================ */

import axios, { AxiosError, InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios';
import { handleApiError } from './errorHandler';

// ---------- 统一响应类型 ----------
/** 所有 API 响应的统一结构 */
export interface ApiResponse<T = unknown> {
  code: number;   // 0 = 成功，非 0 = 错误码
  message: string;
  data: T;
}

// ---------- 创建 Axios 实例 ----------
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8080',
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
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      handleApiError(401, '登录已过期');
    } else if (error.response?.status === 400) {
      // 参数校验失败 → 提取后端返回的具体原因
      const msg =
        (error.response.data as { message?: string })?.message ||
        '请求参数错误';
      alert(msg);
    } else if (!error.response) {
      // 网络错误
      alert('网络连接失败，请检查网络');
    } else if (error.response.status >= 500) {
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
