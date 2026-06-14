/* ============================================
   纸条 PaperNote — 聊天主区域
   ============================================ */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../store/chatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export const ChatArea: React.FC = () => {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const conversation = useChatStore((s) => s.getActiveConversation());

  if (!activeConversationId || !conversation) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-lg)',
        }}
      >
        选择一个会话开始聊天
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        minWidth: 0, // 防止 flex 子元素溢出
      }}
    >
      <ChatHeader />
      <MessageList />
      <MessageInput />
    </div>
  );
};

// ============ 聊天头部 ============
const ChatHeader: React.FC = () => {
  const navigate = useNavigate();
  const conversation = useChatStore((s) => s.getActiveConversation());

  if (!conversation) return null;

  return (
    <div
      style={{
        height: 52,
        padding: '0 var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <span
          style={{
            fontWeight: 'var(--font-weight-bold)' as any,
            fontSize: 'var(--font-size-lg)',
            color: 'var(--text-primary)',
          }}
        >
          {conversation.type === 'channel' ? '# ' : ''}
          {conversation.name}
        </span>
        {conversation.type === 'channel' && conversation.memberIds && (
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {conversation.memberIds.length} 位成员
          </span>
        )}
      </div>

      {/* 右侧操作按钮 */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', color: 'var(--text-secondary)' }}>
        {conversation.type === 'channel' && (
          <button
            title="群设置"
            onClick={() => navigate(`/channel/${conversation.id}/settings`)}
            style={{
              ...headerIconStyle,
              border: 'none',
              background: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            👥
          </button>
        )}
        <span title="搜索" style={headerIconStyle}>🔍</span>
        <span title="更多" style={headerIconStyle}>⚙</span>
      </div>
    </div>
  );
};

const headerIconStyle: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 16,
  padding: 'var(--space-xs)',
  borderRadius: 'var(--radius-sm)',
};
