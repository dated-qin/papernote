/* ============================================
   纸条 PaperNote — 管理后台布局
   左侧 Ant Design Menu + 右侧内容区（Outlet）
   ============================================ */

import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  HomeOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: '数据面板' },
  { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/admin/groups', icon: <TeamOutlined />, label: '群组管理' },
  { key: '/admin/logs', icon: <FileTextOutlined />, label: '操作日志' },
];

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Sider
        width={200}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-default)',
        }}
      >
        <div
          style={{
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
          }}
        >
          管理后台
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            backgroundColor: 'transparent',
            borderRight: 'none',
            color: 'var(--text-secondary)',
            flex: 1,
          }}
        />
        {/* 返回主页 */}
        <Menu
          mode="inline"
          selectable={false}
          items={[{ key: 'home', icon: <HomeOutlined />, label: '返回主页' }]}
          onClick={() => navigate('/')}
          style={{
            backgroundColor: 'transparent',
            borderRight: 'none',
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-default)',
          }}
        />
      </Sider>
      <Content
        style={{
          padding: 24,
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
};
