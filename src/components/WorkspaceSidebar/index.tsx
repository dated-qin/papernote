/* ============================================
   纸条 PaperNote — 工作区导航侧边栏
   ============================================ */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../common';

export const WorkspaceSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useChatStore((s) => s.currentUser);
  const friendRequests = useChatStore((s) => s.friendRequests);
  const theme = useChatStore((s) => s.theme);
  const setTheme = useChatStore((s) => s.setTheme);
  const logout = useAuthStore((s) => s.logout);
  const pendingCount = friendRequests.filter((r) => r.status === 'pending').length;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
      {/* 主题切换 */}
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={theme === 'light' ? '深色模式' : '亮色模式'}
        style={navBtnStyle(location.pathname === '__theme__')}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* 好友按钮 */}
      <button
        onClick={() => navigate('/friends')}
        title="好友"
        style={navBtnStyle(location.pathname === '/friends')}
      >
        👥
        {pendingCount > 0 && <Badge count={pendingCount} />}
      </button>

      {/* 分隔线 */}
      <div style={{ width: 24, height: 1, backgroundColor: 'var(--border-default)', flexShrink: 0 }} />

      {/* 用户菜单 */}
      {currentUser && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            title={currentUser.nickname || currentUser.username}
            style={navBtnStyle(menuOpen)}
          >
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.nickname || currentUser.username}
              size={32}
              style={{ borderRadius: 'var(--radius-md)' }}
            />
          </button>
          {menuOpen && (
            <>
              <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 52,
                  bottom: 0,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  minWidth: 140,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {currentUser.nickname || currentUser.username}
                </div>
                <button onClick={() => { navigate('/settings'); setMenuOpen(false); }} style={menuItemStyle}>
                  ⚙ 设置
                </button>
                {currentUser.role === 'admin' && (
                  <button onClick={() => { navigate('/admin'); setMenuOpen(false); }} style={menuItemStyle}>
                    📊 管理后台
                  </button>
                )}
                <button onClick={handleLogout} style={{ ...menuItemStyle, color: 'var(--accent-red)' }}>
                  🚪 退出登录
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

const navBtnStyle = (active: boolean): React.CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: 'var(--radius-lg)',
  border: 'none',
  backgroundColor: active ? 'var(--bg-active)' : 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  color: 'var(--text-secondary)',
  position: 'relative',
});

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 13,
  textAlign: 'left' as const,
  fontFamily: 'var(--font-family)',
};

const Badge: React.FC<{ count: number }> = ({ count }) => (
  <span style={{
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
    borderRadius: 'var(--radius-full)', backgroundColor: 'var(--accent-red)',
    color: 'var(--white)', fontSize: 10, fontWeight: 'var(--font-weight-bold)' as any,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
  }}>
    {count > 9 ? '9+' : count}
  </span>
);
