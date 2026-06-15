/* ============================================
   纸条 PaperNote — 消息搜索弹窗
   ============================================ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { useChatStore } from '../../store/chatStore';
import type { SearchMessageResult } from '../../types';

interface SearchDialogProps {
  open: boolean;
  scopedConversationId?: string | null;
  onClose: () => void;
}

export const SearchDialog: React.FC<SearchDialogProps> = ({
  open,
  scopedConversationId,
  onClose,
}) => {
  const conversations = useChatStore((s) => s.conversations);
  const searchMessages = useChatStore((s) => s.searchMessages);
  const jumpToMessage = useChatStore((s) => s.jumpToMessage);

  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [results, setResults] = useState<SearchMessageResult[]>([]);
  const [loading, setLoading] = useState(false);

  const activeScopeId = selectedConversationId || undefined;
  const scopedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedConversationId(scopedConversationId ?? '');
    setResults([]);
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, scopedConversationId]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return undefined;
    const trimmed = query.trim();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const nextResults = await searchMessages(trimmed, activeScopeId);
        if (requestRef.current === requestId) {
          setResults(nextResults);
        }
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activeScopeId, open, query, searchMessages]);

  if (!open) return null;

  const handleResultClick = async (result: SearchMessageResult) => {
    await jumpToMessage(result.conversationId, result.id, result);
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <section style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={searchBoxStyle}>
            <SearchOutlined style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={selectedConversationId ? `搜索 ${scopedConversation?.name ?? '当前会话'}` : '搜索所有消息'}
              style={inputStyle}
            />
          </div>
          <button title="关闭" onClick={onClose} style={iconButtonStyle}>
            <CloseOutlined />
          </button>
        </div>

        <div style={scopeRowStyle}>
          <select
            value={selectedConversationId}
            onChange={(e) => setSelectedConversationId(e.target.value)}
            style={selectStyle}
          >
            <option value="">全部会话</option>
            {conversations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === 'channel' ? '# ' : ''}
                {c.name || '未命名会话'}
              </option>
            ))}
          </select>
          <span style={countStyle}>
            {loading ? '搜索中' : query.trim() ? `${results.length} 条结果` : '输入关键词开始搜索'}
          </span>
        </div>

        <div style={resultListStyle}>
          {!query.trim() && <EmptyState text="输入关键词后会显示匹配消息" />}
          {query.trim() && !loading && results.length === 0 && (
            <EmptyState text="没有找到匹配的消息" />
          )}
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => {
                void handleResultClick(result);
              }}
              style={resultItemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={resultMetaStyle}>
                <span style={conversationNameStyle}>
                  {result.conversationName || getConversationName(conversations, result.conversationId)}
                </span>
                <span style={timeStyle}>{formatTime(result.createdAt)}</span>
              </div>
              <p style={snippetStyle}>{highlightSnippet(result.content, query)}</p>
              <span style={senderStyle}>{result.senderName || result.senderId}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div style={emptyStyle}>{text}</div>
);

function getConversationName(
  conversations: ReturnType<typeof useChatStore.getState>['conversations'],
  conversationId: string,
): string {
  const conversation = conversations.find((c) => c.id === conversationId);
  return conversation?.name || '未命名会话';
}

function highlightSnippet(content: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return content;

  const lowerContent = content.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  if (index < 0) return truncate(content, 120);

  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + trimmed.length + 60);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < content.length ? '...' : '';
  const snippet = content.slice(start, end);
  const matchStart = index - start;
  const matchEnd = matchStart + trimmed.length;

  return (
    <>
      {prefix}
      {snippet.slice(0, matchStart)}
      <mark style={markStyle}>{snippet.slice(matchStart, matchEnd)}</mark>
      {snippet.slice(matchEnd)}
      {suffix}
    </>
  );
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = sameYear
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} ${time}`;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1200,
  backgroundColor: 'rgba(0, 0, 0, 0.28)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '9vh var(--space-lg) var(--space-lg)',
};

const dialogStyle: React.CSSProperties = {
  width: 'min(680px, 100%)',
  maxHeight: '78vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--space-sm)',
  alignItems: 'center',
  padding: 'var(--space-md)',
  borderBottom: '1px solid var(--border-default)',
};

const searchBoxStyle: React.CSSProperties = {
  flex: 1,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  padding: '0 var(--space-md)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--bg-secondary)',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-md)',
  fontFamily: 'var(--font-family)',
};

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 15,
};

const scopeRowStyle: React.CSSProperties = {
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-md)',
  padding: '0 var(--space-md)',
  borderBottom: '1px solid var(--border-default)',
};

const selectStyle: React.CSSProperties = {
  width: 220,
  height: 30,
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-family)',
  outline: 'none',
};

const countStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-sm)',
  whiteSpace: 'nowrap',
};

const resultListStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 260,
  overflowY: 'auto',
  padding: 'var(--space-sm) 0',
};

const resultItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 'var(--space-sm) var(--space-md)',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
};

const resultMetaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-md)',
};

const conversationNameStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--text-primary)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  fontSize: 'var(--font-size-sm)',
};

const timeStyle: React.CSSProperties = {
  flexShrink: 0,
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-xs)',
};

const snippetStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
};

const senderStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-xs)',
};

const markStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-active)',
  color: 'var(--text-primary)',
  borderRadius: 'var(--radius-sm)',
  padding: '0 2px',
};

const emptyStyle: React.CSSProperties = {
  padding: 60,
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-md)',
};
