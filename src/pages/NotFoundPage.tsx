/* ============================================
   纸条 PaperNote — 404 页面
   ============================================ */

import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-secondary)',
    gap: 16,
  }}>
    <span style={{ fontSize: 64 }}>📄</span>
    <h1 style={{ fontSize: 24, color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
      页面不存在
    </h1>
    <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
      你访问的页面可能已被移除或地址输入有误
    </p>
    <Link
      to="/"
      style={{
        marginTop: 8,
        padding: '10px 24px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--accent-primary)',
        color: 'var(--white)',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      返回首页
    </Link>
  </div>
);
