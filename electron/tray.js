import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
let tray = null;
export function setupTray(win) {
  let icon;
  try { icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png')).resize({ width: 16, height: 16 }); }
  catch { icon = nativeImage.createEmpty(); }
  tray = new Tray(icon);
  tray.setToolTip('纸条 PaperNote');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => { win.show(); win.focus(); } },
    { label: '在线状态', submenu: [
      { label: '在线', type: 'radio', checked: true, click: () => win.webContents.send('status-change', 'online') },
      { label: '隐身', type: 'radio', click: () => win.webContents.send('status-change', 'invisible') },
    ]},
    { type: 'separator' },
    { label: '退出纸条', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => { win.show(); win.focus(); });
}
export function getTray() { return tray; }
