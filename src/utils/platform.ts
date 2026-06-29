/* ============================================
   纸条 PaperNote — 平台判断工具
   ============================================ */

/**
 * 判断当前是否运行在 Electron 桌面环境中
 * 双保险：preload 暴露的 electronAPI + userAgent 兜底
 */
export const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;
  // 方法 1：preload 注入
  if ((window as unknown as { electronAPI?: unknown }).electronAPI) return true;
  // 方法 2：userAgent 兜底（preload 加载失败时仍能识别 Electron 环境）
  return /Electron/i.test(navigator.userAgent);
};
