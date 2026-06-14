/* ============================================
   纸条 PaperNote — 管理后台路由守卫
   仅 role === 'admin' 的用户可访问
   ============================================ */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentUser = useChatStore((s) => s.currentUser);

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
