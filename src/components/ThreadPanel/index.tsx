/* ============================================
   纸条 PaperNote — 右侧话题面板
   ============================================ */

import React, { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from '../ChatArea/MessageBubble';

export const ThreadPanel: React.FC = () => {
  const activeThreadRootId = useChatStore((s) => s.activeThreadRootId);
  const closeThread = useChatStore((s) => s.closeThread);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const currentUserId = useChatStore((s) => s.currentUser?.id ?? '');
  const messages = useChatStore((s) => s.getActiveMessages());

  const [replyText, setReplyText] = useState('');

  if (!activeThreadRootId) return null;

  const rootMessage = messages.find((m) => m.id === activeThreadRootId);
  const replies = messages.filter((m) => m.threadRootId === activeThreadRootId);

  const handleReply = () => {
    if (!replyText.trim()) return;
    // 在线程中回复，threadRootId 指向根消息
    sendMessage(replyText, undefined, activeThreadRootId);
    setReplyText('');
  };

  return (
    <div
      style={{
        width: 380,
        borderLeft: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          height: 52,
          padding: '0 var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 'var(--font-weight-bold)' as any,
            fontSize: 'var(--font-size-lg)',
            color: 'var(--text-primary)',
          }}
        >
          话题
        </span>
        <button
          onClick={closeThread}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 20,
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          ✕
        </button>
      </div>

      {/* 根消息 */}
      {rootMessage && (
        <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-default)' }}>
          <MessageBubble
            message={rootMessage}
            isOwn={rootMessage.senderId === currentUserId}
          />
        </div>
      )}

      {/* 回复列表 + 计数 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)' }}>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-md)',
          }}
        >
          {replies.length} 条回复
        </p>
        {replies.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 'var(--space-sm)' }}>
            <MessageBubble message={msg} isOwn={msg.senderId === currentUserId} />
          </div>
        ))}
      </div>

      {/* 回复输入 */}
      <div
        style={{
          borderTop: '1px solid var(--border-default)',
          padding: 'var(--space-md)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleReply();
            }}
            placeholder="在话题中回复…"
            style={{
              flex: 1,
              height: 36,
              padding: '0 var(--space-md)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              fontSize: 'var(--font-size-md)',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-secondary)',
              outline: 'none',
              fontFamily: 'var(--font-family)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent-primary)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-default)';
            }}
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim()}
            style={{
              height: 36,
              padding: '0 var(--space-md)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: replyText.trim() ? 'var(--accent-primary)' : 'var(--bg-hover)',
              color: replyText.trim() ? 'var(--white)' : 'var(--text-muted)',
              cursor: replyText.trim() ? 'pointer' : 'default',
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)' as any,
              whiteSpace: 'nowrap',
            }}
          >
            发送
          </button>
        </div>
      </div>

      {/* 滑入动画 */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};
