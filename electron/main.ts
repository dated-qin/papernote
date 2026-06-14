/* ============================================
   纸条 PaperNote — Electron 主进程
   BrowserWindow / IPC / 系统托盘 / 全局快捷键
   ============================================ */

import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Notification,
} from 'electron';
import path from 'path';
import { setupTray } from './tray';

// ---------- 全局引用 ----------

let mainWindow: BrowserWindow | null = null;

// 扩展 app 类型标记是否主动退出
(app as any).isQuitting = false;

// ---------- 创建窗口 ----------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // 无边框 → 使用自定义 TitleBar
    titleBarStyle: 'hidden', // macOS 隐藏原生标题栏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // 安全
      contextIsolation: true, // 安全
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  // 加载页面：开发模式 → Vite dev server，生产 → dist/index.html
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER === 'true') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 点击关闭 → 隐藏到托盘（而非退出）
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 通知渲染进程窗口最大化状态变化
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximize-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximize-change', false);
  });
}

// ---------- IPC 窗口控制 ----------

function setupIPC(): void {
  ipcMain.on('window-minimize', () => mainWindow?.minimize());

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => mainWindow?.close());

  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

  // 桌面通知
  ipcMain.on(
    'show-notification',
    (_event, { title, body }: { title: string; body: string }) => {
      if (mainWindow?.isFocused()) return; // 窗口在前台不弹通知

      const notification = new Notification({
        title,
        body,
        icon: path.join(__dirname, '../assets/icon.png'),
      });

      notification.on('click', () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('notification-clicked');
      });

      notification.show();
    },
  );

  // 应用版本
  ipcMain.handle('get-app-version', () => app.getVersion());
}

// ---------- 全局快捷键 ----------

function setupShortcuts(): void {
  // Ctrl+Shift+N：显示主窗口
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Ctrl+Shift+Space：快速搜索
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.webContents.send('focus-search');
  });
}

// ---------- 应用生命周期 ----------

app.whenReady().then(() => {
  createWindow();
  setupIPC();
  setupTray(mainWindow!);
  setupShortcuts();

  // macOS: 点击 dock 图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 退出前清理
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 确保单实例
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
