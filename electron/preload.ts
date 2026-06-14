/* ============================================
   纸条 PaperNote — Electron 预加载脚本
   通过 contextBridge 安全暴露 IPC API 给渲染进程
   nodeIntegration: false / contextIsolation: true
   ============================================ */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ---------- 窗口控制 ----------
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window-maximize-change', (_event, maximized) => callback(maximized));
  },

  // ---------- 桌面通知 ----------
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  onNotificationClick: (callback: () => void) => {
    ipcRenderer.on('notification-clicked', () => callback());
  },

  // ---------- 快捷键事件 ----------
  onFocusSearch: (callback: () => void) => {
    ipcRenderer.on('focus-search', () => callback());
  },

  // ---------- 托盘在线状态 ----------
  onStatusChange: (callback: (status: 'online' | 'invisible') => void) => {
    ipcRenderer.on('status-change', (_event, status) => callback(status));
  },

  // ---------- 应用版本 ----------
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
