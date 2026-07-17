import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // 對應 tsconfig.json 的 paths: { "@/*": ["./src/*"] }
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 只收 src 下的測試，避免掃到 scripts/ 與 .next/
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
