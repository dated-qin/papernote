import React, { useEffect } from 'react';
import type { Conversation } from '../../types';

interface ConversationContextMenuProps {
  conversation: Conversation;
  x: number;
  y: number;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onClose: () => void;
}

export const ConversationContextMenu: React.FC<ConversationContextMenuProps> = ({
  conversation,
  x,
  y,
  onTogglePin,
  onToggleMute,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const menuX = Math.min(x, window.innerWidth - 180);
  const menuY = Math.min(y, window.innerHeight - 132);

  return (
    <>
      <div style={backdropStyle} onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div
        role="menu"
        style={{
          ...menuStyle,
          left: Math.max(8, menuX),
          top: Math.max(8, menuY),
        }}
      >
        <MenuButton
          label={conversation.isPinned ? '取消置顶' : '置顶'}
          onClick={() => {
            onTogglePin();
            onClose();
          }}
        />
        <MenuButton
          label={conversation.isMuted ? '取消免打扰' : '免打扰'}
          onClick={() => {
            onToggleMute();
            onClose();
          }}
        />
        <div style={dividerStyle} />
        <MenuButton label="删除会话" disabled onClick={() => {}} />
      </div>
    </>
  );
};

const MenuButton: React.FC<{
  label: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, disabled = false, onClick }) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onClick={onClick}
    style={{
      width: '100%',
      height: 34,
      padding: '0 var(--space-md)',
      display: 'flex',
      alignItems: 'center',
      border: 'none',
      backgroundColor: 'transparent',
      color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
      fontSize: 'var(--font-size-sm)',
      cursor: disabled ? 'default' : 'pointer',
      fontFamily: 'var(--font-family)',
      whiteSpace: 'nowrap',
      textAlign: 'left',
      opacity: disabled ? 0.55 : 1,
    }}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    {label}
  </button>
);

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
};

const menuStyle: React.CSSProperties = {
  position: 'fixed',
  width: 160,
  padding: 'var(--space-xs) 0',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-primary)',
  boxShadow: 'var(--shadow-md)',
  zIndex: 81,
  overflow: 'hidden',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  backgroundColor: 'var(--border-default)',
  margin: 'var(--space-xs) 0',
};
