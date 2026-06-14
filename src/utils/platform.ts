/* ============================================
   纸条 PaperNote — 平台判断工具
   ============================================ */

/** 判断当前是否运行在 Electron 桌面环境中 */
export const isElectron = (): boolean =>
  !!(window as unknown as { electronAPI?: unknown }).electronAPI;
