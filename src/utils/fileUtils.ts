/* ============================================
   纸条 PaperNote — 文件工具函数
   文件图标映射、大小格式化、时长格式化
   ============================================ */

/** 根据 MIME 类型返回文件图标 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z'))
    return '📦';
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('msword')
  )
    return '📝';
  if (
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet')
  )
    return '📊';
  if (
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation')
  )
    return '📽';
  return '📎';
}

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** 格式化视频/音频时长（秒 → m:ss） */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 最大上传文件大小（100MB） */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// ---------- API 路径前缀 ----------
// 桌面端构建时注入 VITE_API_BASE，Web 端保持相对路径

/**
 * 为 API 路径自动添加 baseURL 前缀（桌面端需要，Web 端保持相对路径）
 * 已是绝对 URL（http/wss:// 开头）则直接返回，避免重复拼接
 * 用法: apiUrl('/api/files/123/url') → 'https://qingliu.tech/api/files/123/url' 或 '/api/files/123/url'
 */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE || '';
  if (!base || /^https?:\/\//i.test(path)) return path;
  return `${base}${path}`;
}
