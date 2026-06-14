/* ============================================
   纸条 PaperNote — Token 存储工具
   JWT Token 的读取、写入、删除封装
   ============================================ */

export const tokenStorage = {
  get: (): string | null => localStorage.getItem('token'),
  set: (token: string): void => localStorage.setItem('token', token),
  remove: (): void => localStorage.removeItem('token'),
};
