# 認証状態管理 トラブルシューティングガイド

## よくある問題と解決方法

### 1. 認証状態が同期されない

**症状**: 複数タブで認証状態が同期されない

**原因と解決方法**:

- LocalStorageが無効になっている → ブラウザ設定を確認
- StorageSyncが開始されていない → `storageSync.startSync()`を呼び出し
- 異なるドメインでアクセスしている → 同一ドメインでアクセス

```tsx
// 解決例
const storageSync = new StorageSync();
storageSync.startSync();
```

### 2. トークンが自動更新されない

**症状**: トークンの有効期限が切れても自動更新されない

**原因と解決方法**:

- TokenManagerが初期化されていない → 適切に初期化
- リフレッシュトークンが無効 → 再ログインが必要
- ネットワークエラー → 接続状況を確認

```tsx
// 解決例
const tokenManager = new TokenManager({
  autoRefresh: true,
  refreshBuffer: 300000, // 5分前にリフレッシュ
});
```

### 3. 認証状態監視が動作しない

**症状**: AuthStateMonitorProviderが監視を開始しない

**原因と解決方法**:

- `autoStart`がfalseになっている → trueに設定
- 初期状態が正しく設定されていない → 初期状態を確認
- エラーが発生している → コンソールログを確認

```tsx
// 解決例
<AuthStateMonitorProvider
  autoStart={true}
  debug={true}
  config={{
    checkInterval: 60000,
    maxRetryAttempts: 3
  }}
>
```

### 4. パフォーマンスが悪い

**症状**: 認証関連のコンポーネントが頻繁に再レンダリングされる

**原因と解決方法**:

- Context分割を使用していない → 最適化フックを使用
- メモ化が適用されていない → useMemo/useCallbackを使用
- 不要な依存関係がある → 依存配列を見直し

```tsx
// 解決例
// 悪い例
const { isAuthenticated, user, signOut } = useAuth();

// 良い例
const { isAuthenticated } = useAuthState();
const { user } = useAuthUser();
const { signOut } = useAuthActions();
```

### 5. セキュリティエラー

**症状**: トークンアクセスが拒否される

**原因と解決方法**:

- 不正なコンテキストからアクセス → 許可されたコンテキストから呼び出し
- 暗号化が失敗している → Web Crypto API対応ブラウザを使用
- XSS攻撃の可能性 → セキュリティ設定を確認

```tsx
// 解決例
if (authSecurity.validateTokenAccess('auth-service')) {
  const token = await authSecurity.decryptAndGetToken('access_token');
}
```

## デバッグ方法

### 1. デバッグモードの有効化

```tsx
<AuthStateMonitorProvider debug={true}>
  <App />
</AuthStateMonitorProvider>
```

### 2. ログレベルの設定

```tsx
const authSecurity = AuthSecurityService.getInstance({
  enableLogging: true,
  logLevel: 'debug',
});
```

### 3. 統計情報の確認

```tsx
const stats = useAuthMonitoringStats();
console.log('監視統計:', stats);

const securityStats = authSecurity.getSecurityStats();
console.log('セキュリティ統計:', securityStats);
```

## エラーコード一覧

| コード           | 説明                   | 対処方法                       |
| ---------------- | ---------------------- | ------------------------------ |
| TOKEN_MISSING    | トークンが見つからない | 再ログインが必要               |
| TOKEN_EXPIRED    | トークンが期限切れ     | 自動更新または再ログイン       |
| TOKEN_INVALID    | トークンが無効         | 再ログインが必要               |
| NETWORK_ERROR    | ネットワークエラー     | 接続状況を確認                 |
| SYNC_ERROR       | 同期エラー             | ブラウザ再起動または再ログイン |
| ENCRYPTION_ERROR | 暗号化エラー           | ブラウザ対応状況を確認         |
| VALIDATION_ERROR | 検証エラー             | 入力内容を確認                 |

## パフォーマンス最適化

### 1. 不要な再レンダリングを防ぐ

```tsx
// 悪い例: 全ての認証状態変更で再レンダリング
const MyComponent = () => {
  const auth = useAuth();
  return (
    <div>{auth.isAuthenticated ? 'ログイン済み' : 'ログインしてください'}</div>
  );
};

// 良い例: 認証状態のみを監視
const MyComponent = () => {
  const { isAuthenticated } = useAuthState();
  return <div>{isAuthenticated ? 'ログイン済み' : 'ログインしてください'}</div>;
};
```

### 2. メモ化の活用

```tsx
const MyComponent = () => {
  const { user } = useAuthUser();

  const userInfo = useMemo(() => {
    if (!user) return null;
    return {
      displayName: user.name || user.email,
      initials: user.name?.charAt(0) || user.email.charAt(0),
    };
  }, [user]);

  return userInfo ? <div>{userInfo.displayName}</div> : null;
};
```

### 3. 条件付きレンダリング

```tsx
const MyComponent = ({ showUserInfo }: { showUserInfo: boolean }) => {
  const authData = useConditionalAuth(showUserInfo);

  if (!showUserInfo) return <div>ゲストモード</div>;

  return authData.isAuthenticated ? (
    <div>ようこそ、{authData.user?.name}さん</div>
  ) : (
    <div>ログインしてください</div>
  );
};
```

## 緊急時の対応

### 1. 認証システム全体のリセット

```tsx
// 全ての認証データをクリア
localStorage.clear();
sessionStorage.clear();

// ページをリロード
window.location.reload();
```

### 2. セキュリティサービスの停止

```tsx
// セキュリティサービスを停止
authSecurity.stop();

// 新しいインスタンスを作成
const newAuthSecurity = AuthSecurityService.getInstance();
```

### 3. 監視サービスの再起動

```tsx
const { stopMonitoring, startMonitoring } = useAuthStateMonitorContext();

// 監視を停止
stopMonitoring();

// 少し待ってから再開
setTimeout(() => {
  startMonitoring();
}, 1000);
```
