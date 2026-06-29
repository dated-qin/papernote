import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (cb) => ipcRenderer.on('window-maximize-change', (_e, v) => cb(v)),
  showNotification: (t, b) => ipcRenderer.send('show-notification', { title: t, body: b }),
  onNotificationClick: (cb) => ipcRenderer.on('notification-clicked', () => cb()),
  onFocusSearch: (cb) => ipcRenderer.on('focus-search', () => cb()),
  onStatusChange: (cb) => ipcRenderer.on('status-change', (_e, s) => cb(s)),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
