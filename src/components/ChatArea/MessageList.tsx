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
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const fetchHistory = useChatStore((s) => s.fetchHistory);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLoadingMore = useRef(false);
  const hasMore = useRef(true);
  const oldestIdRef = useRef('');
  const prevConvRef = useRef<string | null>(null);
  const shouldScrollBottom = useRef(false);

  const blocks = groupMessages(messages);

  // 切换会话时：重置 + 标记需要滚到底部
  if (activeConversationId !== prevConvRef.current) {
    prevConvRef.current = activeConversationId;
    hasMore.current = true;
    oldestIdRef.current = '';
    isLoadingMore.current = false;
    shouldScrollBottom.current = true;
  }

  // 每次渲染后按需滚到底部
  useEffect(() => {
    if (!shouldScrollBottom.current) return;
    const el = listRef.current;
    if (!el || messages.length === 0) return;
    shouldScrollBottom.current = false;
    el.scrollTop = el.scrollHeight;
  });

  // 新消息到达：如果已接近底部则滚
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (messages.length <= prevLenRef.current) {
      prevLenRef.current = messages.length;
      return;
    }
    prevLenRef.current = messages.length;
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // 向上滚动加载更早消息
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || isLoadingMore.current || !hasMore.current) return;
    if (el.scrollTop > 0) return;
    const oldest = messages[0];
    if (!oldest || !activeConversationId) return;
    if (oldest.id === oldestIdRef.current) {
      hasMore.current = false;
      return;
    }
    oldestIdRef.current = oldest.id;
    isLoadingMore.current = true;
    const prevLen = messages.length;
    void fetchHistory(activeConversationId, oldest.id).finally(() => {
      isLoadingMore.current = false;
      if (useChatStore.getState().getActiveMessages().length === prevLen) {
        hasMore.current = false;
      }
    });
  }, [messages, activeConversationId, fetchHistory]);

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
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
