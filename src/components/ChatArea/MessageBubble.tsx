/* ============================================
   纸条 PaperNote — 消息气泡
   支持：文本/引用/回应/线程预览/发送状态
   ============================================ */

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { MessageContentRouter } from './MessageFile';
import { QuotePreview } from './QuotePreview';
import { EmojiPicker } from './EmojiPicker';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}


export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const currentUserId = useChatStore((s) => s.currentUser?.id ?? '');
  const addReaction = useChatStore((s) => s.addReaction);
  const removeReaction = useChatStore((s) => s.removeReaction);
  const openThread = useChatStore((s) => s.openThread);
  const setQuote = useChatStore((s) => s.setQuote);
  const highlightedMessageId = useChatStore((s) => s.highlightedMessageId);
  const clearHighlightedMessage = useChatStore((s) => s.clearHighlightedMessage);
  const recallMessage = useChatStore((s) => s.recallMessage);
  const deleteMessageLocally = useChatStore((s) => s.deleteMessageLocally);
  const forwardMessage = useChatStore((s) => s.forwardMessage);
  const conversations = useChatStore((s) => s.conversations);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isHighlighted = highlightedMessageId === message.id;
  const isMentioned =
    !isOwn && !!message.mentionIds?.some((id) => id === currentUserId || id === 'all');

  const convId = message.conversationId;

  useEffect(() => {
    if (!isHighlighted) return undefined;
    bubbleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => {
      clearHighlightedMessage();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [clearHighlightedMessage, isHighlighted]);

  const handleReaction = (emoji: string) => {
    const existing = message.reactions?.find((r) => r.emoji === emoji);
    if (existing?.userIds.includes(currentUserId)) {
      removeReaction(convId, message.id, emoji, currentUserId);
    } else {
      addReaction(convId, message.id, emoji, currentUserId);
    }
    setShowEmojiPicker(false);
  };

  const bubbleStyle: React.CSSProperties = {
    backgroundColor: isOwn ? 'var(--msg-own-bg)' : 'var(--msg-other-bg)',
    borderRadius: isOwn
      ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
      : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
    padding: 'var(--space-sm) var(--space-md)',
    maxWidth: '100%',
    boxShadow: 'var(--shadow-sm)',
    outline: isHighlighted ? '2px solid var(--accent-primary)' : 'none',
    outlineOffset: 2,
    borderLeft: isMentioned ? '3px solid var(--accent-link)' : undefined,
    position: 'relative',
    wordBreak: 'break-word',
    marginBottom: 'var(--space-xs)',
    transition: 'outline-color 0.2s, background-color 0.2s',
  };

  // 发送状态指示
  const statusIndicator = () => {
    if (!isOwn) return null;
    if (message.status === 'sending') return <span style={statusStyle}>⏳</span>;
    if (message.status === 'failed') return <span style={{ ...statusStyle, color: 'var(--accent-red)' }} title="发送失败，点击重发">⚠️</span>;
    return null;
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 4,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* 消息气泡 */}
      <div ref={bubbleRef} data-message-id={message.id} style={bubbleStyle}>
        {/* 引用回复 */}
        {message.quoteId && (
          <QuotePreview quoteId={message.quoteId} conversationId={message.conversationId} />
        )}

        {/* 消息内容（按类型路由） */}
        <MessageContentRouter type={message.type} content={message.content} />

        {/* 消息回应 */}
        {message.reactions && message.reactions.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {message.reactions.map((r) => {
              const isActive = r.userIds.includes(currentUserId);
              return (
                <button
                  key={r.emoji}
                  onClick={() => handleReaction(r.emoji)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    backgroundColor: isActive ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    transition: 'border-color 0.1s',
                  }}
                >
                  {r.emoji} {r.userIds.length}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {statusIndicator()}

      {/* 悬停操作工具栏 */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: -32,
            [isOwn ? 'left' : 'right']: 0,
            display: 'flex',
            gap: 2,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: 2,
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
          }}
        >
          {/* 表情回应按钮 */}
          <ToolbarButton
            title="添加回应"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😊
          </ToolbarButton>
          {/* 线程回复 */}
          <ToolbarButton title="在话题中回复" onClick={() => openThread(message.id)}>
            💬
          </ToolbarButton>
          {/* 引用回复 */}
          <ToolbarButton
            title="引用回复"
            onClick={() => setQuote(message.conversationId, message.id)}
          >
            ↩
          </ToolbarButton>
          {/* 更多操作 */}
          <ToolbarButton title="更多" onClick={() => setShowActionsMenu(!showActionsMenu)}>
            ⋯
          </ToolbarButton>
        </div>
      )}

      {/* 操作菜单 */}
      {showActionsMenu && (
        <MessageActionsMenu
          message={message}
          isOwn={isOwn}
          conversationId={message.conversationId}
          conversations={conversations}
          onCopy={() => {
            void navigator.clipboard.writeText(message.content);
            setShowActionsMenu(false);
          }}
          onForward={(targetConvId: string) => {
            forwardMessage(message.conversationId, message.id, targetConvId);
            setShowActionsMenu(false);
          }}
          onRecall={() => {
            void recallMessage(message.id);
            setShowActionsMenu(false);
          }}
          onDelete={() => {
            deleteMessageLocally(message.conversationId, message.id);
            setShowActionsMenu(false);
          }}
          onClose={() => setShowActionsMenu(false)}
        />
      )}

      {/* Emoji Picker 弹出 */}
      {showEmojiPicker && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            [isOwn ? 'left' : 'right']: 0,
            zIndex: 20,
          }}
        >
          <EmojiPicker
            recentKey="reaction"
            onSelect={(emoji) => handleReaction(emoji)}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* 线程回复数预览 */}
      {message.replyCount !== undefined && message.replyCount > 0 && (
        <button
          onClick={() => openThread(message.id)}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--accent-link)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            marginTop: 2,
            padding: 0,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.textDecoration = 'none';
          }}
        >
          {message.replyCount} 条回复
        </button>
      )}
    </div>
  );
};

