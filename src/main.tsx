/* ============================================
   纸条 PaperNote — 应用入口
   配置 HashRouter，渲染路由：
     /login /register (公开)  / (需 AuthGuard)
   ============================================ */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { AuthGuard } from './components/AuthGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FriendsPage } from './pages/FriendsPage';
import { GroupSettingsPage } from './pages/GroupSettingsPage';
import { AdminGuard } from './components/AdminGuard';
import { AdminLayout } from './pages/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { GroupManagementPage } from './pages/admin/GroupManagementPage';
import { OperationLogPage } from './pages/admin/OperationLogPage';
import './styles/theme.css';

// ---------- 路由配置 ----------

const router = createHashRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <App />
      </AuthGuard>
    ),
  },
  {
    path: '/friends',
    element: (
      <AuthGuard>
        <FriendsPage />
      </AuthGuard>
    ),
  },
  {
    path: '/channel/:convId/settings',
    element: (
      <AuthGuard>
        <GroupSettingsPage />
      </AuthGuard>
    ),
  },
  {
    path: '/admin',
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'users', element: <UserManagementPage /> },
      { path: 'groups', element: <GroupManagementPage /> },
      { path: 'logs', element: <OperationLogPage /> },
    ],
  },
]);

// ---------- 渲染 ----------

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>,
);
