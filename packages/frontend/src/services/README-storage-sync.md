# StorageSync - 複数タブ間認証状態同期

StorageSyncクラスは、ブラウザの複数タブ間で認証状態を同期するための機能を提供します。

## 概要

このクラスは以下の要件を満たします：

- **要件 6.1**: 他のデバイスでログアウトした時に現在のデバイスでも認証状態が無効化される
- **要件 6.2**: 認証トークンが他の場所で無効化された時に現在のセッションも無効化される
- **要件 6.3**: ブラウザの複数タブで同じアプリケーションを使用している時に認証状態が同期される
- **要件 6.4**: StorageEventが発生した時に認証状態が適切に更新される

## 主な機能

### 1. タブ間同期

- LocalStorageのStorageEventを使用してタブ間通信を実現
- 認証状態の変更を他のタブにリアルタイムで通知
- セッションIDによる自分のタブからの変更を除外

### 2. 認証状態監視

- 定期的な認証状態チェック（デフォルト1秒間隔）
- トークンの追加・削除・変更を自動検出
- 認証関連キーの変更を監視

### 3. エラーハンドリング

- 同期エラー時の自動リトライ機能
- 最大リトライ回数到達時の安全側処理（強制ログアウト）
- 不正なデータの処理

## 使用方法

### 基本的な使用例

```typescript
import { StorageSync } from './storage-sync';

// インスタンス作成
const storageSync = new StorageSync({
  storageKey: 'my_app_auth_sync',
  syncInterval: 2000, // 2秒間隔
  maxRetries: 3,
});

// 認証状態変更リスナーを登録
storageSync.onAuthStateChange(authState => {
  if (authState) {
    console.log('ログイン検出:', authState.user);
    // ログイン処理
  } else {
    console.log('ログアウト検出');
    // ログアウト処理
  }
});

// 同期開始
storageSync.startSync();

// ログイン時
const authState = {
  isAuthenticated: true,
  user: { id: '1', email: 'user@example.com' },
  sessionId: 'session123',
  lastActivity: new Date(),
};
storageSync.broadcastAuthStateChange(authState);

// ログアウト時
storageSync.broadcastAuthStateChange(null);

// クリーンアップ
storageSync.destroy();
```

### React Contextとの統合

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { StorageSync, AuthState } from './storage-sync';

const AuthContext = createContext(null);
const storageSync = new StorageSync();

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    // 認証状態変更リスナーを設定
    storageSync.onAuthStateChange(setAuthState);

    // 同期開始
    storageSync.startSync();

    return () => {
      storageSync.destroy();
    };
  }, []);

  const login = (user) => {
    const newAuthState = {
      isAuthenticated: true,
      user,
      sessionId: generateSessionId(),
      lastActivity: new Date()
    };
    setAuthState(newAuthState);
    storageSync.broadcastAuthStateChange(newAuthState);
  };

  const logout = () => {
    setAuthState(null);
    storageSync.broadcastAuthStateChange(null);
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## API リファレンス

### コンストラクタ

```typescript
new StorageSync(options?: StorageSyncOptions)
```

#### StorageSyncOptions

| プロパティ   | 型     | デフォルト        | 説明                       |
| ------------ | ------ | ----------------- | -------------------------- |
| storageKey   | string | 'auth_state_sync' | 同期用のLocalStorageキー   |
| syncInterval | number | 1000              | 同期チェック間隔（ミリ秒） |
| maxRetries   | number | 3                 | 最大リトライ回数           |

### メソッド

#### startSync()

同期機能を開始します。StorageEventリスナーと定期チェックを開始します。

#### stopSync()

同期機能を停止します。リスナーとタイマーを停止します。

#### broadcastAuthStateChange(state: AuthState | null)

認証状態の変更を他のタブにブロードキャストします。

#### onAuthStateChange(callback: AuthStateChangeCallback)

認証状態変更リスナーを追加します。

#### removeAuthStateListener(callback: AuthStateChangeCallback)

認証状態変更リスナーを削除します。

#### onStorageChange(callback: StorageChangeCallback)

StorageEventリスナーを追加します。

#### removeStorageListener(callback: StorageChangeCallback)

StorageEventリスナーを削除します。

#### destroy()

すべてのリスナーとタイマーを停止し、クリーンアップを実行します。

## 型定義

### AuthState

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  sessionId: string;
  lastActivity: Date;
}
```

### コールバック型

```typescript
type AuthStateChangeCallback = (state: AuthState | null) => void;
type StorageChangeCallback = (event: StorageEvent) => void;
```

## 監視対象のStorageキー

以下のキーの変更を監視します：

- `auth_access_token` - アクセストークン
- `auth_refresh_token` - リフレッシュトークン
- `auth_user_data` - ユーザーデータ
- `auth_session_id` - セッションID
- `auth_last_activity` - 最終活動時刻

## エラーハンドリング

### 自動リトライ

同期処理でエラーが発生した場合、設定された最大リトライ回数まで自動的にリトライします。

### 安全側処理

最大リトライ回数に達した場合、安全側に倒して強制ログアウト処理を実行します。

### エラーログ

すべてのエラーはコンソールに出力され、デバッグに役立ちます。

## 注意事項

### セキュリティ

- LocalStorageを使用するため、XSS攻撃に注意が必要です
- 機密情報は適切に暗号化して保存してください

### パフォーマンス

- 定期チェックの間隔を短くしすぎるとパフォーマンスに影響する可能性があります
- 必要に応じて`syncInterval`を調整してください

### ブラウザ対応

- StorageEventをサポートするモダンブラウザで動作します
- IE11以降で動作確認済み

## トラブルシューティング

### 同期が動作しない

1. LocalStorageが有効になっているか確認
2. 同じオリジンのタブ間でのみ同期が動作することを確認
3. ブラウザの開発者ツールでStorageEventが発火しているか確認

### パフォーマンスの問題

1. `syncInterval`を長くする
2. 不要なリスナーを削除する
3. `destroy()`メソッドでクリーンアップを確実に実行する

### メモリリーク

1. コンポーネントのアンマウント時に`destroy()`を呼び出す
2. リスナーの追加と削除のペアを確認する
3. 長時間実行されるアプリケーションでは定期的にクリーンアップを実行する
