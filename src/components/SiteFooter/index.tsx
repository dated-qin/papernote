/* ============================================
   纸条 PaperNote — 网站备案信息页脚
   ============================================ */

import React from 'react';

export const SiteFooter: React.FC = () => {
  return (
    <footer
      style={{
        height: 22,
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-muted)',
        fontSize: 'var(--font-size-xs)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '0 var(--space-md)',
        borderTop: '1px solid var(--border-default)',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <a
        href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=42282602000153"
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--text-muted)',
          textDecoration: 'none',
        }}
      >
        <img
          src="/images/beian.png"
          width={16}
          height={16}
          alt=""
          style={{ display: 'block' }}
        />
        鄂公网安备 42282602000153号
      </a>
      <span>|</span>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noreferrer"
        style={{
          color: 'var(--text-muted)',
          textDecoration: 'none',
        }}
      >
        鄂ICP备2026013971号-1
      </a>
    </footer>
  );
};
