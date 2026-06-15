/* ============================================
   纸条 PaperNote — 聊天主区域
   ============================================ */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationOutlined, SearchOutlined } from '@ant-design/icons';
import { useChatStore } from '../../store/chatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Lightbox } from './Lightbox';
import type { Announcement } from '../../types';

interface ChatAreaProps {
  onOpenSearch?: (conversationId?: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenSearch }) => {
  const navigate = useNavigate();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const conversation = useChatStore((s) => s.getActiveConversation());
  const announcements = useChatStore((s) =>
    activeConversationId ? s.announcementsByConversation[activeConversationId] : undefined,
  );
  const getAnnouncements = useChatStore((s) => s.getAnnouncements);
  const lightbox = useChatStore((s) => s.lightbox);
  const closeLightbox = useChatStore((s) => s.closeLightbox);

  useEffect(() => {
    if (!activeConversationId || conversation?.type !== 'channel' || announcements) return;
    void getAnnouncements(activeConversationId);
  }, [activeConversationId, announcements, conversation?.type, getAnnouncements]);

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

  const latestAnnouncement =
    conversation.type === 'channel' ? announcements?.[0] : undefined;

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
      <ChatHeader onOpenSearch={onOpenSearch} />
      {latestAnnouncement && (
        <AnnouncementBar
          announcement={latestAnnouncement}
          onOpen={() => navigate(`/channel/${conversation.id}/settings`)}
        />
      )}
      <MessageList />
      <MessageInput />
      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
};

const AnnouncementBar: React.FC<{
  announcement: Announcement;
  onOpen: () => void;
}> = ({ announcement, onOpen }) => (
  <div
    style={{
      minHeight: 38,
      padding: '6px var(--space-lg)',
      borderBottom: '1px solid var(--border-default)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-sm)',
      flexShrink: 0,
      minWidth: 0,
    }}
  >
    <NotificationOutlined style={{ color: 'var(--accent-primary)', fontSize: 15 }} />
    <span
      style={{
        color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
        flexShrink: 0,
      }}
    >
      群公告
    </span>
    <span
      title={announcement.content}
      style={{
        color: 'var(--text-primary)',
        fontSize: 'var(--font-size-sm)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        flex: 1,
      }}
    >
      {announcement.content}
    </span>
    <button
      type="button"
      onClick={onOpen}
      style={{
        height: 26,
        padding: '0 var(--space-sm)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-default)',
        backgroundColor: 'transparent',
        color: 'var(--accent-link)',
        fontSize: 'var(--font-size-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-family)',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      查看详情
    </button>
  </div>
);

// ============ 聊天头部 ============
const ChatHeader: React.FC<ChatAreaProps> = ({ onOpenSearch }) => {
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
        <button
          title="搜索"
          onClick={() => onOpenSearch?.(conversation.id)}
          style={{
            ...headerButtonStyle,
            ...headerIconStyle,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          <SearchOutlined />
        </button>
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

const headerButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-family)',
};
