/* ============================================
   纸条 PaperNote — 路由守卫组件
   未登录跳转 /login，加载中显示 Loading 占位
   ============================================ */

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/token';
import { wsClient } from '../utils/ws';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const currentUser = useAuthStore((s) => s.currentUser);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  useEffect(() => {
    const token = tokenStorage.get();
    if (isAuthenticated && token && !currentUser) {
      wsClient.connect(token);
      fetchCurrentUser();
    }
  }, [currentUser, fetchCurrentUser, isAuthenticated]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-lg)' }}>
          加载中…
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
