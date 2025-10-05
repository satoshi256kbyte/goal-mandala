# 設計書

## 概要

マンダラチャートの編集機能を実装します。インライン編集とモーダル編集の2つの編集方法を提供し、変更履歴管理、編集権限制御、編集競合回避機能を実装します。

## アーキテクチャ

### コンポーネント構成

```
MandalaChart (既存)
├── MandalaGrid (既存)
│   └── MandalaCell (既存) → 編集機能を追加
│       ├── InlineEditor (新規) - インライン編集
│       └── EditButton (新規) - モーダル編集トリガー
├── EditModal (新規) - モーダル編集
├── HistoryPanel (新規) - 変更履歴表示
└── ConflictDialog (新規) - 競合解決ダイアログ
```

### API構成

```
/api/goals/:goalId
  PUT - 目標更新
  GET - 目標取得

/api/subgoals/:subGoalId
  PUT - サブ目標更新
  GET - サブ目標取得

/api/actions/:actionId
  PUT - アクション更新
  GET - アクション取得

/api/goals/:goalId/history
  GET - 目標の変更履歴取得

/api/subgoals/:subGoalId/history
  GET - サブ目標の変更履歴取得

/api/actions/:actionId/history
  GET - アクションの変更履歴取得
```

## コンポーネント設計

### 1. InlineEditor コンポーネント

#### 責務
- セル内でのテキスト編集
- バリデーション
- 保存/キャンセル処理

#### Props
```typescript
interface InlineEditorProps {
  value: string;
  maxLength: number;
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  multiline?: boolean;
}
```

#### 状態管理
```typescript
interface InlineEditorState {
  value: string;
  isValid: boolean;
  errorMessage: string | null;
  isSaving: boolean;
}
```

#### 動作フロー
1. セルクリック → 編集モード開始
2. テキスト入力 → リアルタイムバリデーション
3. Enter/外側クリック → 保存処理
4. Esc → キャンセル処理

### 2. EditModal コンポーネント

#### 責務
- 詳細編集フォーム表示
- 全フィールドの編集
- バリデーションとエラー表示

#### Props
```typescript
interface EditModalProps {
  isOpen: boolean;
  entityType: 'goal' | 'subgoal' | 'action';
  entityId: string;
  initialData: Goal | SubGoal | Action;
  onSave: (data: Goal | SubGoal | Action) => Promise<void>;
  onClose: () => void;
}
```

#### フォームフィールド

**目標編集**
- タイトル（必須、最大100文字）
- 説明（必須、最大500文字）
- 達成期限（必須）
- 背景（必須、最大1000文字）
- 制約事項（任意、最大1000文字）

**サブ目標編集**
- タイトル（必須、最大100文字）
- 説明（必須、最大500文字）
- 背景（必須、最大1000文字）
- 制約事項（任意、最大1000文字）

**アクション編集**
- タイトル（必須、最大100文字）
- 説明（必須、最大500文字）
- 背景（必須、最大1000文字）
- 制約事項（任意、最大1000文字）
- 種別（実行/習慣）

### 3. HistoryPanel コンポーネント

#### 責務
- 変更履歴の表示
- 差分表示
- ロールバック機能（管理者のみ）

#### Props
```typescript
interface HistoryPanelProps {
  entityType: 'goal' | 'subgoal' | 'action';
  entityId: string;
  isAdmin: boolean;
  onRollback?: (historyId: string) => Promise<void>;
}
```

#### 履歴エントリ構造
```typescript
interface HistoryEntry {
  id: string;
  entityType: 'goal' | 'subgoal' | 'action';
  entityId: string;
  userId: string;
  userName: string;
  changedAt: Date;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}
```

### 4. ConflictDialog コンポーネント

#### 責務
- 編集競合の通知
- 最新データの表示
- ユーザー選択の受付

#### Props
```typescript
interface ConflictDialogProps {
  isOpen: boolean;
  currentData: Goal | SubGoal | Action;
  latestData: Goal | SubGoal | Action;
  onReload: () => void;
  onDiscard: () => void;
}
```

## データモデル

