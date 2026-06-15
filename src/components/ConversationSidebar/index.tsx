/* ============================================
   纸条 PaperNote — 会话列表侧边栏
   ============================================ */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../store/chatStore';
import { Avatar, UnreadBadge } from '../common';
import { ConversationContextMenu } from './ConversationContextMenu';
import type { Conversation } from '../../types';

/** 分区定义 */
interface Section {
  key: string;
  title: string;
  filter: (c: Conversation) => boolean;
}

const SECTIONS: Section[] = [
  { key: 'pinned', title: '置顶', filter: (c) => c.isPinned },
  { key: 'channels', title: '频道', filter: (c) => !c.isPinned && c.type === 'channel' },
  { key: 'dms', title: '私信', filter: (c) => !c.isPinned && c.type === 'dm' },
];

export const ConversationSidebar: React.FC = () => {
  const navigate = useNavigate();
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const createChannel = useChatStore((s) => s.createChannel);
  const togglePin = useChatStore((s) => s.togglePin);
  const toggleMute = useChatStore((s) => s.toggleMute);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showChannelDialog, setShowChannelDialog] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelError, setChannelError] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    conversation: Conversation;
    x: number;
    y: number;
  } | null>(null);

  const toggleSection = (key: string) => {
    if (key === 'pinned') return;
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openChannelDialog = () => {
    setShowCreateMenu(false);
    setChannelName('');
    setChannelError('');
    setShowChannelDialog(true);
  };

  const submitChannel = async () => {
    const name = channelName.trim();
    if (!name) {
      setChannelError('请输入频道名称');
      return;
    }

    setCreatingChannel(true);
    setChannelError('');
    try {
      const convId = await createChannel(name, []);
      setActiveConversation(convId);
      setShowChannelDialog(false);
    } catch {
      setChannelError('创建频道失败，请稍后再试');
    } finally {
      setCreatingChannel(false);
    }
  };

  return (
    <aside
      style={{
        width: 220,
        backgroundColor: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid var(--border-default)',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          height: 44,
          padding: '0 var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 'var(--font-weight-bold)' as any,
          fontSize: 'var(--font-size-lg)',
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <span>消息</span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            title="创建"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            +
          </button>
          {/* 创建菜单 */}
          {showCreateMenu && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 9,
                }}
                onClick={() => setShowCreateMenu(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 36,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 10,
                  minWidth: 140,
                  overflow: 'hidden',
                }}
              >
                <button
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 var(--space-md)',
                    display: 'flex',
                    alignItems: 'center',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => {
                    setShowCreateMenu(false);
                    navigate('/friends');
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }}
                >
                  👥 添加好友
                </button>
                <button
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 var(--space-md)',
                    display: 'flex',
                    alignItems: 'center',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => {
                    openChannelDialog();
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }}
                >
                  # 创建频道
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showChannelDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(0, 0, 0, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-lg)',
          }}
          onClick={() => {
            if (!creatingChannel) setShowChannelDialog(false);
          }}
        >
          <div
            style={{
              width: 'min(360px, 100%)',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: 'var(--space-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)' as any,
              }}
            >
              创建频道
            </h2>
            <input
              value={channelName}
              onChange={(e) => {
                setChannelName(e.target.value);
                if (channelError) setChannelError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitChannel();
                if (e.key === 'Escape' && !creatingChannel) setShowChannelDialog(false);
              }}
              placeholder="频道名称"
              autoFocus
              maxLength={128}
              style={{
                width: '100%',
                height: 36,
                marginTop: 'var(--space-md)',
                padding: '0 var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${channelError ? 'var(--accent-red)' : 'var(--border-default)'}`,
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-md)',
                outline: 'none',
                fontFamily: 'var(--font-family)',
                boxSizing: 'border-box',
              }}
            />
            {channelError && (
              <p
                style={{
                  margin: 'var(--space-xs) 0 0',
                  color: 'var(--accent-red)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                {channelError}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-sm)',
                marginTop: 'var(--space-lg)',
              }}
            >
              <button
                type="button"
                disabled={creatingChannel}
                onClick={() => setShowChannelDialog(false)}
                style={{
                  height: 32,
                  padding: '0 var(--space-md)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: creatingChannel ? 'default' : 'pointer',
                  fontFamily: 'var(--font-family)',
                }}
              >
                取消
              </button>
              <button
                type="button"
                disabled={creatingChannel}
                onClick={submitChannel}
                style={{
                  height: 32,
                  padding: '0 var(--space-md)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--white)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: creatingChannel ? 'default' : 'pointer',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {creatingChannel ? '创建中' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 会话列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-sm) 0' }}>
        {SECTIONS.map((section) => {
          const items = conversations.filter(section.filter);
          if (items.length === 0) return null;
          const collapsed = section.key === 'pinned' ? false : collapsedSections[section.key];

          return (
            <div key={section.key}>
              {/* 分区标题 */}
              <button
                onClick={() => toggleSection(section.key)}
                style={{
                  width: '100%',
                  height: 28,
                  padding: '0 var(--space-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-bold)' as any,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                    fontSize: 10,
                  }}
                >
                  ▼
                </span>
                {section.title}
              </button>

              {/* 会话项 */}
              {!collapsed &&
                items.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeId}
                    onClick={() => setActiveConversation(conv.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({
                        conversation: conv,
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }}
                  />
                ))}
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <ConversationContextMenu
          conversation={contextMenu.conversation}
          x={contextMenu.x}
          y={contextMenu.y}
          onTogglePin={() => void togglePin(contextMenu.conversation.id)}
          onToggleMute={() => void toggleMute(contextMenu.conversation.id)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  );
};

// ============ 单个会话行 ============
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  onContextMenu,
}) => {
  const [hovered, setHovered] = useState(false);
  const currentUserId = useChatStore((s) => s.currentUser?.id ?? '');
  const wasMentioned =
    conversation.unreadCount > 0 &&
    !!conversation.lastMessage?.mentionIds?.some(
      (id) => id === currentUserId || id === 'all',
    );
  const lastMsgPreview = conversation.lastMessage
    ? truncate(formatMentionPreview(conversation.lastMessage.content), 30)
    : '暂无消息';

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-xs) var(--space-md)',
        height: 48,
        border: 'none',
        backgroundColor: isActive ? 'var(--bg-active)' : hovered ? 'var(--bg-hover)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.1s',
        position: 'relative',
      }}
    >
      {/* 激活指示条 */}
      {isActive && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 2,
            height: 24,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-primary)',
          }}
        />
      )}

      <Avatar src={conversation.avatarUrl} name={conversation.name} size={32} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              fontWeight:
                conversation.isMuted && conversation.unreadCount > 0
                  ? ('var(--font-weight-normal)' as any)
                  : isActive
                    ? ('var(--font-weight-bold)' as any)
                    : ('var(--font-weight-semibold)' as any),
              fontSize: 'var(--font-size-md)',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 120,
            }}
          >
            {conversation.name}
          </span>
          {conversation.isMuted && (
            <span
              title="免打扰"
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-xs)',
                flexShrink: 0,
                marginLeft: 'var(--space-xs)',
              }}
            >
              🔕
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            marginTop: 2,
          }}
        >
          {conversation.draft
            ? `[草稿] ${conversation.draft}`
            : `${wasMentioned ? '[@你] ' : ''}${lastMsgPreview}`}
        </span>
      </div>

      <UnreadBadge
        count={conversation.unreadCount}
        showDot={conversation.isMuted && conversation.unreadCount > 0}
      />
    </button>
  );
};

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function formatMentionPreview(content: string): string {
  return content.replace(/<@(all|\d+)\|([^>]+)>/g, '@$2');
}
