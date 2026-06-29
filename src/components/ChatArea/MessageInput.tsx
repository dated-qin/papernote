/* ============================================
   纸条 PaperNote — 消息输入区
   工具栏（表情/@/图片/文件）+ TextEditor + SendButton + 文件上传
   ============================================ */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { IconButton } from '../common';
import { MentionPicker, type MentionOption } from './MentionPicker';
import { QuotePreview } from './QuotePreview';
import { EmojiPicker } from './EmojiPicker';
import { uploadFile } from '../../utils/upload';
import { wsClient } from '../../utils/ws';
import { MAX_FILE_SIZE, apiUrl } from '../../utils/fileUtils';
import type { GroupMember } from '../../types';

export const MessageInput: React.FC = () => {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const activeQuote = useChatStore((s) => s.activeQuote);
  const clearQuote = useChatStore((s) => s.clearQuote);
  const conversation = useChatStore((s) => s.getActiveConversation());
  const currentUserId = useChatStore((s) => s.currentUser?.id ?? '');
  const getMembers = useChatStore((s) => s.getMembers);
  const inputDraft = useChatStore((s) => s.inputDraft);
  const saveDraft = useChatStore((s) => s.saveDraft);
  const clearDraft = useChatStore((s) => s.clearDraft);
  const [value, setValue] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingLastRef = useRef<number>(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 上传状态
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const mentionIds = parseMentionIds(value);
  const currentMember = members.find((m) => m.userId === currentUserId);
  const canMentionAll =
    conversation?.type === 'channel' &&
    (currentMember?.role === 'owner' || currentMember?.role === 'admin');
  const visibleQuote =
    activeQuote && activeQuote.conversationId === activeConversationId ? activeQuote : null;

  useEffect(() => {
    if (!activeConversationId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    getMembers(activeConversationId)
      .then((nextMembers) => {
        if (!cancelled) setMembers(nextMembers);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConversationId, getMembers]);

  // 切换会话时加载/恢复草稿
  useEffect(() => {
    const draft = activeConversationId ? inputDraft[activeConversationId] : '';
    setValue(draft || '');
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  // 仅在 activeConversationId 变化时触发
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    sendMessage(trimmed, undefined, undefined, 'text', mentionIds);
    setValue('');
    setMentionOpen(false);
    if (activeConversationId) clearDraft(activeConversationId);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [mentionIds, sendMessage, value, activeConversationId, clearDraft]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && ['Enter', 'ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    setValue(nextValue);
    // 实时保存草稿
    if (activeConversationId) saveDraft(activeConversationId, nextValue);
    // 发送正在输入事件（节流 2 秒）
    if (activeConversationId) {
      const now = Date.now();
      if (!typingLastRef.current || now - typingLastRef.current > 2000) {
        typingLastRef.current = now;
        wsClient.send('typing', { conversation_id: activeConversationId });
      }
    }
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    const trigger = getMentionTrigger(nextValue, el.selectionStart);
    if (trigger) {
      setMentionStart(trigger.start);
      setMentionQuery(trigger.query);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
      setMentionStart(null);
      setMentionQuery('');
    }
  };

  const openMentionPicker = () => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const nextValue = `${before}@${after}`;
    setValue(nextValue);
    setMentionStart(cursor);
    setMentionQuery('');
    setMentionOpen(true);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor + 1, cursor + 1);
    });
  };

  const insertMention = (option: MentionOption) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const start = mentionStart ?? cursor;
    const marker = `<@${option.id}|${option.label}> `;
    const nextValue = `${value.slice(0, start)}${marker}${value.slice(cursor)}`;
    const nextCursor = start + marker.length;
    setValue(nextValue);
    setMentionOpen(false);
    setMentionStart(null);
    setMentionQuery('');
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    });
  };

  // ---------- 文件选择处理 ----------

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 重置 input 以便同一文件可重复选择
      e.target.value = '';

      // 大小校验
      if (file.size > MAX_FILE_SIZE) {
        alert(`文件大小不能超过 100MB（当前: ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      setUploadError('');

      try {
        const result = await uploadFile(file, (pct) => setUploadProgress(pct));

        // 根据文件类型确定消息类型和 content
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        // 消息 content 只存 file_id + API 端点路径，不存签名 URL
        // 浏览器加载时 <img src="/api/files/:id/url"> → 后端实时签名 → 永不过期
        const fileData: Record<string, unknown> = {
          file_id: result.fileId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          url: apiUrl(`/api/files/${result.fileId}/url`),
        };

        if (isVideo || isImage) {
          fileData.thumbnail_url = apiUrl(`/api/files/${result.fileId}/thumbnail`);
        }

        // 发送文件消息
        const msgType = isImage ? 'image' : isVideo ? 'video' : 'file';
        const content = JSON.stringify(fileData);
        sendMessage(content, undefined, undefined, msgType);
      } catch (err) {
        setUploadError('上传失败，请重试');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [sendMessage],
  );

  // ---------- 渲染 ----------

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-primary)',
        padding: 'var(--space-md) var(--space-lg)',
        flexShrink: 0,
      }}
    >
      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-sm)',
          position: 'relative',
        }}
      >
        <IconButton title="表情" size={32} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          😊
        </IconButton>
        {showEmojiPicker && (
          <EmojiPicker
            recentKey="input"
            onSelect={(emoji) => {
              const el = textareaRef.current;
              if (el) {
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const before = value.slice(0, start);
                const after = value.slice(end);
                const newValue = before + emoji + after;
                setValue(newValue);
                // 光标定位到插入内容之后
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = start + emoji.length;
                  el.focus();
                });
              }
              setShowEmojiPicker(false);
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
        <IconButton title="@提及" size={32} onClick={openMentionPicker}>
          @
        </IconButton>
        <IconButton
          title="发送图片/视频"
          size={32}
          onClick={() => imageInputRef.current?.click()}
        >
          🖼
        </IconButton>
        <IconButton
          title="发送文件"
          size={32}
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </IconButton>
      </div>

      {/* 隐藏的文件选择器 */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* 上传进度条 */}
      {uploading && (
        <div
          style={{
            marginBottom: 'var(--space-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            上传中 {uploadProgress}%
          </span>
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-hover)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${uploadProgress}%`,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-primary)',
                transition: 'width 0.15s',
              }}
            />
          </div>
        </div>
      )}

      {/* 上传错误 */}
      {uploadError && (
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--accent-red)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          {uploadError}
        </div>
      )}

      {/* 输入行 */}
      {visibleQuote && (
        <QuotePreview
          quoteId={visibleQuote.messageId}
          conversationId={visibleQuote.conversationId}
          mode="bar"
          onCancel={clearQuote}
        />
      )}

      {mentionIds.length > 0 && (
        <div style={mentionChipRowStyle}>
          {mentionIds.map((id) => (
            <span key={id} style={mentionChipStyle}>
              @{id === 'all' ? '所有人' : getMemberName(members, id)}
            </span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
        <MentionPicker
          open={mentionOpen}
          query={mentionQuery}
          members={members}
          allowAll={canMentionAll}
          onSelect={insertMention}
          onClose={() => setMentionOpen(false)}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
          rows={1}
          style={{
            flex: 1,
            minHeight: 40,
            maxHeight: 120,
            fontSize: 'var(--font-size-md)',
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'var(--font-family)',
            lineHeight: 1.5,
            padding: 'var(--space-sm) 0',
          }}
          onFocus={(e) => {
            e.target.style.outline = 'none';
          }}
        />

        <button
          onClick={handleSend}
          disabled={!value.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: value.trim() ? 'var(--accent-primary)' : 'var(--bg-hover)',
            color: value.trim() ? 'var(--white)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: value.trim() ? 'pointer' : 'default',
            flexShrink: 0,
            fontSize: 16,
            transition: 'background-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (value.trim())
              (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-secondary)';
          }}
          onMouseLeave={(e) => {
            if (value.trim())
              (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-primary)';
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

function getMentionTrigger(text: string, cursor: number): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/(^|\s)@([^\s@<>]*)$/);
  if (!match) return null;
  const start = before.lastIndexOf('@');
  return { start, query: match[2] ?? '' };
}

function parseMentionIds(text: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const regex = /<@(all|\d+)\|([^>]+)>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function getMemberName(members: GroupMember[], id: string): string {
  const member = members.find((m) => m.userId === id);
  return member?.nickname || member?.username || id;
}

const mentionChipRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--space-xs)',
  flexWrap: 'wrap',
  marginBottom: 'var(--space-sm)',
};

const mentionChipStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--bg-active)',
  color: 'var(--accent-link)',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  padding: '2px 6px',
};