### 変更履歴テーブル

```prisma
model ChangeHistory {
  id          String   @id @default(uuid())
  entityType  String   // 'goal', 'subgoal', 'action'
  entityId    String
  userId      String
  changedAt   DateTime @default(now())
  changes     Json     // 変更内容の配列
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([entityType, entityId, changedAt])
  @@index([userId, changedAt])
}
```

### 楽観的ロック用フィールド

既存のテーブルに`updated_at`フィールドを活用します。

```prisma
model Goal {
  // ... 既存フィールド
  updated_at  DateTime @updatedAt
}

model SubGoal {
  // ... 既存フィールド
  updated_at  DateTime @updatedAt
}

model Action {
  // ... 既存フィールド
  updated_at  DateTime @updatedAt
}
```

## API設計

### 更新API（楽観的ロック対応）

#### リクエスト
```typescript
PUT /api/goals/:goalId
Content-Type: application/json

{
  "title": "新しいタイトル",
  "description": "新しい説明",
  "deadline": "2024-12-31",
  "background": "背景情報",
  "constraints": "制約事項",
  "updated_at": "2024-01-15T10:30:00Z"  // 楽観的ロック用
}
```

#### レスポンス（成功）
```typescript
200 OK
{
  "id": "goal-123",
  "title": "新しいタイトル",
  "description": "新しい説明",
  "deadline": "2024-12-31",
  "background": "背景情報",
  "constraints": "制約事項",
  "updated_at": "2024-01-15T10:35:00Z"
}
```

#### レスポンス（競合エラー）
```typescript
409 Conflict
{
  "error": "EDIT_CONFLICT",
  "message": "データが他のユーザーによって更新されています",
  "latestData": {
    "id": "goal-123",
    "title": "他のユーザーが更新したタイトル",
    // ... 最新データ
    "updated_at": "2024-01-15T10:32:00Z"
  }
}
```

### 変更履歴取得API

#### リクエスト
```typescript
GET /api/goals/:goalId/history?limit=20&offset=0
```

