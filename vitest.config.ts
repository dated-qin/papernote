/* ============================================
   纸条 PaperNote — Vitest 测试配置
   ============================================ */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/mocks/setup.ts'],
    css: false,
    env: {
      VITE_API_BASE: 'https://api.papernote.local',
    },
  },
});
