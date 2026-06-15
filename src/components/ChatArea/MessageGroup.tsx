/* ============================================
   纸条 PaperNote — 消息组（同一发送者连续消息）
   ============================================ */

import React from 'react';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../common';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../../types';

interface MessageGroupProps {
  messages: Message[];
  senderId: string;
  isOwn: boolean;
}

export const MessageGroup: React.FC<MessageGroupProps> = ({ messages, senderId, isOwn }) => {
  const users = useChatStore((s) => s.users);
  const user = users[senderId];
  const senderName = user?.nickname ?? user?.username ?? senderId;
  const senderAvatar = user?.avatarUrl;

  const firstMsg = messages[0];
  const timeStr = formatTime(firstMsg.createdAt);
  const isRecalled = firstMsg.content === '你撤回了一条消息' || firstMsg.content === '对方撤回了一条消息';

  // 撤回消息：简化渲染，无头像/昵称/时间
  if (isRecalled) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-xs) 0', marginBottom: 'var(--space-xs)' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>
          {firstMsg.content}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
        alignItems: 'flex-start',
      }}
    >
      {/* 头像（自己的消息不显示头像） */}
      {!isOwn && <Avatar src={senderAvatar} name={senderName} size={36} />}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          maxWidth: '65%',
        }}
      >
        {/* 发送者名称 + 时间 */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            alignItems: 'baseline',
            marginBottom: 'var(--space-xs)',
            flexDirection: isOwn ? 'row-reverse' : 'row',
          }}
        >
          <span
            style={{
              fontWeight: 'var(--font-weight-semibold)' as any,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-primary)',
            }}
          >
            {senderName}
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
            }}
          >
            {timeStr}
          </span>
        </div>

        {/* 消息气泡列表 */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isOwn={isOwn} />
        ))}
      </div>
    </div>
  );
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
