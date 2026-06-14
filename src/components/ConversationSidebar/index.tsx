/* ============================================
   纸条 PaperNote — 会话列表侧边栏
   ============================================ */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../store/chatStore';
import { Avatar, UnreadBadge } from '../common';
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

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
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
                    setShowCreateMenu(false);
                    // 创建频道：弹窗输入（简化：直接提示）
                    const name = prompt('请输入频道名称：');
                    if (name?.trim()) {
                      useChatStore.getState().createChannel(name.trim(), []);
                    }
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

      {/* 会话列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-sm) 0' }}>
        {SECTIONS.map((section) => {
          const items = conversations.filter(section.filter);
          if (items.length === 0) return null;
          const collapsed = collapsedSections[section.key];

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
                  />
                ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

// ============ 单个会话行 ============
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const lastMsgPreview = conversation.lastMessage
    ? truncate(conversation.lastMessage.content, 30)
    : '暂无消息';

  return (
    <button
      onClick={onClick}
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
              fontWeight: isActive
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
          {conversation.draft ? `[草稿] ${conversation.draft}` : lastMsgPreview}
        </span>
      </div>

      <UnreadBadge count={conversation.unreadCount} showDot={conversation.isMuted && conversation.unreadCount > 0} />
    </button>
  );
};

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}
