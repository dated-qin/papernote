/* ============================================
   纸条 PaperNote — 会话文件管理面板
   按类型筛选（全部/图片/视频/文件）+ 点击跳转消息
   ============================================ */

import React, { useState, useMemo } from 'react';
import { useChatStore } from '../../store/chatStore';
import { apiUrl } from '../../utils/fileUtils';
import type { Message } from '../../types';

type FileTab = 'all' | 'image' | 'video' | 'file';

interface FileItem {
  messageId: string;
  type: 'image' | 'video' | 'file';
  name: string;
  url: string;
  thumbnailUrl?: string;
  size?: number;
}

// ---------- 内容解析 ----------

function parseMsgContent(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractFileItems(messages: Message[]): FileItem[] {
  const items: FileItem[] = [];
  for (const msg of messages) {
    const parsed = parseMsgContent(msg.content);
    if (!parsed) continue;
    if (msg.type === 'image' && parsed.url) {
      items.push({
        messageId: msg.id,
        type: 'image',
        name: (parsed.name as string) || '图片',
        url: apiUrl(parsed.url as string),
        thumbnailUrl: apiUrl((parsed.thumbnail_url as string) || (parsed.url as string)),
      });
    } else if (msg.type === 'video' && parsed.url) {
      items.push({
        messageId: msg.id,
        type: 'video',
        name: (parsed.name as string) || '视频',
        url: apiUrl(parsed.url as string),
        thumbnailUrl: apiUrl((parsed.thumbnail_url as string) || (parsed.url as string)),
      });
    } else if (msg.type === 'file' && parsed.url) {
      items.push({
        messageId: msg.id,
        type: 'file',
        name: (parsed.name as string) || '文件',
        url: apiUrl(parsed.url as string),
        size: parsed.size as number | undefined,
      });
    }
  }
  return items.reverse(); // 最新的在前
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------- 组件 ----------

export const FilesPanel: React.FC = () => {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const jumpToMessage = useChatStore((s) => s.jumpToMessage);

  const [tab, setTab] = useState<FileTab>('all');

  const allFiles = useMemo(() => {
    if (!activeConversationId) return [];
    const msgs = messagesByConversation[activeConversationId] ?? [];
    return extractFileItems(msgs);
  }, [activeConversationId, messagesByConversation]);

  const filtered = useMemo(() => {
    if (tab === 'all') return allFiles;
    return allFiles.filter((f) => f.type === tab);
  }, [allFiles, tab]);

  const conversation = useChatStore((s) => s.getActiveConversation());
  if (!activeConversationId || !conversation) return null;

  const tabs: { key: FileTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'image', label: '图片' },
    { key: 'video', label: '视频' },
    { key: 'file', label: '文件' },
  ];

  return (
    <div style={panelStyle}>
      {/* 头部 */}
      <div style={headerStyle}>
        <span style={titleStyle}>文件</span>
      </div>

      {/* Tab 切换 */}
      <div style={tabBarStyle}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...tabBtnStyle,
              color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 文件列表 */}
      <div style={listStyle}>
        {filtered.length === 0 ? (
          <div style={emptyStyle}>暂无文件</div>
        ) : (
          filtered.map((item) => (
            <div
              key={`${item.messageId}-${item.url}`}
              onClick={() => {
                void jumpToMessage(activeConversationId, item.messageId);
              }}
              style={itemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {item.type === 'image' || item.type === 'video' ? (
                <div style={thumbnailWrapStyle}>
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.name}
                    style={thumbnailStyle}
                    loading="lazy"
                  />
                  {item.type === 'video' && (
                    <span style={videoBadgeStyle}>▶</span>
                  )}
                </div>
              ) : (
                <div style={fileIconStyle}>
                  {getFileIcon(item.name)}
                </div>
              )}
              <div style={fileInfoStyle}>
                <div style={fileNameStyle}>{item.name}</div>
                {item.size && (
                  <div style={fileSizeStyle}>{formatSize(item.size)}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ---------- 辅助 ----------

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return '📄';
    case 'doc': case 'docx': return '📝';
    case 'xls': case 'xlsx': return '📊';
    case 'ppt': case 'pptx': return '📽';
    case 'zip': case 'rar': case '7z': return '📦';
    case 'mp3': case 'wav': case 'ogg': return '🎵';
    default: return '📎';
  }
}

// ---------- 样式 ----------

const panelStyle: React.CSSProperties = {
  width: 380,
  borderLeft: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-primary)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const headerStyle: React.CSSProperties = {
  height: 52,
  padding: '0 var(--space-lg)',
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid var(--border-default)',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 'var(--font-weight-bold)' as any,
  fontSize: 'var(--font-size-lg)',
  color: 'var(--text-primary)',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--border-default)',
  flexShrink: 0,
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  height: 36,
  border: 'none',
  backgroundColor: 'transparent',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
  transition: 'color 0.15s, border-color 0.15s',
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 'var(--space-sm)',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 48,
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-md)',
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  padding: 'var(--space-sm)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'background-color 0.1s',
};

const thumbnailWrapStyle: React.CSSProperties = {
  position: 'relative',
  width: 48,
  height: 48,
  borderRadius: 'var(--radius-sm)',
  overflow: 'hidden',
  flexShrink: 0,
  backgroundColor: 'var(--bg-secondary)',
};

const thumbnailStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const videoBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.3)',
  color: '#fff',
  fontSize: 20,
};

const fileIconStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--bg-secondary)',
  flexShrink: 0,
};

const fileInfoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const fileNameStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--text-primary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const fileSizeStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--text-muted)',
  marginTop: 2,
};
