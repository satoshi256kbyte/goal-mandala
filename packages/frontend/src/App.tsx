import React from 'react';
import { AppRouter } from './router/AppRouter';
import './index.css';

/**
 * メインアプリケーションコンポーネント
 *
 * 機能:
 * - ルーティングの設定
 * - 認証プロバイダーの提供
 * - グローバルスタイルの適用
 *
 * 要件: 1.2, 2.2, 3.5
 */
const App: React.FC = () => {
  return <AppRouter />;
};

export default App;
