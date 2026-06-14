/* ============================================
   纸条 PaperNote — 管理后台：用户管理
   Ant Design Table + 搜索/筛选 + 封禁/解封 + 详情抽屉
   ============================================ */

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Tag, Input, Select, Space, Drawer, message, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import http from '../../utils/http';

interface AdminUser {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  status: number; // 0正常 1封禁
  banned: boolean;
  phone: string;
  email: string;
  created_at: string;
}

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<{ users: AdminUser[]; total: number }>(
        `/api/admin/users?page=${page}&page_size=20&status=${statusFilter}&keyword=${encodeURIComponent(keyword)}`,
      );
      if (res.code === 0) {
        setUsers(res.data.users ?? []);
        setTotal(res.data.total ?? 0);
      }
    } catch {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, keyword]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBan = async (userId: number, banned: boolean) => {
    Modal.confirm({
      title: banned ? '确认封禁' : '确认解封',
      content: `确定要${banned ? '封禁' : '解封'}该用户吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        await http.put(`/api/admin/users/${userId}/ban`, { banned });
        message.success(banned ? '已封禁' : '已解封');
        fetchUsers();
      },
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '纸条ID', dataIndex: 'username' },
    { title: '昵称', dataIndex: 'nickname' },
    {
      title: '状态',
      dataIndex: 'banned',
      width: 80,
      render: (banned: boolean) => (
        <Tag color={banned ? 'red' : 'green'}>{banned ? '封禁' : '正常'}</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      render: (v: string) => new Date(v).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      width: 200,
      render: (_: unknown, record: AdminUser) => (
        <Space>
          <Button
            size="small"
            danger={!record.banned}
            onClick={() => handleBan(record.id, !record.banned)}
          >
            {record.banned ? '解封' : '封禁'}
          </Button>
          <Button size="small" onClick={() => setDetailUser(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 搜索 + 筛选 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input
          placeholder="搜索纸条ID/昵称"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          style={{ width: 240 }}
        />
        <Select
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          style={{ width: 120 }}
          options={[
            { value: 'all', label: '全部' },
            { value: 'active', label: '正常' },
            { value: 'banned', label: '封禁' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      {/* 详情抽屉 */}
      <Drawer
        title="用户详情"
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        width={360}
      >
        {detailUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><strong>ID：</strong>{detailUser.id}</div>
            <div><strong>纸条ID：</strong>{detailUser.username}</div>
            <div><strong>昵称：</strong>{detailUser.nickname}</div>
            <div><strong>手机号：</strong>{detailUser.phone || '—'}</div>
            <div><strong>邮箱：</strong>{detailUser.email || '—'}</div>
            <div><strong>状态：</strong>{detailUser.banned ? '封禁' : '正常'}</div>
            <div><strong>注册时间：</strong>{new Date(detailUser.created_at).toLocaleString('zh-CN')}</div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
