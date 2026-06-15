/* ============================================
   纸条 PaperNote — 消息气泡
   支持：文本/引用/回应/线程预览/发送状态
   ============================================ */

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { MessageContentRouter } from './MessageFile';
import { QuotePreview } from './QuotePreview';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '👀'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const currentUserId = useChatStore((s) => s.currentUser?.id ?? '');
  const addReaction = useChatStore((s) => s.addReaction);
  const removeReaction = useChatStore((s) => s.removeReaction);
  const openThread = useChatStore((s) => s.openThread);
  const setQuote = useChatStore((s) => s.setQuote);
  const highlightedMessageId = useChatStore((s) => s.highlightedMessageId);
  const clearHighlightedMessage = useChatStore((s) => s.clearHighlightedMessage);
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
          {/* 更多操作 (占位) */}
          <ToolbarButton title="更多" onClick={() => {}}>
            ⋯
          </ToolbarButton>
        </div>
      )}

      {/* Emoji Picker 弹出 */}
      {showEmojiPicker && (
        <div
          style={{
            position: 'absolute',
            top: -72,
            [isOwn ? 'left' : 'right']: 0,
            display: 'flex',
            gap: 4,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-sm)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 20,
          }}
        >
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              style={{
                fontSize: 18,
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                padding: 2,
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              {emoji}
            </button>
          ))}
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
