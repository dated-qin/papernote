/* ============================================
   纸条 PaperNote — 顶部标题栏（Electron 桌面端适配）
   Web 端不渲染；Electron 端提供拖拽区 + 窗口控制按钮
   ============================================ */

import React from 'react';
import { isElectron } from '../../utils/platform';

// Electron 专有 CSS 属性
const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export const TitleBar: React.FC = () => {
  // Web 端不显示 TitleBar（浏览器自带标题栏）
  if (!isElectron()) return null;

  const api = window.electronAPI;

  const handleMinimize = () => api?.minimize();
  const handleMaximize = () => api?.maximize();
  const handleClose = () => api?.close();

  return (
    <div
      style={{
        height: 28,
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-sm)',
        flexShrink: 0,
        borderBottom: '1px solid var(--border-default)',
        ...dragStyle,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
          paddingLeft: 'var(--space-sm)',
        }}
      >
        纸条 PaperNote
      </span>

      {/* 窗口控制按钮（仅 Electron 环境显示） */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          ...noDragStyle,
        }}
      >
        <WinButton symbol="─" onClick={handleMinimize} />
        <WinButton symbol="□" onClick={handleMaximize} />
        <WinButton symbol="✕" isClose onClick={handleClose} />
      </div>
    </div>
  );
};

// ---------- 窗口按钮 ----------

const WinButton: React.FC<{
  symbol: string;
  isClose?: boolean;
  onClick: () => void;
}> = ({ symbol, isClose, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: 36,
      height: 28,
      border: 'none',
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      fontSize: 12,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-family)',
    }}
    onMouseEnter={(e) => {
      const el = e.target as HTMLButtonElement;
      el.style.backgroundColor = isClose ? 'var(--accent-red)' : 'var(--bg-hover)';
      if (isClose) el.style.color = 'var(--white)';
    }}
    onMouseLeave={(e) => {
      const el = e.target as HTMLButtonElement;
      el.style.backgroundColor = 'transparent';
      el.style.color = 'var(--text-secondary)';
    }}
  >
    {symbol}
  </button>
);
