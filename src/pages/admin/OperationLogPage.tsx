/* ============================================
   纸条 PaperNote — 管理后台：操作日志
   Ant Design Table + 操作类型筛选
   ============================================ */

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Select, message } from 'antd';
import http from '../../utils/http';

interface AdminLog {
  id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number;
  detail: string;
  created_at: string;
}

// 操作类型映射
const ACTION_MAP: Record<string, string> = {
  ban_user: '封禁用户',
  unban_user: '解封用户',
  delete_group: '解散群',
  force_recall: '强制撤回',
  all: '全部',
};

const ACTION_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'ban_user', label: '封禁用户' },
  { value: 'unban_user', label: '解封用户' },
  { value: 'delete_group', label: '解散群' },
  { value: 'force_recall', label: '强制撤回' },
];

export const OperationLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const actionParam = actionFilter === 'all' ? '' : `&action=${actionFilter}`;
      const res = await http.get<{ logs: AdminLog[]; total: number }>(
        `/api/admin/logs?page=${page}&page_size=20${actionParam}`,
      );
      if (res.code === 0) {
        setLogs(res.data.logs ?? []);
        setTotal(res.data.total ?? 0);
      }
    } catch {
      message.error('加载操作日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '操作人', dataIndex: 'admin_name' },
    {
      title: '操作类型',
      dataIndex: 'action',
      render: (v: string) => ACTION_MAP[v] || v,
    },
    {
      title: '目标',
      render: (_: unknown, r: AdminLog) => `${r.target_type}#${r.target_id}`,
    },
    { title: '详情', dataIndex: 'detail' },
    {
      title: '时间',
      dataIndex: 'created_at',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Select
          value={actionFilter}
          onChange={(v) => {
            setActionFilter(v);
            setPage(1);
          }}
          style={{ width: 160 }}
          options={ACTION_OPTIONS}
        />
      </div>
      <Table
        columns={columns}
        dataSource={logs}
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
