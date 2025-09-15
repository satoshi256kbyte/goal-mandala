# PublicRoute コンポーネント使用ガイド

## 概要

`PublicRoute`コンポーネントは、認証済みユーザーのアクセス制御を行うコンポーネントです。主にログイン画面やサインアップ画面など、認証済みユーザーがアクセスする必要のないページで使用します。

## 基本的な使用方法

### 1. 通常のパブリックページ

認証状態に関係なくアクセス可能なページ：

```tsx
import { PublicRoute } from '../components/auth/PublicRoute';
import { HomePage } from '../pages/HomePage';

function App() {
  return (
    <PublicRoute>
      <HomePage />
    </PublicRoute>
  );
}
```

### 2. ログイン画面（認証済みユーザーをリダイレクト）

認証済みユーザーがアクセスした場合にダッシュボードにリダイレクト：

```tsx
import { PublicRoute } from '../components/auth/PublicRoute';
import { LoginPage } from '../pages/LoginPage';

function App() {
  return (
    <PublicRoute redirectIfAuthenticated={true} redirectTo="/dashboard">
      <LoginPage />
    </PublicRoute>
  );
}
```

### 3. サインアップ画面

認証済みユーザーがアクセスした場合にホーム画面にリダイレクト：

```tsx
import { PublicRoute } from '../components/auth/PublicRoute';
import { SignupPage } from '../pages/SignupPage';

function App() {
  return (
    <PublicRoute redirectIfAuthenticated={true} redirectTo="/">
      <SignupPage />
    </PublicRoute>
  );
}
```

## プロパティ

| プロパティ                | 型                | デフォルト値 | 説明                                       |
| ------------------------- | ----------------- | ------------ | ------------------------------------------ |
| `children`                | `React.ReactNode` | -            | 表示するコンポーネント                     |
| `redirectTo`              | `string`          | `'/'`        | 認証済みユーザーのリダイレクト先           |
| `redirectIfAuthenticated` | `boolean`         | `false`      | 認証済みユーザーをリダイレクトするかどうか |

## 動作パターン

### パターン1: 通常のパブリックページ

```tsx
<PublicRoute>
  <HomePage />
</PublicRoute>
```

- 未認証ユーザー: `HomePage`を表示
- 認証済みユーザー: `HomePage`を表示
- ローディング中: スピナーを表示

### パターン2: 認証済みユーザーをリダイレクト

```tsx
<PublicRoute redirectIfAuthenticated={true} redirectTo="/dashboard">
  <LoginPage />
</PublicRoute>
```

- 未認証ユーザー: `LoginPage`を表示
- 認証済みユーザー: `/dashboard`にリダイレクト
- ローディング中: スピナーを表示

## React Router との統合

### App Router での使用例

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicRoute } from '../components/auth/PublicRoute';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* パブリックページ */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <HomePage />
            </PublicRoute>
          }
        />

        {/* ログイン画面（認証済みユーザーはダッシュボードにリダイレクト） */}
        <Route
          path="/login"
          element={
            <PublicRoute redirectIfAuthenticated={true} redirectTo="/dashboard">
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* サインアップ画面（認証済みユーザーはホームにリダイレクト） */}
        <Route
          path="/signup"
          element={
            <PublicRoute redirectIfAuthenticated={true} redirectTo="/">
              <SignupPage />
            </PublicRoute>
          }
        />

        {/* 保護されたページ */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

## リダイレクト動作の詳細

### location.state からのリダイレクト

ユーザーが保護されたページにアクセスしようとしてログイン画面にリダイレクトされた場合、ログイン後に元のページに戻ります：

```tsx
// ユーザーが /profile にアクセス
// ↓ 未認証のため /login にリダイレクト（location.state に from: { pathname: '/profile' } が保存される）
// ↓ ログイン成功
// ↓ PublicRoute が location.state.from.pathname を検出
// ↓ /profile にリダイレクト
```

### デフォルトリダイレクト

location.state に情報がない場合は、`redirectTo` プロパティで指定されたパスにリダイレクトします。

## 要件との対応

このコンポーネントは以下の要件を満たします：

- **要件 3.3**: 認証済みユーザーがログイン画面にアクセスした時にダッシュボードまたはホーム画面にリダイレクトされる

## 注意事項

1. **AuthProvider の配置**: `PublicRoute` は `AuthProvider` の子コンポーネントとして配置する必要があります
2. **Router の配置**: React Router の `BrowserRouter` または `MemoryRouter` の子コンポーネントとして配置する必要があります
3. **パフォーマンス**: 認証状態の確認は非同期で行われるため、ローディング状態が表示されます

## トラブルシューティング

### よくある問題

1. **useAuthContext エラー**
   - 原因: `AuthProvider` が配置されていない
   - 解決: コンポーネントツリーの上位に `AuthProvider` を配置

2. **useLocation エラー**
   - 原因: React Router の `Router` が配置されていない
   - 解決: コンポーネントツリーの上位に `BrowserRouter` などを配置

3. **無限リダイレクト**
   - 原因: リダイレクト先が同じページになっている
   - 解決: `redirectTo` プロパティを適切なパスに設定
