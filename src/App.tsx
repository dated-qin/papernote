/* ============================================
   纸条 PaperNote — 主应用布局（已认证用户可见）
   路由保护由 AuthGuard 处理
   ============================================ */

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useChatStore } from './store/chatStore';
import { TitleBar } from './components/TitleBar';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatArea } from './components/ChatArea';
import { ThreadPanel } from './components/ThreadPanel';
import { StatusBar } from './components/StatusBar';
import { seedDemoData } from './demoData';

export const App: React.FC = () => {
  const theme = useChatStore((s) => s.theme);
  const setTheme = useChatStore((s) => s.setTheme);

  // 初始化主题 + 注入演示数据
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    seedDemoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* 主题切换快捷键（开发用） */}
      <div
        style={{
          position: 'fixed',
          bottom: 30,
          right: 16,
          zIndex: 1000,
        }}
      >
        <button
          onClick={toggleTheme}
          title="切换主题"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 16,
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <TitleBar />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <WorkspaceSidebar />
        <ConversationSidebar />
        <ChatArea />
        <ThreadPanel />
      </div>

      <StatusBar connectionStatus="connected" lastSync="刚刚" />

      {/* Outlet 用于嵌套路由（当前未使用，预留给未来子路由） */}
      <Outlet />
    </div>
  );
};
