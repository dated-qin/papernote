/* ============================================
   纸条 PaperNote — 全屏媒体查看器
   图片缩放/拖拽 + 键盘导航 + 视频播放 + 下载
   ============================================ */

import React, { useState, useEffect, useCallback } from 'react';

export interface LightboxItem {
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  name?: string;
}

interface LightboxProps {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ items, index, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(index);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posStart, setPosStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const item = items[currentIndex];
  const isImage = item?.type === 'image';
  const hasMultiple = items.length > 1;

  // 重置缩放和位置
  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
  }, []);

  // 切换图片
  const goTo = useCallback(
    (dir: 1 | -1) => {
      setCurrentIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return items.length - 1;
        if (next >= items.length) return 0;
        return next;
      });
      resetView();
    },
    [items.length, resetView],
  );

  // 键盘事件
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasMultiple) goTo(-1);
          break;
        case 'ArrowRight':
          if (hasMultiple) goTo(1);
          break;
        case '+':
        case '=':
          setScale((s) => Math.min(s + 0.25, 5));
          break;
        case '-':
          setScale((s) => Math.max(s - 0.25, 0.25));
          break;
        case '0':
          resetView();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, hasMultiple, goTo, resetView]);

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.25, Math.min(5, s + delta)));
  };

  // 拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPosStart({ x: position.x, y: position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPosition({ x: posStart.x + dx, y: posStart.y + dy });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  // 切换图片时预加载相邻图片
  useEffect(() => {
    if (!hasMultiple) return;
    const preload = (src: string) => {
      const img = new Image();
      img.src = src;
    };
    if (currentIndex > 0) {
      const prev = items[currentIndex - 1];
      if (prev?.type === 'image') preload(prev.url);
    }
    if (currentIndex < items.length - 1) {
      const next = items[currentIndex + 1];
      if (next?.type === 'image') preload(next.url);
    }
    // 阻止 body 滚动
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [currentIndex, items, hasMultiple]);

  if (!item) return null;

  return (
    <div style={overlayStyle} onClick={scale === 1 ? onClose : undefined}>
      {/* 顶部工具栏 */}
      <div style={toolbarStyle}>
        <span style={counterStyle}>
          {currentIndex + 1} / {items.length}
          {item.name ? ` — ${item.name}` : ''}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isImage && (
            <>
              <ToolBtn title="缩小" onClick={() => setScale((s) => Math.max(s - 0.25, 0.25))}>
                −
              </ToolBtn>
              <ToolBtn title="实际大小" onClick={resetView}>
                1:1
              </ToolBtn>
              <ToolBtn title="放大" onClick={() => setScale((s) => Math.min(s + 0.25, 5))}>
                +
              </ToolBtn>
            </>
          )}
          <ToolBtn
            title="下载"
            onClick={() => {
              const a = document.createElement('a');
              a.href = item.url;
              a.download = item.name || '';
              a.click();
            }}
          >
            ⬇
          </ToolBtn>
          <ToolBtn title="关闭 (ESC)" onClick={onClose}>
            ✕
          </ToolBtn>
        </div>
      </div>

      {/* 内容区 */}
      <div
        style={contentAreaStyle}
        onClick={(e) => e.stopPropagation()}
        onWheel={isImage ? handleWheel : undefined}
        onMouseDown={isImage ? handleMouseDown : undefined}
        onMouseMove={isImage ? handleMouseMove : undefined}
        onMouseUp={isImage ? handleMouseUp : undefined}
        onMouseLeave={isImage ? handleMouseUp : undefined}
      >
        {isImage ? (
          <img
            src={item.url}
            alt={item.name || '图片'}
            draggable={false}
            onLoad={() => setImageLoaded(true)}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              maxWidth: '90vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
              transition: imageLoaded ? 'transform 0.1s ease-out' : 'none',
              borderRadius: 4,
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              borderRadius: 4,
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          />
        )}
      </div>

      {/* 左右箭头 */}
      {hasMultiple && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(-1);
            }}
            style={{ ...arrowStyle, left: 16 }}
            title="上一张 (←)"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(1);
            }}
            style={{ ...arrowStyle, right: 16 }}
            title="下一张 (→)"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
};

// ============ 辅助组件 ============

const ToolBtn: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({
  title,
  onClick,
  children,
}) => (
  <button
    title={title}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={toolBtnStyle}
  >
    {children}
  </button>
);

// ============ 样式 ============

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  backgroundColor: 'rgba(0, 0, 0, 0.92)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const toolbarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  zIndex: 10,
  background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
};

const counterStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: 14,
  opacity: 0.85,
};

const toolBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  backgroundColor: 'rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: 18,
  borderRadius: 6,
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
};

const contentAreaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
};

const arrowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 48,
  height: 72,
  border: 'none',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 36,
  cursor: 'pointer',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
};
