# 認証状態管理 API ドキュメント

## 概要

認証状態管理システムは、React Contextベースの認証状態管理、トークンの永続化、自動ログアウト、複数タブ同期機能を提供します。

## 主要コンポーネント

### AuthProvider

認証状態をアプリケーション全体で共有するプロバイダー。

```tsx
import { AuthProvider } from '@/components/auth/AuthProvider';

<AuthProvider>
  <App />
</AuthProvider>;
```

### AuthStateMonitorProvider

認証状態の監視と自動管理を行うプロバイダー。

```tsx
import { AuthStateMonitorProvider } from '@/components/auth/AuthStateMonitorProvider';

<AuthStateMonitorProvider autoStart={true} debug={true}>
  <App />
</AuthStateMonitorProvider>;
```

## フック

### useAuth

基本的な認証機能を提供するフック。

```tsx
const {
  isAuthenticated,
  isLoading,
  user,
  error,
  signIn,
  signOut,
  signUp,
  resetPassword,
} = useAuth();
```

### useAuthOptimized

パフォーマンス最適化された認証フック。

```tsx
// 認証状態のみ
const { isAuthenticated, isLoading, error } = useAuthState();

// ユーザー情報のみ
const { user } = useAuthUser();

// 認証アクションのみ
const { signIn, signOut } = useAuthActions();
```

### useAuthStateMonitorContext

認証状態監視の詳細情報を取得するフック。

```tsx
const { isMonitoring, listenerCount, errorHistory, monitoringStats } =
  useAuthStateMonitorContext();
```

## サービス

### TokenManager

JWTトークンの管理を行うサービス。

```tsx
import { TokenManager } from '@/services/tokenManager';

const tokenManager = new TokenManager();
await tokenManager.saveToken('access_token', token);
const token = await tokenManager.getToken('access_token');
```

### StorageSync

複数タブ間での認証状態同期を行うサービス。

```tsx
import { StorageSync } from '@/services/storage-sync';

const storageSync = new StorageSync();
storageSync.startSync();
```

### AuthSecurityService

認証セキュリティ強化機能を提供するサービス。

```tsx
import { authSecurity } from '@/services/auth-security';

await authSecurity.encryptAndStoreToken('key', 'token');
const token = await authSecurity.decryptAndGetToken('key');
```

## 設定

### 環境別設定

```tsx
import { getAuthConfig } from '@/config/auth-config';

const config = getAuthConfig();
```

### 監視設定

```tsx
const monitorConfig = {
  checkInterval: 60000, // 監視間隔（ミリ秒）
  tokenRefreshBuffer: 300000, // トークンリフレッシュバッファ（ミリ秒）
  inactivityTimeout: 1800000, // 非アクティブタイムアウト（ミリ秒）
  maxRetryAttempts: 3, // 最大リトライ回数
  retryDelay: 1000, // リトライ遅延（ミリ秒）
};
```

## エラーハンドリング

### エラー種別

- `TOKEN_MISSING`: トークンが見つからない
- `TOKEN_EXPIRED`: トークンが期限切れ
- `TOKEN_INVALID`: トークンが無効
- `NETWORK_ERROR`: ネットワークエラー
- `SYNC_ERROR`: 同期エラー

### エラー処理例

```tsx
const { error, clearError } = useAuth();

useEffect(() => {
  if (error) {
    console.error('認証エラー:', error.message);
    // エラー処理ロジック
    clearError();
  }
}, [error, clearError]);
```

## セキュリティ

### トークン暗号化

Web Crypto APIを使用してトークンを暗号化して保存。

### アクセス制限

XSS攻撃を防ぐため、トークンアクセスを制限。

### ログサニタイズ

機密情報を自動的にマスクしてログ出力。

## パフォーマンス最適化

### Context分割

認証状態、ユーザー情報、アクションを分離してレンダリング最適化。

### メモ化

不要な再レンダリングを防ぐためのメモ化機能。

### キャッシュ

トークン検証結果をキャッシュして性能向上。
