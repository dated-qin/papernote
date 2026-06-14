/* ============================================
   纸条 PaperNote — fileUtils 单元测试
   ============================================ */

import { describe, it, expect } from 'vitest';
import { formatFileSize, formatDuration, getFileIcon } from '../fileUtils';

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats KB with 1 decimal', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('formats MB', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('formats GB', () => {
    const gb = 3.2 * 1024 * 1024 * 1024;
    expect(formatFileSize(gb)).toBe('3.2 GB');
  });

  it('rounds to 1 decimal place', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('formatDuration', () => {
  it('formats seconds to m:ss', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(5)).toBe('0:05');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats minutes correctly', () => {
    expect(formatDuration(125)).toBe('2:05');
  });
});

describe('getFileIcon', () => {
  it('returns image icon for image/*', () => {
    expect(getFileIcon('image/png')).toBe('🖼');
    expect(getFileIcon('image/jpeg')).toBe('🖼');
  });

  it('returns video icon for video/*', () => {
    expect(getFileIcon('video/mp4')).toBe('🎬');
  });

  it('returns audio icon for audio/*', () => {
    expect(getFileIcon('audio/mp3')).toBe('🎵');
  });

  it('returns PDF icon', () => {
    expect(getFileIcon('application/pdf')).toBe('📄');
  });

  it('returns archive icon for zip', () => {
    expect(getFileIcon('application/zip')).toBe('📦');
  });

  it('returns default icon for unknown types', () => {
    expect(getFileIcon('application/octet-stream')).toBe('📎');
  });
});
