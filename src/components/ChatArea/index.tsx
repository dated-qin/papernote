/* ============================================
   纸条 PaperNote — 聊天主区域
   ============================================ */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationOutlined, SearchOutlined } from '@ant-design/icons';
import { useChatStore } from '../../store/chatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Lightbox } from './Lightbox';
import type { Announcement } from '../../types';

interface ChatAreaProps {
  onOpenSearch?: (conversationId?: string) => void;
  onToggleFiles?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenSearch, onToggleFiles }) => {
  const navigate = useNavigate();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const conversation = useChatStore((s) => s.getActiveConversation());
  const announcements = useChatStore((s) =>
    activeConversationId ? s.announcementsByConversation[activeConversationId] : undefined,
  );
  const getAnnouncements = useChatStore((s) => s.getAnnouncements);
  const lightbox = useChatStore((s) => s.lightbox);
  const closeLightbox = useChatStore((s) => s.closeLightbox);
  const friends = useChatStore((s) => s.friends);
  const fetchFriends = useChatStore((s) => s.fetchFriends);
  const inviteMembers = useChatStore((s) => s.inviteMembers);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteSelected, setInviteSelected] = useState<string[]>([]);

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
      <ChatHeader
        onOpenSearch={onOpenSearch}
        onToggleFiles={onToggleFiles}
        onInvite={() => {
          void fetchFriends();
          setInviteSelected([]);
          setShowInviteDialog(true);
        }}
      />
      {latestAnnouncement && (
        <AnnouncementBar
          announcement={latestAnnouncement}
          onOpen={() => navigate(`/channel/${conversation.id}/settings`)}
        />
      )}
      <MessageList />
      <MessageInput />
      {showInviteDialog && conversation && (
        <InviteDialog
          conversationId={conversation.id}
          friends={friends}
          selected={inviteSelected}
          onToggle={(userId) =>
            setInviteSelected((prev) =>
              prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
            )
          }
          onInvite={async () => {
            if (inviteSelected.length === 0) return;
            await inviteMembers(conversation.id, inviteSelected);
            setShowInviteDialog(false);
          }}
          onClose={() => setShowInviteDialog(false)}
        />
      )}
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
const ChatHeader: React.FC<ChatAreaProps & { onInvite?: () => void }> = ({ onOpenSearch, onToggleFiles, onInvite }) => {
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
        {onInvite && conversation.type === 'channel' && (
          <button
            title="邀请成员"
            onClick={onInvite}
            style={{
              ...headerIconStyle,
              border: 'none',
              background: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              fontSize: 16,
            }}
          >
            ➕
          </button>
        )}
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
        {onToggleFiles && (
          <button
            title="文件面板"
            onClick={onToggleFiles}
            style={{
              ...headerIconStyle,
              border: 'none',
              background: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              fontSize: 16,
            }}
          >
            📎
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

// ============ 邀请成员对话框 ============

interface InviteDialogProps {
  conversationId: string;
  friends: Array<{ userId: string; nickname: string; username: string }>;
  selected: string[];
  onToggle: (userId: string) => void;
  onInvite: () => void;
  onClose: () => void;
}

const InviteDialog: React.FC<InviteDialogProps> = ({
  friends,
  selected,
  onToggle,
  onInvite,
  onClose,
}) => {
  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-primary)' }}>
          邀请成员加入频道
        </h3>
        {friends.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>暂无好友可邀请</p>
        ) : (
          <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
            {friends.map((f) => {
              const sel = selected.includes(f.userId);
              return (
                <button
                  key={f.userId}
                  onClick={() => onToggle(f.userId)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: sel ? 'var(--bg-active)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 18, textAlign: 'center', fontSize: 11 }}>{sel ? '✓' : ''}</span>
                  {f.nickname || f.username}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>取消</button>
          <button
            onClick={onInvite}
            disabled={selected.length === 0}
            style={{
              ...primaryBtnStyle,
              opacity: selected.length === 0 ? 0.5 : 1,
            }}
          >
            邀请 ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  backgroundColor: 'rgba(0,0,0,0.28)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const dialogStyle: React.CSSProperties = {
  width: 'min(360px, 90vw)',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  padding: 24,
};

const primaryBtnStyle: React.CSSProperties = {
  height: 36, padding: '0 16px', border: 'none', borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--accent-primary)', color: 'var(--white)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family)',
};

const secondaryBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  backgroundColor: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)',
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
