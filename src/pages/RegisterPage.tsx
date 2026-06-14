/* ============================================
   纸条 PaperNote — 注册页面
   全屏居中布局：纸条ID + 昵称 + 密码 + 手机号/邮箱
   ============================================ */

import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// ---------- 内联样式 ----------

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

  heading: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    color: 'var(--text-primary)',
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

  orText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
  },
};

// ---------- 组件 ----------

export const RegisterPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const errorMessage = useAuthStore((s) => s.errorMessage);
  const register = useAuthStore((s) => s.register);
  const clearError = useAuthStore((s) => s.clearError);

  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // 已登录直接跳转
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleRegister = async () => {
    if (!username.trim() || !nickname.trim() || !password.trim()) return;
    if (!phone.trim() && !email.trim()) {
      // 至少填一个联系方式 — 通过 store 的 errorMessage 处理
      return;
    }
    try {
      await register({
        username: username.trim(),
        nickname: nickname.trim(),
        password,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
    } catch {
      // 错误已由 store 处理
    }
  };

  const inputOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--accent-primary)';
  };
  const inputOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--border-default)';
  };

  const canSubmit =
    username.trim() &&
    nickname.trim() &&
    password.trim() &&
    (phone.trim() || email.trim());

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>创建账号</h1>

        {/* 纸条ID */}
        <input
          style={styles.input}
          type="text"
          placeholder="纸条ID（唯一标识）"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (errorMessage) clearError();
          }}
          onFocus={inputOnFocus}
          onBlur={inputOnBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRegister();
          }}
        />

        {/* 昵称 */}
        <input
          style={styles.input}
          type="text"
          placeholder="昵称"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            if (errorMessage) clearError();
          }}
          onFocus={inputOnFocus}
          onBlur={inputOnBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRegister();
          }}
        />

        {/* 密码 */}
        <input
          style={styles.input}
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errorMessage) clearError();
          }}
          onFocus={inputOnFocus}
          onBlur={inputOnBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRegister();
          }}
        />

        {/* 分隔提示 */}
        <span style={styles.orText}>—— 以下至少填一项 ——</span>

        {/* 手机号 */}
        <input
          style={styles.input}
          type="text"
          placeholder="手机号（选填）"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (errorMessage) clearError();
          }}
          onFocus={inputOnFocus}
          onBlur={inputOnBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRegister();
          }}
        />

        {/* 邮箱 */}
        <input
          style={styles.input}
          type="email"
          placeholder="邮箱（选填）"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errorMessage) clearError();
          }}
          onFocus={inputOnFocus}
          onBlur={inputOnBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRegister();
          }}
        />

        {/* 错误提示 */}
        <div style={styles.errorText}>
          {errorMessage ||
            (!canSubmit && username && password ? '手机号或邮箱至少填一项' : '')}
        </div>

        {/* 注册按钮 */}
        <button
          style={{
            ...styles.button,
            opacity: !canSubmit || isLoading ? 0.6 : 1,
            cursor: !canSubmit || isLoading ? 'not-allowed' : 'pointer',
          }}
          disabled={!canSubmit || isLoading}
          onClick={handleRegister}
          onMouseEnter={(e) => {
            if (canSubmit && !isLoading)
              (e.target as HTMLButtonElement).style.backgroundColor =
                'var(--accent-secondary)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor =
              'var(--accent-primary)';
          }}
        >
          {isLoading ? '注册中…' : '注册'}
        </button>

        {/* 登录链接 */}
        <Link
          to="/login"
          style={styles.linkText}
          onMouseEnter={(e) => {
            (e.target as HTMLAnchorElement).style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLAnchorElement).style.textDecoration = 'none';
          }}
        >
          已有账号？去登录
        </Link>
      </div>
    </div>
  );
};