#### レスポンス
```typescript
200 OK
{
  "history": [
    {
      "id": "history-1",
      "entityType": "goal",
      "entityId": "goal-123",
      "userId": "user-456",
      "userName": "山田太郎",
      "changedAt": "2024-01-15T10:30:00Z",
      "changes": [
        {
          "field": "title",
          "oldValue": "古いタイトル",
          "newValue": "新しいタイトル"
        }
      ]
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

## バリデーション

### フロントエンド

```typescript
const validateGoal = (goal: Partial<Goal>): ValidationResult => {
  const errors: string[] = [];

  if (!goal.title || goal.title.trim().length === 0) {
    errors.push('タイトルは必須です');
  }
  if (goal.title && goal.title.length > 100) {
    errors.push('タイトルは100文字以内で入力してください');
  }
  if (!goal.description || goal.description.trim().length === 0) {
    errors.push('説明は必須です');
  }
  if (goal.description && goal.description.length > 500) {
    errors.push('説明は500文字以内で入力してください');
  }
  if (!goal.deadline) {
    errors.push('達成期限は必須です');
  }
  if (goal.deadline && new Date(goal.deadline) < new Date()) {
    errors.push('達成期限は未来の日付を指定してください');
  }
  if (!goal.background || goal.background.trim().length === 0) {
    errors.push('背景は必須です');
  }
  if (goal.background && goal.background.length > 1000) {
    errors.push('背景は1000文字以内で入力してください');
  }
  if (goal.constraints && goal.constraints.length > 1000) {
    errors.push('制約事項は1000文字以内で入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

### バックエンド

Zodスキーマを使用してバリデーションを実装します。

```typescript
import { z } from 'zod';

const GoalUpdateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  deadline: z.string().datetime(),
  background: z.string().min(1).max(1000),
  constraints: z.string().max(1000).optional(),
  updated_at: z.string().datetime(),
});

const SubGoalUpdateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  background: z.string().min(1).max(1000),
  constraints: z.string().max(1000).optional(),
  updated_at: z.string().datetime(),
});

const ActionUpdateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  background: z.string().min(1).max(1000),
  constraints: z.string().max(1000).optional(),
  type: z.enum(['execution', 'habit']),
  updated_at: z.string().datetime(),
});
```

## エラーハンドリング

### エラー種別

```typescript
enum EditErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EDIT_CONFLICT = 'EDIT_CONFLICT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

interface EditError {
  type: EditErrorType;
  message: string;
  details?: any;
}
```

### エラー処理フロー

1. **バリデーションエラー**
   - フロントエンドでリアルタイム表示
   - 保存ボタンを無効化

2. **編集競合エラー**
   - ConflictDialogを表示
   - 最新データを提示
   - ユーザーに選択を促す

3. **権限エラー**
   - エラートースト表示
   - 編集モードを終了

4. **ネットワークエラー**
   - リトライボタン表示
   - 自動リトライ（最大3回）

## セキュリティ

### 入力サニタイゼーション

```typescript
import DOMPurify from 'dompurify';

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};
```

### 権限チェック

```typescript
// バックエンド
const checkEditPermission = async (
  userId: string,
  entityType: 'goal' | 'subgoal' | 'action',
  entityId: string
): Promise<boolean> => {
  // 目標の所有者かどうかをチェック
  const goal = await getGoalByEntity(entityType, entityId);
  return goal.user_id === userId;
};
```

## テスト戦略

### ユニットテスト

1. **InlineEditor**
   - 入力値のバリデーション
   - 保存/キャンセル処理
   - キーボード操作

2. **EditModal**
   - フォームバリデーション
   - 保存処理
   - エラー表示

3. **HistoryPanel**
   - 履歴データの表示
   - 差分表示
   - ロールバック処理

4. **ConflictDialog**
   - 競合検出
   - ユーザー選択処理

### 統合テスト

1. インライン編集 → API呼び出し → データ更新
2. モーダル編集 → API呼び出し → データ更新
3. 編集競合 → エラー処理 → 最新データ取得
4. 変更履歴 → API呼び出し → 履歴表示

### E2Eテスト

1. セルクリック → インライン編集 → 保存 → 反映確認
2. 編集ボタン → モーダル表示 → 編集 → 保存 → 反映確認
3. 履歴ボタン → 履歴表示 → 差分確認
4. 同時編集 → 競合検出 → 解決

## パフォーマンス最適化

### 楽観的UI更新

```typescript
const handleInlineSave = async (value: string) => {
  // 1. UIを即座に更新（楽観的更新）
  updateCellDataOptimistically(cellId, value);

  try {
    // 2. API呼び出し
    const result = await updateCell(cellId, value);
    
    // 3. 成功時は何もしない（既に更新済み）
  } catch (error) {
    // 4. 失敗時は元に戻す
    revertCellData(cellId);
    showError(error);
  }
};
```

### デバウンス処理

```typescript
import { debounce } from 'lodash';

const debouncedValidation = debounce((value: string) => {
  validateInput(value);
}, 300);
```

### メモ化

```typescript
const MemoizedEditModal = React.memo(EditModal, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.entityId === nextProps.entityId &&
    prevProps.initialData === nextProps.initialData
  );
});
```

## アクセシビリティ

### キーボード操作

- **Tab**: フォーカス移動
- **Enter**: 編集開始/保存
- **Esc**: キャンセル
- **Shift+Tab**: 逆方向フォーカス移動

### ARIA属性

```typescript
<div
  role="textbox"
  aria-label="目標タイトル編集"
  aria-invalid={!isValid}
  aria-describedby={errorId}
  contentEditable
>
  {value}
</div>
```

### フォーカス管理

```typescript
useEffect(() => {
  if (isEditMode) {
    inputRef.current?.focus();
  }
}, [isEditMode]);
```

## 実装優先順位

1. **Phase 1**: インライン編集機能（基本）
2. **Phase 2**: モーダル編集機能
3. **Phase 3**: 楽観的ロックと競合解決
4. **Phase 4**: 変更履歴管理
5. **Phase 5**: 編集権限制御

各フェーズは独立してテスト・デプロイ可能です。
