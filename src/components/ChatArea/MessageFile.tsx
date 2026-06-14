/* ============================================
   纸条 PaperNote — 文件消息渲染组件
   MessageImage / MessageVideo / MessageFile / ImagePreview
   ============================================ */

import React, { useState, useEffect, useCallback } from 'react';
import http from '../../utils/http';
import { getFileIcon, formatFileSize, formatDuration } from '../../utils/fileUtils';

// ---------- 文件内容解析类型 ----------

interface ImageContent {
  file_id: string;
  url: string;
  thumbnail_url?: string;
  width: number;
  height: number;
}

interface VideoContent {
  file_id: string;
  url: string;
  thumbnail_url?: string;
  width: number;
  height: number;
  duration?: number;
}

interface FileContent {
  file_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

/** 从消息 content 解析 JSON 文件元数据 */
function parseContent<T = Record<string, unknown>>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// ===================== 图片消息 =====================

interface MessageImageProps {
  content: string;
}

export const MessageImage: React.FC<MessageImageProps> = ({ content }) => {
  const data = parseContent<ImageContent>(content);
  const [expanded, setExpanded] = useState(false);

  if (!data) return <span style={{ color: 'var(--text-muted)' }}>[图片加载失败]</span>;

  const src = data.thumbnail_url || data.url;
  const previewStyle: React.CSSProperties = expanded
    ? { maxWidth: '90vw', maxHeight: '60vh', objectFit: 'contain' as const }
    : { maxWidth: 320, maxHeight: 240, objectFit: 'cover' as const };

  return (
    <>
      <img
        src={src}
        alt="图片消息"
        style={{
          ...previewStyle,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          display: 'block',
        }}
        onClick={() => setExpanded(!expanded)}
      />
      {expanded && (
        <ImagePreview src={data.url} onClose={() => setExpanded(false)} />
      )}
    </>
  );
};

// ===================== 视频消息 =====================

interface MessageVideoProps {
  content: string;
}

export const MessageVideo: React.FC<MessageVideoProps> = ({ content }) => {
  const data = parseContent<VideoContent>(content);

  if (!data) return <span style={{ color: 'var(--text-muted)' }}>[视频加载失败]</span>;

  return (
    <div
      style={{ position: 'relative', maxWidth: 320, cursor: 'pointer' }}
      onClick={() => {
        if (data.url) window.open(data.url, '_blank');
      }}
    >
      <img
        src={data.thumbnail_url || data.url}
        style={{
          width: '100%',
          borderRadius: 'var(--radius-sm)',
          maxHeight: 240,
          objectFit: 'cover',
          display: 'block',
        }}
        alt="视频封面"
      />
      {/* 播放按钮 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 20,
          pointerEvents: 'none',
        }}
      >
        ▶
      </div>
      {/* 时长标签 */}
      {data.duration !== undefined && data.duration > 0 && (
        <span
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: 'var(--font-size-xs)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {formatDuration(data.duration)}
        </span>
      )}
    </div>
  );
};

// ===================== 文件消息卡片 =====================

interface MessageFileCardProps {
  content: string;
}

export const MessageFileCard: React.FC<MessageFileCardProps> = ({ content }) => {
  const data = parseContent<FileContent>(content);

  if (!data) return <span style={{ color: 'var(--text-muted)' }}>[文件加载失败]</span>;

  const handleDownload = () => {
    // 通过 API 获取签名 URL 后下载
    http
      .get<{ url: string }>(`/api/files/${data.file_id}/url`)
      .then((res) => {
        if (res.code === 0 && res.data.url) {
          window.open(res.data.url, '_blank');
        }
      })
      .catch(() => {
        alert('获取下载链接失败');
      });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-sm)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        maxWidth: 280,
      }}
    >
      {/* 文件类型图标 */}
      <span style={{ fontSize: 28, flexShrink: 0 }}>
        {getFileIcon(data.mime_type)}
      </span>

      {/* 文件名 + 大小 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={data.file_name}
        >
          {data.file_name}
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          {formatFileSize(data.file_size)}
        </div>
      </div>

      {/* 下载按钮 */}
      <button
        onClick={handleDownload}
        title="下载"
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--accent-link)',
          fontSize: 'var(--font-size-md)',
          flexShrink: 0,
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
        }}
      >
        ⬇
      </button>
    </div>
  );
};

// ===================== 图片全屏预览遮罩 =====================

interface ImagePreviewProps {
  src: string;
  onClose: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ src, onClose }) => {
  // Esc 键关闭
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      <img
        src={src}
        alt="预览"
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {/* 关闭提示 */}
      <span
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          pointerEvents: 'none',
        }}
      >
        Esc 或点击关闭
      </span>
    </div>
  );
};

// ===================== 消息内容路由 =====================

interface MessageContentRouterProps {
  type: string;
  content: string;
}

/** 根据 msg_type 选择渲染组件 */
export const MessageContentRouter: React.FC<MessageContentRouterProps> = ({
  type,
  content,
}) => {
  switch (type) {
    case 'image':
      return <MessageImage content={content} />;
    case 'video':
      return <MessageVideo content={content} />;
    case 'file':
      return <MessageFileCard content={content} />;
    case 'text':
    case 'system':
    default:
      return (
        <p
          style={{
            fontSize: 'var(--font-size-md)',
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}
        >
          {content}
        </p>
      );
  }
};
