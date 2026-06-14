/* ============================================
   纸条 PaperNote — 登录页面
   全屏居中布局，纸条ID/手机号 + 密码登录
   ============================================ */

import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// ---------- 内联样式（引用 CSS 变量） ----------

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'var(--bg-primary)',
  } as React.CSSProperties,

  card: {
    width: 360,
    padding: 'var(--space-xl)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-lg)',
  } as React.CSSProperties,

  brand: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-sm)',
  },

  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
    marginTop: 'var(--space-xs)',
  },

  input: {
    width: 320,
    height: 44,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    fontSize: 'var(--font-size-md)',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-secondary)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
    boxSizing: 'border-box' as const,
  },

  button: {
    width: 320,
    height: 44,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--accent-primary)',
    color: 'var(--white)',
    fontSize: 'var(--font-size-md)',
    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    transition: 'background-color 0.15s',
  },

  errorText: {
    color: 'var(--accent-red)',
    fontSize: 'var(--font-size-sm)',
    minHeight: 20,
    textAlign: 'center' as const,
  },

  linkText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--accent-link)',
    textDecoration: 'none',
  },
};

// ---------- 组件 ----------

export const LoginPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const errorMessage = useAuthStore((s) => s.errorMessage);
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  // 已登录直接跳转主页
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    if (!account.trim() || !password.trim()) return;
    try {
      await login(account.trim(), password);
    } catch {
      // 错误已由 store 处理
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* 品牌 */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={styles.brand}>纸条 PaperNote</h1>
          <p style={styles.subtitle}>轻量即时通讯</p>
        </div>

        {/* 账号输入 */}
        <input
          style={styles.input}
          type="text"
          placeholder="纸条ID / 手机号 / 邮箱"
          value={account}
          onChange={(e) => {
            setAccount(e.target.value);
            if (errorMessage) clearError();
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent-primary)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-default)';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLogin();
          }}
        />

        {/* 密码输入 */}
        <input
          style={styles.input}
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errorMessage) clearError();
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent-primary)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-default)';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLogin();
          }}
        />

        {/* 错误提示 */}
        <div style={styles.errorText}>{errorMessage || ''}</div>

        {/* 登录按钮 */}
        <button
          style={{
            ...styles.button,
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
          disabled={isLoading}
          onClick={handleLogin}
          onMouseEnter={(e) => {
            if (!isLoading)
              (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-secondary)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-primary)';
          }}
        >
          {isLoading ? '登录中…' : '登录'}
        </button>

        {/* 注册链接 */}
        <Link
          to="/register"
          style={styles.linkText}
          onMouseEnter={(e) => {
            (e.target as HTMLAnchorElement).style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLAnchorElement).style.textDecoration = 'none';
          }}
        >
          没有账号？去注册
        </Link>
      </div>
    </div>
  );
};
