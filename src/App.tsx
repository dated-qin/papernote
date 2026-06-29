/* ============================================
   纸条 PaperNote — 主应用布局（已认证用户可见）
   路由保护由 AuthGuard 处理
   ============================================ */

import React, { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useChatStore } from './store/chatStore';
import { TitleBar } from './components/TitleBar';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatArea } from './components/ChatArea';
import { ThreadPanel } from './components/ThreadPanel';
import { FilesPanel } from './components/FilesPanel';
import { StatusBar } from './components/StatusBar';
import { SiteFooter } from './components/SiteFooter';
import { SearchDialog } from './components/SearchDialog';

export const App: React.FC = () => {
  const theme = useChatStore((s) => s.theme);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const wsStatus = useChatStore((s) => s.wsStatus);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchScopeId, setSearchScopeId] = useState<string | null>(null);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const activeThreadRootId = useChatStore((s) => s.activeThreadRootId);

  // 初始化主题 + 加载真实会话
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSearch = useCallback((conversationId?: string) => {
    setSearchScopeId(conversationId ?? null);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  useEffect(() => {
    window.electronAPI?.onFocusSearch(() => openSearch());
  }, [openSearch]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <TitleBar />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <WorkspaceSidebar />
        <ConversationSidebar />
        <ChatArea onOpenSearch={openSearch} onToggleFiles={() => setShowFilesPanel(!showFilesPanel)} />
        {activeThreadRootId ? <ThreadPanel /> : showFilesPanel ? <FilesPanel /> : null}
      </div>

      <StatusBar connectionStatus={wsStatus} lastSync="刚刚" />
      <SiteFooter />

      <SearchDialog
        open={searchOpen}
        scopedConversationId={searchScopeId}
        onClose={closeSearch}
      />

      {/* Outlet 用于嵌套路由（当前未使用，预留给未来子路由） */}
      <Outlet />
    </div>
  );
};
