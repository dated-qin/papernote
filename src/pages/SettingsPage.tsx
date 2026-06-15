import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceSidebar } from '../components/WorkspaceSidebar';
import { Avatar } from '../components/common';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import http from '../utils/http';
import { uploadFile } from '../utils/upload';
import type { User } from '../types';

const S = {
  shell: {
    height: '100vh',
    display: 'flex',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,

  page: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  header: {
    height: 52,
    padding: '0 var(--space-lg)',
    borderBottom: '1px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    flexShrink: 0,
  } as React.CSSProperties,

  body: {
    flex: 1,
    overflowY: 'auto',
  } as React.CSSProperties,

  section: {
    padding: 'var(--space-xl)',
    borderBottom: '1px solid var(--border-default)',
  } as React.CSSProperties,

  sectionInner: {
    maxWidth: 720,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  } as React.CSSProperties,

  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
  },

  sectionTitle: {
    fontSize: 'var(--font-size-md)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    color: 'var(--text-primary)',
  },

  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
  },

  label: {
    width: 72,
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    flexShrink: 0,
  },

  input: {
    width: 'min(420px, 100%)',
    height: 36,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: 'var(--font-size-md)',
    fontFamily: 'var(--font-family)',
  } as React.CSSProperties,

  textarea: {
    width: 'min(420px, 100%)',
    minHeight: 72,
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
    resize: 'vertical' as const,
    fontSize: 'var(--font-size-md)',
    fontFamily: 'var(--font-family)',
  },

  primaryBtn: {
    height: 32,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--accent-primary)',
    color: 'var(--white)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-sm)',
  } as React.CSSProperties,

  secondaryBtn: {
    height: 32,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-default)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-sm)',
  } as React.CSSProperties,

  message: (kind: 'ok' | 'error'): React.CSSProperties => ({
    color: kind === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
    fontSize: 'var(--font-size-sm)',
  }),
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useChatStore((s) => s.currentUser);
  const updateProfile = useChatStore((s) => s.updateProfile);
  const theme = useChatStore((s) => s.theme);
  const setTheme = useChatStore((s) => s.setTheme);
  const setPresenceStatus = useChatStore((s) => s.setPresenceStatus);
  const logout = useAuthStore((s) => s.logout);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setNickname(currentUser.nickname);
    setAvatar(currentUser.avatarUrl);
    setBio(currentUser.bio ?? '');
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div style={S.shell}>
        <WorkspaceSidebar />
        <main style={S.page}>
          <Header onBack={() => navigate('/')} />
        </main>
      </div>
    );
  }

  const saveProfile = async () => {
    const nextNickname = nickname.trim();
    if (!nextNickname) {
      setProfileError('昵称不能为空');
      return;
    }

    setSavingProfile(true);
    setProfileMsg('');
    setProfileError('');
    try {
      await updateProfile({
        nickname: nextNickname,
        avatar: avatar.trim(),
        bio: bio.trim(),
        email: email.trim() || undefined,
      });
      await fetchCurrentUser();
      setProfileMsg('资料已保存');
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setProfileMsg('');
    setProfileError('');
    try {
      const fileId = await uploadFile(file);
      const res = await http.get<{ url: string }>(`/api/files/${fileId}/url`);
      if (res.code === 0) {
        setAvatar(res.data.url);
      }
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : '头像上传失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const changePassword = async () => {
    setPasswordMsg('');
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    setSavingPassword(true);
    try {
      await http.put('/api/auth/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordMsg('密码已修改，请重新登录');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 800);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : '修改密码失败');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={S.shell}>
      <WorkspaceSidebar />
      <main style={S.page}>
        <Header onBack={() => navigate('/')} />
        <div style={S.body}>
          <section style={S.section}>
            <div style={S.sectionInner}>
              <p style={S.sectionTitle}>个人资料</p>
              <div style={{ ...S.row, alignItems: 'flex-start' }}>
                <span style={S.label}>头像</span>
                <Avatar src={avatar} name={nickname || currentUser.username} size={56} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', minWidth: 260 }}>
                  <input
                    style={S.input}
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="头像 URL"
                  />
                  <label style={{ ...S.secondaryBtn, display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>
                    {uploadingAvatar ? '上传中' : '上传图片'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingAvatar}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAvatar(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
              <Field label="纸条ID">
                <input style={{ ...S.input, color: 'var(--text-muted)' }} value={currentUser.username} disabled />
              </Field>
              <Field label="昵称">
                <input style={S.input} value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={64} />
              </Field>
              <Field label="邮箱">
                <input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="新的邮箱，可选" />
              </Field>
              <Field label="简介">
                <textarea style={S.textarea} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={256} />
              </Field>
              <div style={{ ...S.row, paddingLeft: 72 }}>
                <button style={S.primaryBtn} disabled={savingProfile} onClick={saveProfile}>
                  {savingProfile ? '保存中' : '保存资料'}
                </button>
                {profileMsg && <span style={S.message('ok')}>{profileMsg}</span>}
                {profileError && <span style={S.message('error')}>{profileError}</span>}
              </div>
            </div>
          </section>

          <section style={S.section}>
            <div style={S.sectionInner}>
              <p style={S.sectionTitle}>账号安全</p>
              <Field label="旧密码">
                <input style={S.input} type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </Field>
              <Field label="新密码">
                <input style={S.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              <Field label="确认">
                <input style={S.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </Field>
              <div style={{ ...S.row, paddingLeft: 72 }}>
                <button style={S.primaryBtn} disabled={savingPassword} onClick={changePassword}>
                  {savingPassword ? '修改中' : '修改密码'}
                </button>
                {passwordMsg && <span style={S.message('ok')}>{passwordMsg}</span>}
                {passwordError && <span style={S.message('error')}>{passwordError}</span>}
              </div>
            </div>
          </section>

          <section style={S.section}>
            <div style={S.sectionInner}>
              <p style={S.sectionTitle}>偏好</p>
              <Field label="主题">
                <Segmented
                  value={theme}
                  options={[
                    { label: '亮色', value: 'light' },
                    { label: '深色', value: 'dark' },
                  ]}
                  onChange={(value) => setTheme(value as 'light' | 'dark')}
                />
              </Field>
              <Field label="状态">
                <Segmented
                  value={currentUser.status}
                  options={[
                    { label: '在线', value: 'online' },
                    { label: '隐身', value: 'offline' },
                    { label: '自动', value: 'away' },
                  ]}
                  onChange={(value) => setPresenceStatus(value as User['status'])}
                />
              </Field>
            </div>
          </section>
          <DeviceManager />
        </div>
      </main>
    </div>
  );
};

// ============ 设备管理组件 ============

const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<Array<{ device_id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await http.get<{ devices: Array<{ device_id: string; name: string }> }>('/api/users/me/devices');
      if (res.code === 0) setDevices(res.data.devices ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { void fetchDevices(); }, []);

  const handleKick = async (deviceId: string) => {
    if (!window.confirm('确定要强制下线该设备吗？')) return;
    const res = await http.delete<Record<string, never>>(`/api/users/me/devices/${encodeURIComponent(deviceId)}`);
    if (res.code === 0) {
      setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
    }
  };

  const currentUA = navigator.userAgent;

  return (
    <section style={{ ...S.section, marginTop: 24 }}>
      <div style={S.sectionInner}>
        <p style={S.sectionTitle}>设备管理</p>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>加载中...</p>
        ) : devices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无设备信息</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devices.map((d) => {
              const isCurrent = currentUA === d.device_id;
              return (
                <div
                  key={d.device_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {d.name}
                    {isCurrent && (
                      <span style={{ color: 'var(--accent-primary)', fontSize: 12, marginLeft: 8 }}>
                        (当前设备)
                      </span>
                    )}
                  </span>
                  {!isCurrent && (
                    <button
                      onClick={() => void handleKick(d.device_id)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--accent-red)',
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-family)',
                      }}
                    >
                      强制下线
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

const Header: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <header style={S.header}>
    <button style={S.secondaryBtn} onClick={onBack}>返回</button>
    <h1 style={S.title}>设置</h1>
  </header>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={S.row}>
    <span style={S.label}>{label}</span>
    {children}
  </label>
);

const Segmented: React.FC<{
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}> = ({ value, options, onChange }) => (
  <div
    style={{
      display: 'inline-flex',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      height: 32,
    }}
  >
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            minWidth: 64,
            padding: '0 var(--space-md)',
            border: 'none',
            borderRight: opt === options[options.length - 1] ? 'none' : '1px solid var(--border-default)',
            backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
            color: active ? 'var(--white)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
