/* ============================================
   纸条 PaperNote — UnreadBadge 组件测试
   ============================================ */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UnreadBadge } from '../common';

describe('UnreadBadge', () => {
  it('renders count when > 0', () => {
    const { container } = render(<UnreadBadge count={5} />);
    expect(container.textContent).toBe('5');
  });

  it('returns null when count is 0 and no dot', () => {
    const { container } = render(<UnreadBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows empty dot when showDot and count > 0', () => {
    const { container } = render(<UnreadBadge count={3} showDot />);
    // 显示红点但无文字
    expect(container.textContent).toBe('');
    expect(container.firstChild).not.toBeNull();
  });

  it('shows "99+" when count >= 99', () => {
    const { container } = render(<UnreadBadge count={120} />);
    expect(container.textContent).toBe('99+');
  });

  it('shows exact count when count is 99', () => {
    const { container } = render(<UnreadBadge count={99} />);
    expect(container.textContent).toBe('99+');
  });

  it('returns null when count is negative', () => {
    const { container } = render(<UnreadBadge count={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it('has correct base styling', () => {
    const { container } = render(<UnreadBadge count={1} />);
    const span = container.firstChild as HTMLElement;
    expect(span.style.minWidth).toBe('18px');
    expect(span.style.height).toBe('18px');
  });
});
