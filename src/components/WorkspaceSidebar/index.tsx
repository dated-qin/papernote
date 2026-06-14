/* ============================================
   纸条 PaperNote — 工作区导航侧边栏
   ============================================ */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../common';

export const WorkspaceSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const workspaces = useChatStore((s) => s.workspaces);
  const activeWorkspaceId = useChatStore((s) => s.activeWorkspaceId);
  const switchWorkspace = useChatStore((s) => s.switchWorkspace);
  const currentUser = useChatStore((s) => s.currentUser);
  const friendRequests = useChatStore((s) => s.friendRequests);
  const pendingCount = friendRequests.filter((r) => r.status === 'pending').length;

  return (
    <nav
      style={{
        width: 56,
        backgroundColor: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'var(--space-md)',
        paddingBottom: 'var(--space-md)',
        gap: 'var(--space-sm)',
        flexShrink: 0,
        borderRight: '1px solid var(--border-default)',
      }}
    >
      {/* 工作区图标列表 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          return (
            <button
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              title={ws.name}
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s, border-radius 0.15s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              {/* 激活指示条（左侧橙色竖条） */}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: -10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 20,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-primary)',
                  }}
                />
              )}
              <img
                src={ws.iconUrl}
                alt={ws.name}
                style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)' }}
              />
            </button>
          );
        })}
      </div>

      {/* 分隔线 */}
      <div
        style={{
          width: 24,
          height: 1,
          backgroundColor: 'var(--border-default)',
          flexShrink: 0,
        }}
      />

      {/* 好友导航按钮 */}
      <button
        onClick={() => navigate('/friends')}
        title="好友"
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-lg)',
          border: 'none',
          backgroundColor: location.pathname === '/friends' ? 'var(--bg-active)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontSize: 18,
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (location.pathname !== '/friends')
            (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          if (location.pathname !== '/friends')
            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
        }}
      >
        👥
        {pendingCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-red)',
              color: 'var(--white)',
              fontSize: 10,
              fontWeight: 'var(--font-weight-bold)' as any,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {/* 底部用户头像 */}
      {currentUser && (
        <Avatar
          src={currentUser.avatarUrl}
          name={currentUser.nickname || currentUser.username}
          size={32}
          style={{ borderRadius: 'var(--radius-md)' }}
        />
      )}
    </nav>
  );
};
