# ProtectedRoute コンポーネント使用ガイド

## 概要

`ProtectedRoute`コンポーネントは、認証が必要なページへのアクセスを制御するためのコンポーネントです。認証状態、プロフィール完了状態をチェックし、適切なリダイレクトやフォールバック表示を行います。

## 基本的な使用方法

### 1. 基本的な保護されたルート

```tsx
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### 2. カスタムリダイレクト先を指定

```tsx
<ProtectedRoute redirectTo="/custom-login">
  <AdminPanel />
</ProtectedRoute>
```

### 3. プロフィール完了チェック付き

```tsx
<ProtectedRoute requiresProfile={true}>
  <MainApplication />
</ProtectedRoute>
```

### 4. カスタムローディング表示

```tsx
const CustomLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-lg">アプリケーションを読み込み中...</div>
  </div>
);

<ProtectedRoute fallback={<CustomLoader />}>
  <ExpensiveComponent />
</ProtectedRoute>;
```

### 5. 未認証時のコールバック処理

```tsx
const handleUnauthorized = () => {
  // アナリティクスイベントを送信
  analytics.track('unauthorized_access_attempt', {
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
  });

  // ユーザーに通知を表示
  toast.warning('ログインが必要です');
};

<ProtectedRoute onUnauthorized={handleUnauthorized}>
  <PremiumFeature />
</ProtectedRoute>;
```

## プロパティ

| プロパティ        | 型                | デフォルト値 | 説明                                       |
| ----------------- | ----------------- | ------------ | ------------------------------------------ |
| `children`        | `React.ReactNode` | -            | 保護されたコンテンツ                       |
| `redirectTo`      | `string`          | `'/login'`   | 未認証時のリダイレクト先                   |
| `requiresProfile` | `boolean`         | `false`      | プロフィール完了チェックを行うかどうか     |
| `fallback`        | `React.ReactNode` | -            | ローディング中に表示するカスタムコンテンツ |
| `onUnauthorized`  | `() => void`      | -            | 未認証時に実行されるコールバック           |

## 動作フロー

```mermaid
flowchart TD
    A[ProtectedRoute] --> B{ローディング中?}
    B -->|Yes| C[fallback または デフォルトローダー表示]
    B -->|No| D{認証済み?}
    D -->|No| E[onUnauthorized実行]
    E --> F[redirectToにリダイレクト]
    D -->|Yes| G{requiresProfile=true?}
    G -->|No| H[子コンポーネント表示]
    G -->|Yes| I{プロフィール完了?}
    I -->|Yes| H
    I -->|No| J[/profile/setupにリダイレクト]
```

## 実装例

### ダッシュボードページの保護

```tsx
// pages/DashboardPage.tsx
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { Dashboard } from '../components/Dashboard';

export const DashboardPage = () => {
  return (
    <ProtectedRoute requiresProfile={true}>
      <Dashboard />
    </ProtectedRoute>
  );
};
```

### 管理者ページの保護（カスタムチェック付き）

```tsx
// pages/AdminPage.tsx
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuthContext } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export const AdminPage = () => {
  const { user } = useAuthContext();

  // 管理者権限チェック
  const isAdmin = user && 'role' in user && user.role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <ProtectedRoute requiresProfile={true}>
      <AdminPanel />
    </ProtectedRoute>
  );
};
```

### プレミアム機能の保護

```tsx
// components/PremiumFeature.tsx
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuthContext } from '../hooks/useAuth';

export const PremiumFeature = () => {
  const { user } = useAuthContext();

  const handleUnauthorized = () => {
    // プレミアム機能へのアクセス試行をトラッキング
    analytics.track('premium_feature_access_attempt');
  };

  return (
    <ProtectedRoute requiresProfile={true} onUnauthorized={handleUnauthorized}>
      <div className="premium-content">{/* プレミアム機能のコンテンツ */}</div>
    </ProtectedRoute>
  );
};
```

## ベストプラクティス

### 1. 適切なローディング表示

```tsx
const AppLoader = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    role="status"
    aria-label="アプリケーション読み込み中"
  >
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      <p className="mt-4 text-gray-600">読み込み中...</p>
    </div>
  </div>
);

<ProtectedRoute fallback={<AppLoader />}>
  <HeavyComponent />
</ProtectedRoute>;
```

### 2. エラーハンドリング

```tsx
const handleUnauthorized = () => {
  try {
    // アナリティクス送信
    analytics.track('unauthorized_access');

    // ユーザー通知
    toast.info('ログインしてください');
  } catch (error) {
    console.error('未認証時処理でエラー:', error);
  }
};
```

### 3. プロフィール完了チェックの使い分け

```tsx
// プロフィール必須のページ
<ProtectedRoute requiresProfile={true}>
  <MainApp />
</ProtectedRoute>

// プロフィール不要のページ（設定画面など）
<ProtectedRoute requiresProfile={false}>
  <SettingsPage />
</ProtectedRoute>
```

## 注意事項

1. **プロフィール完了チェック**: `requiresProfile={true}`の場合、ユーザーオブジェクトの`profileComplete`プロパティをチェックします。このプロパティが`false`の場合、`/profile/setup`にリダイレクトされます。

2. **コールバックエラー**: `onUnauthorized`コールバック内でエラーが発生してもアプリケーションはクラッシュしません。エラーはコンソールに出力されます。

3. **リダイレクト状態**: リダイレクト時には現在のロケーション情報が`state.from`として渡されるため、ログイン後に元のページに戻ることができます。

4. **パフォーマンス**: `fallback`プロパティを使用することで、重いコンポーネントのローディング中により良いUXを提供できます。

## トラブルシューティング

### よくある問題

1. **無限リダイレクト**: `redirectTo`で指定したページも`ProtectedRoute`で保護されている場合に発生します。ログインページは保護しないでください。

2. **プロフィール設定ループ**: プロフィール設定ページ自体を`requiresProfile={true}`で保護すると無限ループが発生します。

3. **型エラー**: ユーザーオブジェクトの型が期待と異なる場合、プロフィール完了チェックが正しく動作しない可能性があります。

### デバッグ方法

```tsx
// デバッグ用のProtectedRoute
const DebugProtectedRoute = props => {
  const { isAuthenticated, isLoading, user } = useAuthContext();

  console.log('ProtectedRoute Debug:', {
    isAuthenticated,
    isLoading,
    user,
    requiresProfile: props.requiresProfile,
  });

  return <ProtectedRoute {...props} />;
};
```
