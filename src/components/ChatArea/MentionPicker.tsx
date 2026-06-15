/* ============================================
   纸条 PaperNote — @成员选择器
   ============================================ */

import React, { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../common';
import type { GroupMember } from '../../types';

export interface MentionOption {
  id: string;
  label: string;
  avatarUrl?: string;
  role?: string;
}

interface MentionPickerProps {
  open: boolean;
  query: string;
  members: GroupMember[];
  allowAll: boolean;
  onSelect: (option: MentionOption) => void;
  onClose: () => void;
}

export const MentionPicker: React.FC<MentionPickerProps> = ({
  open,
  query,
  members,
  allowAll,
  onSelect,
  onClose,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const options = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const base: MentionOption[] = members.map((m) => ({
      id: m.userId,
      label: m.nickname || m.username,
      avatarUrl: m.avatarUrl,
      role: m.role,
    }));
    const allOption: MentionOption[] = allowAll
      ? [{ id: 'all', label: '所有人', role: 'owner' }]
      : [];
    return [...allOption, ...base].filter((m) => {
      if (!keyword) return true;
      return m.label.toLowerCase().includes(keyword) || m.id.includes(keyword);
    });
  }, [allowAll, members, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [open, query]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (options.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(options[activeIndex]);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, onClose, onSelect, open, options]);

  if (!open) return null;

  return (
    <div style={pickerStyle}>
      {options.length === 0 && <div style={emptyStyle}>没有匹配的成员</div>}
      {options.map((option, index) => (
        <button
          key={option.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(option);
          }}
          style={{
            ...itemStyle,
            backgroundColor: index === activeIndex ? 'var(--bg-hover)' : 'transparent',
          }}
        >
          {option.id === 'all' ? (
            <span style={allAvatarStyle}>@</span>
          ) : (
            <Avatar src={option.avatarUrl} name={option.label} size={28} />
          )}
          <span style={nameStyle}>{option.id === 'all' ? '@所有人' : option.label}</span>
          {option.role && option.role !== 'member' && (
            <span style={roleStyle}>{option.role === 'owner' ? '群主' : '管理员'}</span>
          )}
        </button>
      ))}
    </div>
  );
};

const pickerStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  bottom: '100%',
  width: 280,
  maxHeight: 260,
  overflowY: 'auto',
  marginBottom: 'var(--space-sm)',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  padding: 'var(--space-xs) 0',
  zIndex: 30,
};

const itemStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  padding: '0 var(--space-sm)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
  textAlign: 'left',
};

const allAvatarStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--accent-primary)',
  color: 'var(--white)',
  fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
};

const nameStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 'var(--font-size-sm)',
};

const roleStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-xs)',
};

const emptyStyle: React.CSSProperties = {
  padding: 'var(--space-md)',
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-sm)',
  textAlign: 'center',
};