// ============ 工具栏按钮 ============
const ToolbarButton: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, onClick, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 28,
      height: 28,
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-sm)',
      fontSize: 14,
    }}
    onMouseEnter={(e) => {
      (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
    }}
    onMouseLeave={(e) => {
      (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
    }}
  >
    {children}
  </button>
);

const statusStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.6,
  flexShrink: 0,
};

// ============ 消息操作菜单 ============

interface MessageActionsMenuProps {
  message: Message;
  isOwn: boolean;
  conversationId: string;
  conversations: import('../../types').Conversation[];
  onCopy: () => void;
  onForward: (targetConvId: string) => void;
  onRecall: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const MessageActionsMenu: React.FC<MessageActionsMenuProps> = ({
  message,
  isOwn,
  conversationId,
  conversations,
  onCopy,
  onForward,
  onRecall,
  onDelete,
  onClose,
}) => {
  const [showForwardList, setShowForwardList] = useState(false);
  const canRecall = isOwn && message.type === 'text' && message.status !== 'failed';
  const forwardTargets = conversations.filter((c) => c.id !== conversationId);

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 30,
    minWidth: 160,
    padding: '4px 0',
    overflow: 'hidden',
  };

  if (showForwardList) {
    return (
      <>
        <div style={backdropStyle} onClick={onClose} />
        <div style={menuStyle}>
          <div style={menuHeaderStyle}>
            <button onClick={() => setShowForwardList(false)} style={backButtonStyle}>← 返回</button>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>转发到</span>
          </div>
          {forwardTargets.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              没有可转发的会话
            </div>
          ) : (
            forwardTargets.map((c) => (
              <button
                key={c.id}
                onClick={() => onForward(c.id)}
                style={menuItemStyle}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {c.type === 'channel' ? '🏠' : '💬'} {c.name}
              </button>
            ))
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={menuStyle}>
        {message.type === 'text' && (
          <button onClick={onCopy} style={menuItemStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            📋 复制
          </button>
        )}
        {message.type === 'text' && forwardTargets.length > 0 && (
          <button onClick={() => setShowForwardList(true)} style={menuItemStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            ↗ 转发
          </button>
        )}
        {canRecall && (
          <button onClick={onRecall} style={{ ...menuItemStyle, color: 'var(--accent-red)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            ↩ 撤回
          </button>
        )}
        {isOwn && (
          <button onClick={onDelete} style={{ ...menuItemStyle, color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            🗑 删除
          </button>
        )}
      </div>
    </>
  );
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  height: 34,
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
  whiteSpace: 'nowrap',
  textAlign: 'left' as const,
};

const menuHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 12px 8px 12px',
  borderBottom: '1px solid var(--border-default)',
  marginBottom: 4,
};

const backButtonStyle: React.CSSProperties = {
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--accent-link)',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'var(--font-family)',
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 29,
};

