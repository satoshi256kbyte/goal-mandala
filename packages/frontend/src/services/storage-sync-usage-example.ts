/**
 * StorageSync使用例
 *
 * このファイルは、StorageSyncクラスの使用方法を示すサンプルコードです。
 */

import { StorageSync, AuthState } from './storage-sync';

// 基本的な使用例
export function basicUsageExample() {
  // StorageSyncインスタンスを作成
  const storageSync = new StorageSync({
    storageKey: 'my_app_auth_sync',
    syncInterval: 2000, // 2秒間隔
    maxRetries: 5,
  });

  // 認証状態変更リスナーを登録
  storageSync.onAuthStateChange(authState => {
    if (authState) {
      console.log('他のタブでログインが検出されました:', authState.user);
      // ログイン状態の処理
      updateUIForLogin(authState);
    } else {
      console.log('他のタブでログアウトが検出されました');
      // ログアウト状態の処理
      updateUIForLogout();
    }
  });

  // ストレージ変更リスナーを登録
  storageSync.onStorageChange(event => {
    console.log('ストレージ変更:', event.key, event.newValue);
  });

  // 同期機能を開始
  storageSync.startSync();

  // ログイン時の処理
  function handleLogin(user: User) {
    const authState: AuthState = {
      isAuthenticated: true,
      user,
      sessionId: generateSessionId(),
      lastActivity: new Date(),
    };

    // 他のタブに認証状態変更をブロードキャスト
    storageSync.broadcastAuthStateChange(authState);
  }

  // ログアウト時の処理
  function handleLogout() {
    // 他のタブにログアウトをブロードキャスト
    storageSync.broadcastAuthStateChange(null);
  }

  // クリーンアップ
  function cleanup() {
    storageSync.destroy();
  }

  return {
    handleLogin,
    handleLogout,
    cleanup,
  };
}

// React Contextとの統合例
export function reactContextIntegrationExample() {
  const storageSync = new StorageSync();

  // React Contextの状態更新関数
  let setAuthState: (state: AuthState | null) => void;

  // 認証状態変更リスナー
  storageSync.onAuthStateChange(authState => {
    if (setAuthState) {
      setAuthState(authState);
    }
  });

  // React Contextから呼び出される初期化関数
  function initializeSync(setStateFn: (state: AuthState | null) => void) {
    setAuthState = setStateFn;
    storageSync.startSync();
  }

  // React Contextから呼び出されるクリーンアップ関数
  function cleanupSync() {
    storageSync.destroy();
  }

  return {
    storageSync,
    initializeSync,
    cleanupSync,
  };
}

// エラーハンドリングの例
export function errorHandlingExample() {
  const storageSync = new StorageSync({
    maxRetries: 3,
  });

  // エラー監視用のリスナー
  storageSync.onAuthStateChange(authState => {
    try {
      if (authState === null) {
        // ログアウト処理
        handleForceLogout();
      } else {
        // ログイン処理
        handleForceLogin(authState);
      }
    } catch (error) {
      console.error('認証状態変更処理エラー:', error);
      // エラー時の安全な処理
      handleAuthError(error);
    }
  });

  function handleForceLogout() {
    // 強制ログアウト処理
    localStorage.clear();
    window.location.href = '/login';
  }

  function handleForceLogin(authState: AuthState) {
    // 強制ログイン処理
    console.log('他のタブでのログインを検出:', authState.user);
    // 必要に応じてページリロードや状態更新
  }

  function handleAuthError(error: unknown) {
    // エラー時の安全な処理
    console.error('認証エラー:', error);
    // 必要に応じてエラー報告やフォールバック処理
  }

  storageSync.startSync();

  return storageSync;
}

// 複数インスタンスの管理例
export function multipleInstanceExample() {
  // メイン認証用
  const mainAuthSync = new StorageSync({
    storageKey: 'main_auth_sync',
  });

  // 管理者認証用
  const adminAuthSync = new StorageSync({
    storageKey: 'admin_auth_sync',
  });

  // それぞれ異なるリスナーを設定
  mainAuthSync.onAuthStateChange(authState => {
    console.log('メイン認証状態変更:', authState);
  });

  adminAuthSync.onAuthStateChange(authState => {
    console.log('管理者認証状態変更:', authState);
  });

  // 両方の同期を開始
  mainAuthSync.startSync();
  adminAuthSync.startSync();

  return {
    mainAuthSync,
    adminAuthSync,
    cleanup: () => {
      mainAuthSync.destroy();
      adminAuthSync.destroy();
    },
  };
}

// ユーティリティ関数
function updateUIForLogin(authState: AuthState) {
  // ログイン状態のUI更新
  console.log('ログイン状態のUI更新:', authState.user);
}

function updateUIForLogout() {
  // ログアウト状態のUI更新
  console.log('ログアウト状態のUI更新');
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
