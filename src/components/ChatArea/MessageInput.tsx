/* ============================================
   纸条 PaperNote — 消息输入区
   工具栏（表情/@/图片/文件）+ TextEditor + SendButton + 文件上传
   ============================================ */

import React, { useState, useRef, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { IconButton } from '../common';
import { uploadFile } from '../../utils/upload';
import { MAX_FILE_SIZE } from '../../utils/fileUtils';

export const MessageInput: React.FC = () => {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上传状态
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
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
        const fileId = await uploadFile(file, (pct) => setUploadProgress(pct));

        // 根据文件类型确定消息类型和 content
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        const fileData: Record<string, unknown> = {
          file_id: fileId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        };

        if (isImage || isVideo) {
          // 图片/视频：解析尺寸
          fileData.url = `/api/files/${fileId}/url`;
          if (isVideo) fileData.thumbnail_url = `/api/files/${fileId}/thumbnail`;
          else fileData.thumbnail_url = fileData.url;
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
        }}
      >
        <IconButton title="表情" size={32}>
          😊
        </IconButton>
        <IconButton title="@提及" size={32}>
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
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
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
