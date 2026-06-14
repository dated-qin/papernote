/* ============================================
   纸条 PaperNote — 系统托盘
   右键菜单：显示主窗口 / 在线状态 / 退出
   ============================================ */

import { BrowserWindow, Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow): void {
  // 使用 16×16 图标
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  let icon: nativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    // 回退：创建空白图标
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('纸条 PaperNote');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: '在线状态',
      submenu: [
        {
          label: '在线',
          type: 'radio',
          checked: true,
          click: () => {
            mainWindow.webContents.send('status-change', 'online');
          },
        },
        {
          label: '隐身',
          type: 'radio',
          checked: false,
          click: () => {
            mainWindow.webContents.send('status-change', 'invisible');
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: '退出纸条',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // 双击托盘图标 → 显示主窗口
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

/** 获取托盘实例（供外部销毁） */
export function getTray(): Tray | null {
  return tray;
}
