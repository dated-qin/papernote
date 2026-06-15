/* ============================================
   纸条 PaperNote — Token 存储工具
   JWT access_token + refresh_token 的读取、写入、删除
   ============================================ */

export const tokenStorage = {
  get: (): string | null => localStorage.getItem('token'),
  set: (token: string): void => localStorage.setItem('token', token),
  remove: (): void => localStorage.removeItem('token'),

  getRefresh: (): string | null => localStorage.getItem('refresh_token'),
  setRefresh: (token: string): void => localStorage.setItem('refresh_token', token),
  removeRefresh: (): void => localStorage.removeItem('refresh_token'),

  /** 清除所有 token */
  clear: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  },
};
