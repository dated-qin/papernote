/* ============================================
   纸条 PaperNote — Electron API 类型声明
   与 electron/preload.ts 中 contextBridge 暴露的 API 对应
   ============================================ */

interface ElectronAPI {
  /** 最小化窗口 */
  minimize: () => void;
  /** 最大化/还原窗口 */
  maximize: () => void;
  /** 关闭窗口（隐藏到托盘） */
  close: () => void;
  /** 窗口是否已最大化 */
  isMaximized: () => Promise<boolean>;
  /** 监听窗口最大化状态变化 */
  onMaximizeChange: (cb: (maximized: boolean) => void) => void;
  /** 显示桌面通知 */
  showNotification: (title: string, body: string) => void;
  /** 通知点击回调 */
  onNotificationClick: (cb: () => void) => void;
  /** 快捷键：聚焦搜索 */
  onFocusSearch: (cb: () => void) => void;
  /** 托盘在线状态变化 */
  onStatusChange: (cb: (status: 'online' | 'invisible') => void) => void;
  /** 获取应用版本 */
  getAppVersion: () => Promise<string>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
