/* ============================================
   纸条 PaperNote — 管理后台：数据面板
   Ant Design 指标卡片 + ECharts 图表
   ============================================ */

import React, { useEffect, useRef, useState } from 'react';
import { Row, Col, Card } from 'antd';
import {
  UserOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import http from '../../utils/http';

// ---------- 类型 ----------

interface DashboardData {
  total_users: number;
  today_active: number;
  total_groups: number;
  today_messages: number;
  online_users: number;
  today_new_groups: number;
  storage_used: string;
  files_count: { images: number; videos: number; others: number };
  message_trend: { date: string; count: number; dm: number; channel: number }[];
  active_trend: { date: string; dau: number }[];
}

// ---------- 指标卡片 ----------

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendUp, icon, color }) => (
  <Card
    style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
    }}
    bodyStyle={{ padding: 20 }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 28, fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--text-primary)' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {trend && (
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: trendUp ? 'var(--accent-green)' : 'var(--accent-red)',
              marginTop: 4,
            }}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </div>
        )}
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 20,
          opacity: 0.85,
        }}
      >
        {icon}
      </div>
    </div>
  </Card>
);

// ---------- 页面 ----------

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);

  const msgChartRef = useRef<HTMLDivElement>(null);
  const activeChartRef = useRef<HTMLDivElement>(null);
  const storageChartRef = useRef<HTMLDivElement>(null);

  // 加载数据
  useEffect(() => {
    http
      .get<DashboardData>('/api/admin/dashboard')
      .then((res) => {
        if (res.code === 0) setData(res.data);
      })
      .catch(() => {});
  }, []);

  // 初始化图表
  useEffect(() => {
    if (!data) return;

    // 消息趋势 — 折线图
    if (msgChartRef.current) {
      const chart = echarts.init(msgChartRef.current);
      const dates = data.message_trend.map((d) => d.date.slice(5));
      chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['单聊', '群聊'], textStyle: { color: '#8B7355' } },
        grid: { left: 40, right: 16, top: 40, bottom: 24 },
        xAxis: { type: 'category', data: dates, axisLabel: { color: '#8B7355' } },
        yAxis: { type: 'value', axisLabel: { color: '#8B7355' } },
        series: [
          {
            name: '单聊',
            type: 'line',
            data: data.message_trend.map((d) => d.dm),
            smooth: true,
            itemStyle: { color: '#F49B3E' },
          },
          {
            name: '群聊',
            type: 'line',
            data: data.message_trend.map((d) => d.channel),
            smooth: true,
            itemStyle: { color: '#7BA86E' },
          },
        ],
      });
      return () => chart.dispose();
    }
  }, [data]);

  // 活跃用户趋势 — 柱状图
  useEffect(() => {
    if (!data) return;
    if (activeChartRef.current) {
      const chart = echarts.init(activeChartRef.current);
      const dates = data.active_trend.map((d) => d.date.slice(5));
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 16, top: 16, bottom: 24 },
        xAxis: { type: 'category', data: dates, axisLabel: { color: '#8B7355' } },
        yAxis: { type: 'value', axisLabel: { color: '#8B7355' } },
        series: [
          {
            type: 'bar',
            data: data.active_trend.map((d) => d.dau),
            itemStyle: { color: '#F49B3E', borderRadius: [4, 4, 0, 0] },
          },
        ],
      });
      return () => chart.dispose();
    }
  }, [data]);

  // 文件存储 — 环形图
  useEffect(() => {
    if (!data) return;
    if (storageChartRef.current) {
      const chart = echarts.init(storageChartRef.current);
      const fc = data.files_count;
      chart.setOption({
        series: [
          {
            type: 'pie',
            radius: ['50%', '75%'],
            center: ['50%', '50%'],
            label: { show: false },
            data: [
              { name: '图片', value: fc.images, itemStyle: { color: '#F49B3E' } },
              { name: '视频', value: fc.videos, itemStyle: { color: '#FFB366' } },
              { name: '其他', value: fc.others, itemStyle: { color: '#E8D5C4' } },
            ],
          },
        ],
      });
      return () => chart.dispose();
    }
  }, [data]);

  if (!data) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 60 }}>
        加载中…
      </div>
    );
  }

  return (
    <div>
      {/* 指标卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="总注册用户" value={data.total_users} trend="12% 周环比" trendUp
            icon={<UserOutlined />} color="#F49B3E" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="今日活跃" value={data.today_active} trend="3% 日环比" trendUp={false}
            icon={<ThunderboltOutlined />} color="#7BA86E" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="总群组数" value={data.total_groups} trend={`+${data.today_new_groups} 今日新增`} trendUp
            icon={<TeamOutlined />} color="#FFB366" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="今日消息" value={data.today_messages} trend="8% 日环比" trendUp
            icon={<MessageOutlined />} color="#D47E2C" />
        </Col>
      </Row>

      {/* 图表行 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title="消息趋势（近7天）"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            bodyStyle={{ padding: 12 }}
          >
            <div ref={msgChartRef} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="活跃用户趋势（近7天）"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            bodyStyle={{ padding: 12 }}
          >
            <div ref={activeChartRef} style={{ height: 260 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card
            title="文件存储概览"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            bodyStyle={{ padding: 12 }}
          >
            <div ref={storageChartRef} style={{ height: 200 }} />
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              <span>🖼 图片 {data.files_count.images}</span>
              <span>🎬 视频 {data.files_count.videos}</span>
              <span>📎 其他 {data.files_count.others}</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            title="实时数据"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>🟢 当前在线：<strong>{data.online_users}</strong> 人</div>
              <div>📝 今日新建群：<strong>{data.today_new_groups}</strong></div>
              <div>💾 存储使用：<strong>{data.storage_used}</strong></div>
              <div style={{ marginTop: 12, padding: 'var(--space-md)', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                <div style={{ fontWeight: 'var(--font-weight-bold)' as any, marginBottom: 8, color: 'var(--text-secondary)' }}>最近操作</div>
                <div style={{ color: 'var(--text-muted)' }}>暂无最近操作记录</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
