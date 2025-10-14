/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // バンドル分析プラグイン（ANALYZE=true時のみ有効）
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@goal-mandala/shared': '../shared/src',
    },
  },
  // テスト設定
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    // ユニットテストのみを実行（E2Eテストを除外）
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  build: {
    // バンドルサイズ最適化
    rollupOptions: {
      output: {
        manualChunks: {
          // React関連を別チャンクに分離
          react: ['react', 'react-dom'],
          // AWS Amplify関連を別チャンクに分離
          amplify: ['aws-amplify'],
          // フォーム関連を別チャンクに分離
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          // ルーティング関連を別チャンクに分離
          router: ['react-router-dom'],
        },
      },
    },
    // チャンクサイズ警告の閾値を設定
    chunkSizeWarningLimit: 1000,
    // ソースマップを本番環境では無効化
    sourcemap: process.env.NODE_ENV === 'development',
    // 最小化設定
    minify: 'terser',
    terserOptions: {
      compress: {
        // console.logを本番環境では削除
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
  },
  // 開発サーバー設定
  server: {
    port: 3000,
    open: true,
  },
  // プレビューサーバー設定
  preview: {
    port: 3000,
  },
});
