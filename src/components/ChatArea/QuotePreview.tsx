import React, { useEffect, useMemo, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import type { Message, MessageType } from '../../types';

interface QuotePreviewProps {
  quoteId: string;
  conversationId?: string;
  mode?: 'bubble' | 'bar';
  onCancel?: () => void;
}

export const QuotePreview: React.FC<QuotePreviewProps> = ({
  quoteId,
  conversationId,
  mode = 'bubble',
  onCancel,
}) => {
  const users = useChatStore((s) => s.users);
  const fetchMessage = useChatStore((s) => s.fetchMessage);
  const jumpToMessage = useChatStore((s) => s.jumpToMessage);
  const localMessage = useChatStore((s) =>
    findMessage(s.messagesByConversation, quoteId, conversationId),
  );
  const [remoteMessage, setRemoteMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestedId, setRequestedId] = useState<string | null>(null);

  useEffect(() => {
    setRemoteMessage(null);
    setRequestedId(null);
  }, [quoteId]);

  useEffect(() => {
    if (localMessage || remoteMessage || loading || requestedId === quoteId) return;
    let cancelled = false;
    setRequestedId(quoteId);
    setLoading(true);
    fetchMessage(quoteId)
      .then((message) => {
        if (!cancelled) setRemoteMessage(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchMessage, loading, localMessage, quoteId, remoteMessage, requestedId]);

  const quoted = localMessage ?? remoteMessage;
  const senderName = useMemo(() => {
    if (!quoted) return '';
    const sender = users[quoted.senderId];
    return sender?.nickname || sender?.username || `用户 ${quoted.senderId}`;
  }, [quoted, users]);

  const handleJump = () => {
    if (!quoted) return;
    void jumpToMessage(quoted.conversationId, quoted.id, quoted);
  };

  const content = quoted
    ? getMessageSummary(quoted.type, quoted.content)
    : loading
      ? '引用消息加载中...'
      : '引用消息不可用';

  const containerStyle = mode === 'bar' ? quoteBarStyle : quoteBubbleStyle;

  return (
    <div style={containerStyle}>
      <button
        type="button"
        onClick={handleJump}
        disabled={!quoted}
        title={quoted ? '跳转到引用消息' : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          padding: 0,
          background: 'transparent',
          color: 'inherit',
          textAlign: 'left',
          cursor: quoted ? 'pointer' : 'default',
          fontFamily: 'var(--font-family)',
        }}
      >
        {senderName && (
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--accent-link)',
              fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              marginBottom: 2,
            }}
          >
            {senderName}
          </div>
        )}
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: quoted ? 'var(--text-secondary)' : 'var(--text-muted)',
          }}
        >
          {truncate(content, mode === 'bar' ? 120 : 80)}
        </div>
      </button>

      {onCancel && (
        <button
          type="button"
          aria-label="取消引用"
          title="取消引用"
          onClick={onCancel}
          style={cancelButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          x
        </button>
      )}
    </div>
  );
};

function findMessage(
  messagesByConversation: Record<string, Message[]>,
  quoteId: string,
  conversationId?: string,
): Message | undefined {
  if (conversationId) {
    return messagesByConversation[conversationId]?.find((message) => message.id === quoteId);
  }
  return Object.values(messagesByConversation)
    .flat()
    .find((message) => message.id === quoteId);
}

function getMessageSummary(type: MessageType, content: string): string {
  if (type === 'text' || type === 'system') return content;
  try {
    const meta = JSON.parse(content) as { file_name?: string; mime_type?: string };
    const name = meta.file_name ? `: ${meta.file_name}` : '';
    if (type === 'image') return `[图片${name}]`;
    if (type === 'video') return `[视频${name}]`;
    return `[文件${name}]`;
  } catch {
    if (type === 'image') return '[图片]';
    if (type === 'video') return '[视频]';
    return '[文件]';
  }
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

const quoteBubbleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  borderLeft: '3px solid var(--accent-primary)',
  padding: 'var(--space-xs) var(--space-sm)',
  backgroundColor: 'var(--bg-secondary)',
  borderRadius: 'var(--radius-sm)',
  marginBottom: 'var(--space-sm)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--text-secondary)',
};

const quoteBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  borderLeft: '3px solid var(--accent-primary)',
  padding: 'var(--space-xs) var(--space-sm)',
  backgroundColor: 'var(--bg-secondary)',
  borderRadius: 'var(--radius-sm)',
  marginBottom: 'var(--space-sm)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--text-secondary)',
};

const cancelButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  flexShrink: 0,
  fontSize: 16,
  lineHeight: 1,
};
