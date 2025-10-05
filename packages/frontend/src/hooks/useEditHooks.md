# 編集機能APIフック実装ドキュメント

## 概要

マンダラチャート編集機能のための状態管理とAPI統合フックを実装しました。このドキュメントでは、実装されたフックの使用方法と機能について説明します。

## 実装されたフック

### 1. useUpdateGoal

目標を更新するためのフック。楽観的更新とエラー時のロールバックをサポートします。

#### 使用例

```typescript
import { useUpdateGoal } from '@/hooks/useEditHooks';

function GoalEditor() {
  const updateGoal = useUpdateGoal({
    onSuccess: (data) => {
      console.log('目標が更新されました:', data);
    },
    onError: (error) => {
      if (error.type === 'EDIT_CONFLICT') {
        // 競合エラーの処理
        console.log('最新データ:', error.latestData);
      }
    },
  });

  const handleSave = () => {
    updateGoal.mutate({
      id: 'goal-1',
      data: {
        title: '新しいタイトル',
        description: '新しい説明',
        updated_at: '2024-01-15T10:30:00Z',
      },
    });
  };

  return (
    <button onClick={handleSave} disabled={updateGoal.isPending}>
      {updateGoal.isPending ? '保存中...' : '保存'}
    </button>
  );
}
```

#### 機能

- **楽観的更新**: UIを即座に更新し、APIレスポンスを待たずにユーザーに反映
- **自動ロールバック**: エラー発生時に以前の状態に自動的に戻す
- **競合検出**: 409エラーを検出し、最新データを提供
- **キャッシュ管理**: React Queryのキャッシュを自動的に更新

### 2. useUpdateSubGoal

サブ目標を更新するためのフック。useUpdateGoalと同様の機能を提供します。

#### 使用例

```typescript
import { useUpdateSubGoal } from '@/hooks/useEditHooks';

function SubGoalEditor() {
  const updateSubGoal = useUpdateSubGoal({
    onSuccess: () => {
      console.log('サブ目標が更新されました');
    },
  });

  const handleSave = () => {
    updateSubGoal.mutate({
      id: 'subgoal-1',
      data: {
        title: '新しいサブ目標',
        description: '説明',
        background: '背景',
        updated_at: '2024-01-15T10:30:00Z',
      },
    });
  };

  return <button onClick={handleSave}>保存</button>;
}
```

### 3. useUpdateAction

アクションを更新するためのフック。useUpdateGoalと同様の機能を提供します。

#### 使用例

```typescript
import { useUpdateAction } from '@/hooks/useEditHooks';

function ActionEditor() {
  const updateAction = useUpdateAction({
    onSuccess: () => {
      console.log('アクションが更新されました');
    },
  });

  const handleSave = () => {
    updateAction.mutate({
      id: 'action-1',
      data: {
        title: '新しいアクション',
        description: '説明',
        type: 'execution',
        updated_at: '2024-01-15T10:30:00Z',
      },
    });
  };

  return <button onClick={handleSave}>保存</button>;
}
```

### 4. useHistory

変更履歴を取得するためのフック。

#### 使用例

```typescript
import { useHistory } from '@/hooks/useEditHooks';

function HistoryViewer() {
  const { data, isLoading, error } = useHistory({
    entityType: 'goal',
    entityId: 'goal-1',
    limit: 20,
    offset: 0,
  });

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return (
    <div>
      <h2>変更履歴</h2>
      {data?.history.map((entry) => (
        <div key={entry.id}>
          <p>{entry.userName} - {entry.changedAt}</p>
          {entry.changes.map((change, index) => (
            <div key={index}>
              <strong>{change.field}:</strong> {change.oldValue} → {change.newValue}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

#### 機能

- **ページネーション**: limit と offset パラメータでページネーションをサポート
- **エンティティタイプ対応**: goal、subgoal、action の履歴を取得可能
- **自動キャッシュ**: React Queryによる自動キャッシュ管理

## エラーハンドリング

### エラータイプ

```typescript
enum EditErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR', // バリデーションエラー
  EDIT_CONFLICT = 'EDIT_CONFLICT', // 編集競合エラー
  PERMISSION_DENIED = 'PERMISSION_DENIED', // 権限エラー
  NOT_FOUND = 'NOT_FOUND', // 見つからないエラー
  NETWORK_ERROR = 'NETWORK_ERROR', // ネットワークエラー
  UNKNOWN_ERROR = 'UNKNOWN_ERROR', // 不明なエラー
}
```

### エラー処理の例

```typescript
const updateGoal = useUpdateGoal({
  onError: error => {
    switch (error.type) {
      case EditErrorType.EDIT_CONFLICT:
        // 競合ダイアログを表示
        showConflictDialog(error.latestData);
        break;
      case EditErrorType.VALIDATION_ERROR:
        // バリデーションエラーを表示
        showValidationErrors(error.details);
        break;
      case EditErrorType.PERMISSION_DENIED:
        // 権限エラーメッセージを表示
        showErrorToast('編集権限がありません');
        break;
      default:
        // 一般的なエラーメッセージを表示
        showErrorToast(error.message);
    }
  },
});
```

## 楽観的更新の仕組み

1. **onMutate**: ミューテーション開始時に実行
   - 進行中のクエリをキャンセル
   - 現在のデータを保存（ロールバック用）
   - UIを即座に更新

2. **onError**: エラー発生時に実行
   - 保存しておいたデータで自動ロールバック
   - エラーハンドラーを実行

3. **onSuccess**: 成功時に実行
   - キャッシュを最新データで更新
   - 関連するクエリを無効化して再取得

## テスト

全てのフックに対して包括的なテストが実装されています：

- 正常系テスト（更新成功）
- 楽観的更新のテスト
- エラー時のロールバックテスト
- 競合エラー検出テスト
- バリデーションエラー処理テスト
- 権限エラー処理テスト

テストの実行:

```bash
npm run test useEditHooks.test.tsx
```

## 要件との対応

このフックは以下の要件を満たしています：

- **要件1.5**: インライン編集でのAPI呼び出しとUI反映
- **要件2.5**: モーダル編集でのAPI呼び出しとUI反映
- **要件5.1**: 編集開始時のデータバージョン取得
- **要件5.2**: 保存時のバージョン比較と競合エラー返却
- **要件5.3**: 編集競合の検出と通知

## 今後の拡張

- リトライ機能の追加
- オフライン対応
- 変更の一時保存機能
- 変更の差分表示機能
