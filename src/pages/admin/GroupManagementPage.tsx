/* ============================================
   纸条 PaperNote — 管理后台：群组管理
   Ant Design Table + 搜索 + 解散（Modal.confirm）
   ============================================ */

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Input, Modal, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import http from '../../utils/http';

interface AdminGroup {
  id: number;
  title: string;
  owner_name: string;
  member_count: number;
  created_at: string;
}

export const GroupManagementPage: React.FC = () => {
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<{ groups: AdminGroup[]; total: number }>(
        `/api/admin/groups?page=${page}&page_size=20&keyword=${encodeURIComponent(keyword)}`,
      );
      if (res.code === 0) {
        setGroups(res.data.groups ?? []);
        setTotal(res.data.total ?? 0);
      }
    } catch {
      message.error('加载群组列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDelete = (groupId: number, groupName: string) => {
    Modal.confirm({
      title: '确认解散',
      content: `确定要解散群聊「${groupName}」吗？此操作不可撤销。`,
      okText: '解散',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await http.delete(`/api/admin/groups/${groupId}`);
        message.success('群聊已解散');
        fetchGroups();
      },
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '群名', dataIndex: 'title' },
    { title: '群主', dataIndex: 'owner_name' },
    { title: '成员数', dataIndex: 'member_count', width: 80 },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      render: (v: string) => new Date(v).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, record: AdminGroup) => (
        <Button
          size="small"
          danger
          onClick={() => handleDelete(record.id, record.title)}
        >
          解散
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索群名"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          style={{ width: 240 }}
        />
      </div>
      <Table
        columns={columns}
        dataSource={groups}
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
    </div>
  );
};
