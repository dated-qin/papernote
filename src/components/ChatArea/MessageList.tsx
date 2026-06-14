/* ============================================
   纸条 PaperNote — 消息列表（虚拟滚动）
   ============================================ */

import React, { useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { DateDivider } from '../common';
import { MessageGroup } from './MessageGroup';
import type { Message } from '../../types';

/** 按日期分组，并在日期边界插入分隔线 */
interface GroupedBlock {
  type: 'date' | 'group';
  label?: string;
  messages?: Message[];
  senderId?: string;
}

function groupMessages(messages: Message[]): GroupedBlock[] {
  const blocks: GroupedBlock[] = [];
  let currentGroup: Message[] = [];
  let currentSender = '';
  let lastDate = '';

  const getDateLabel = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return '今天';
    if (d.toDateString() === yesterday.toDateString()) return '昨天';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    // 跳过线程回复（它们在线程面板显示）
    if (msg.threadRootId) continue;

    const dateLabel = getDateLabel(msg.createdAt);

    // 新的一天 → 插入日期分隔线
    if (dateLabel !== lastDate) {
      if (currentGroup.length > 0) {
        blocks.push({ type: 'group', messages: [...currentGroup], senderId: currentSender });
        currentGroup = [];
      }
      blocks.push({ type: 'date', label: dateLabel });
      lastDate = dateLabel;
      currentSender = '';
    }

    // 发送者变化或前一消息超过 5 分钟 → 新分组
    const prevMsg = i > 0 ? messages[i - 1] : null;
    const timeGap = prevMsg ? msg.createdAt - prevMsg.createdAt : Infinity;
    if (msg.senderId !== currentSender || timeGap > 5 * 60 * 1000) {
      if (currentGroup.length > 0) {
        blocks.push({ type: 'group', messages: [...currentGroup], senderId: currentSender });
        currentGroup = [];
      }
      currentSender = msg.senderId;
    }

    currentGroup.push(msg);
  }

  // 剩余
  if (currentGroup.length > 0) {
    blocks.push({ type: 'group', messages: currentGroup, senderId: currentSender });
  }

  return blocks;
}

export const MessageList: React.FC = () => {
  const messages = useChatStore((s) => s.getActiveMessages());
  const currentUserId = useChatStore((s) => s.currentUser?.id ?? '');
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);

  const blocks = groupMessages(messages);

  // 新消息到达自动滚到底部（若用户已在底部附近）
  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (messages.length > prevLengthRef.current && isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length, isNearBottom]);

  // 初始加载滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  return (
    <div
      ref={listRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-sm) var(--space-lg)',
      }}
    >
      {blocks.map((block, i) => {
        if (block.type === 'date') {
          return <DateDivider key={`date-${i}`} label={block.label!} />;
        }
        return (
          <MessageGroup
            key={`group-${i}`}
            messages={block.messages!}
            senderId={block.senderId!}
            isOwn={block.senderId === currentUserId}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
