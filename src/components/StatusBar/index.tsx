/* ============================================
   纸条 PaperNote — 底部状态栏
   ============================================ */

import React from 'react';

interface StatusBarProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastSync?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ connectionStatus, lastSync }) => {
  const statusColor = {
    connected: 'var(--accent-green)',
    connecting: 'var(--accent-primary)',
    disconnected: 'var(--accent-red)',
  }[connectionStatus];

  const statusText = {
    connected: '已连接',
    connecting: '连接中…',
    disconnected: '已断开',
  }[connectionStatus];

  return (
    <div
      style={{
        height: 22,
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-muted)',
        fontSize: 'var(--font-size-xs)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-md)',
        borderTop: '1px solid var(--border-default)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 'var(--radius-full)',
            backgroundColor: statusColor,
            display: 'inline-block',
          }}
        />
        <span>{statusText}</span>
      </div>
      {lastSync && <span>最后同步：{lastSync}</span>}
    </div>
  );
};
