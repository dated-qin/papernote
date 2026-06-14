/* ============================================
   纸条 PaperNote — 通用小组件
   ============================================ */

import React from 'react';

// ============ 头像 ============
interface AvatarProps {
  src?: string;
  name: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 36, style, className }) => {
  const initials = name.slice(0, 2).toUpperCase();
  return src ? (
    <img
      src={src}
      alt={name}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        objectFit: 'cover',
        flexShrink: 0,
        ...style,
      }}
      className={className}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--accent-primary)',
        color: 'var(--white)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 'var(--font-weight-bold)' as any,
        flexShrink: 0,
        ...style,
      }}
      className={className}
      title={name}
    >
      {initials}
    </div>
  );
};

// ============ 未读徽章 ============
interface UnreadBadgeProps {
  count: number;
  showDot?: boolean; // 免打扰时只显示红点
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count, showDot }) => {
  if (count <= 0 && !showDot) return null;
  return (
    <span
      style={{
        minWidth: 18,
        height: 18,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--accent-red)',
        color: 'var(--white)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-bold)' as any,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 5px',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {showDot ? '' : count >= 99 ? '99+' : count}
    </span>
  );
};

// ============ 日期分隔线 ============
interface DateDividerProps {
  label: string;
}

export const DateDivider: React.FC<DateDividerProps> = ({ label }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-md)',
      margin: 'var(--space-lg) 0',
    }}
  >
    <span style={{ flex: 1, height: 1, backgroundColor: 'var(--border-default)' }} />
    <span
      style={{
        color: 'var(--text-muted)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)' as any,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
    <span style={{ flex: 1, height: 1, backgroundColor: 'var(--border-default)' }} />
  </div>
);

// ============ 操作按钮（图标按钮） ============
interface IconButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  size?: number;
  title?: string;
  style?: React.CSSProperties;
}

export const IconButton: React.FC<IconButtonProps> = ({ onClick, children, size = 32, title, style }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: size,
      height: size,
      borderRadius: 'var(--radius-sm)',
      border: 'none',
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0,
      fontSize: size * 0.5,
      transition: 'background-color 0.15s, color 0.15s',
      ...style,
    }}
    onMouseEnter={(e) => {
      (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
      (e.target as HTMLButtonElement).style.color = 'var(--text-primary)';
    }}
    onMouseLeave={(e) => {
      (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
      (e.target as HTMLButtonElement).style.color = 'var(--text-secondary)';
    }}
  >
    {children}
  </button>
);
