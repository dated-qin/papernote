/* ============================================
   纸条 PaperNote — 密码找回页面
   Step 1: 输入手机号/邮箱 → 获取验证码
   Step 2: 输入验证码 → 设置新密码
   ============================================ */

import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import http from '../utils/http';

type Step = 'target' | 'reset';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('target');
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeVerified, setCodeVerified] = useState(false);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = useCallback(async () => {
    clearMessages();
    const trimmed = target.trim();
    if (!trimmed) {
      setError('请输入手机号或邮箱');
      return;
    }
    setLoading(true);
    try {
      const res = await http.post<Record<string, never>>('/api/auth/send-code', { target: trimmed });
      if (res.code === 0) {
        setSuccess('验证码已发送，请查看后端日志（开发模式）');
        startCountdown();
        setCodeVerified(false);
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError((res.message as string) || '发送失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [target]);

  const handleVerifyCode = useCallback(async () => {
    clearMessages();
    if (code.length !== 6) {
      setError('验证码为6位数字');
      return;
    }
    setLoading(true);
    try {
      const res = await http.post<Record<string, never>>('/api/auth/verify-code', {
        target: target.trim(),
        code,
      });
      if (res.code === 0) {
        setCodeVerified(true);
        setStep('reset');
      } else {
        setError((res.message as string) || '验证码错误');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [target, code]);

  const handleResetPassword = useCallback(async () => {
    clearMessages();
    if (newPassword.length < 6) {
      setError('新密码至少6个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await http.post<Record<string, never>>('/api/auth/reset-password', {
        target: target.trim(),
        code,
        new_password: newPassword,
      });
      if (res.code === 0) {
        setSuccess('密码重置成功！即将跳转到登录页...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError((res.message as string) || '重置失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [target, code, newPassword, confirmPassword, navigate]);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>找回密码</h1>
        <p style={subtitleStyle}>
          输入绑定的手机号或邮箱，我们将发送验证码
        </p>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        {/* Step 1: 输入目标 + 验证码 */}
        <div style={{ display: step === 'target' ? 'block' : 'none' }}>
          <label style={labelStyle}>手机号 / 邮箱</label>
          <input
            style={inputStyle}
            placeholder="请输入绑定的手机号或邮箱"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={loading}
            autoFocus
          />

          {!codeVerified && (
            <>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={handleSendCode}
                  disabled={loading || countdown > 0}
                  style={{
                    ...btnSecondaryStyle,
                    opacity: countdown > 0 ? 0.6 : 1,
                  }}
                >
                  {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                </button>
              </div>

              <label style={{ ...labelStyle, marginTop: 16 }}>验证码</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="6位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  disabled={loading}
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                  style={{
                    ...btnPrimaryStyle,
                    opacity: code.length === 6 ? 1 : 0.5,
                    width: 80,
                  }}
                >
                  验证
                </button>
              </div>
            </>
          )}
        </div>

        {/* Step 2: 设置新密码 */}
        {step === 'reset' && (
          <>
            <label style={labelStyle}>新密码</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="至少6个字符"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />

            <label style={{ ...labelStyle, marginTop: 16 }}>确认新密码</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleResetPassword();
              }}
            />

            <button
              onClick={() => void handleResetPassword()}
              disabled={loading || !newPassword || !confirmPassword}
              style={{
                ...btnPrimaryStyle,
                width: '100%',
                marginTop: 24,
                opacity: !newPassword || !confirmPassword ? 0.5 : 1,
              }}
            >
              {loading ? '处理中...' : '重置密码'}
            </button>
          </>
        )}

        <div style={footerStyle}>
          <Link to="/login" style={linkStyle}>
            ← 返回登录
          </Link>
        </div>
      </div>
    </div>
  );
};

// ---------- 样式 ----------

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--bg-secondary)',
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: 400,
  padding: 40,
  backgroundColor: 'var(--bg-primary)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid var(--border-default)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 'var(--font-weight-bold)' as any,
  color: 'var(--text-primary)',
  margin: 0,
  marginBottom: 8,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--text-muted)',
  margin: 0,
  marginBottom: 24,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  fontSize: 'var(--font-size-md)',
  color: 'var(--text-primary)',
  backgroundColor: 'var(--bg-secondary)',
  outline: 'none',
  fontFamily: 'var(--font-family)',
  boxSizing: 'border-box',
};

const btnPrimaryStyle: React.CSSProperties = {
  height: 44,
  border: 'none',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--accent-primary)',
  color: 'var(--white)',
  fontSize: 'var(--font-size-md)',
  fontWeight: 'var(--font-weight-semibold)' as any,
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnPrimaryStyle,
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-default)',
  flex: 1,
};

const errorStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-error)',
  color: 'var(--accent-red)',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--font-size-sm)',
  marginBottom: 16,
};

const successStyle: React.CSSProperties = {
  backgroundColor: '#e6ffed',
  color: '#0a7c2e',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--font-size-sm)',
  marginBottom: 16,
};

const footerStyle: React.CSSProperties = {
  marginTop: 24,
  textAlign: 'center',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--accent-link)',
  fontSize: 'var(--font-size-sm)',
  textDecoration: 'none',
};
