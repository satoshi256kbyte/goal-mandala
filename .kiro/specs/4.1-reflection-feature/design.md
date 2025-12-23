# 振り返り機能 設計書

## Overview

振り返り機能は、ユーザーが目標達成状況を定期的に振り返り、改善点を記録するための機能です。バックエンドAPIとフロントエンドUIで構成され、既存のデータベーススキーマ（Reflectionテーブル）を活用します。

## Architecture

### システム構成

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────┐
│ API Gateway │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Lambda    │
│  (Hono)     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Aurora     │
│ (Prisma)    │
└─────────────┘
```

### レイヤー構成

1. **Presentation Layer**: React コンポーネント
2. **API Layer**: Hono ハンドラー
3. **Service Layer**: ビジネスロジック
4. **Data Access Layer**: Prisma ORM

## Components and Interfaces

### Backend Components

#### 1. ReflectionService

振り返りのビジネスロジックを担当。

```typescript
interface ReflectionService {
  // 振り返りを作成
  createReflection(data: CreateReflectionInput): Promise<Reflection>;
  
  // 振り返りを取得（単一）
  getReflection(id: string, userId: string): Promise<Reflection | null>;
  
  // 振り返り一覧を取得（目標別）
  getReflectionsByGoal(goalId: string, userId: string): Promise<Reflection[]>;
  
  // 振り返りを更新
  updateReflection(id: string, userId: string, data: UpdateReflectionInput): Promise<Reflection>;
  
  // 振り返りを削除
  deleteReflection(id: string, userId: string): Promise<void>;
}

interface CreateReflectionInput {
  goalId: string;
  summary: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
}

interface UpdateReflectionInput {
  summary?: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
}
```

#### 2. ActionProgressService

アクション進捗状況の取得を担当。

```typescript
interface ActionProgressService {
  // 目標に紐づくアクションの進捗状況を取得
  getActionProgress(goalId: string, userId: string): Promise<ActionProgress[]>;
  
  // 進捗状況に基づいてアクションを分類
  categorizeActions(actions: ActionProgress[]): CategorizedActions;
}

interface ActionProgress {
  id: string;
  title: string;
  progress: number;
  subGoalTitle: string;
}

interface CategorizedActions {
  regretful: ActionProgress[];      // 進捗80%以上
  slowProgress: ActionProgress[];   // 進捗20%以下
  untouched: ActionProgress[];      // 進捗0%
}
```

#### 3. Lambda Handler

APIエンドポイントを提供。

```typescript
// POST /api/reflections
app.post('/api/reflections', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const reflection = await reflectionService.createReflection(body);
  return c.json(reflection, 201);
});

// GET /api/reflections/:id
app.get('/api/reflections/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const reflection = await reflectionService.getReflection(id, userId);
  if (!reflection) {
    return c.json({ error: 'Reflection not found' }, 404);
  }
  return c.json(reflection);
});

// GET /api/goals/:goalId/reflections
app.get('/api/goals/:goalId/reflections', async (c) => {
  const userId = c.get('userId');
  const goalId = c.req.param('goalId');
  const reflections = await reflectionService.getReflectionsByGoal(goalId, userId);
  return c.json(reflections);
});

// PUT /api/reflections/:id
app.put('/api/reflections/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const reflection = await reflectionService.updateReflection(id, userId, body);
  return c.json(reflection);
});

// DELETE /api/reflections/:id
app.delete('/api/reflections/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  await reflectionService.deleteReflection(id, userId);
  return c.json({ message: 'Reflection deleted' });
});

// GET /api/goals/:goalId/action-progress
app.get('/api/goals/:goalId/action-progress', async (c) => {
  const userId = c.get('userId');
  const goalId = c.req.param('goalId');
  const progress = await actionProgressService.getActionProgress(goalId, userId);
  const categorized = actionProgressService.categorizeActions(progress);
  return c.json(categorized);
});
```

### Frontend Components

#### 1. ReflectionForm

振り返り入力フォーム。

```typescript
interface ReflectionFormProps {
  goalId: string;
  initialData?: Reflection;
  onSubmit: (data: ReflectionFormData) => Promise<void>;
  onCancel: () => void;
}

interface ReflectionFormData {
  summary: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
}
```

#### 2. ReflectionList

振り返り一覧表示。

```typescript
interface ReflectionListProps {
  goalId: string;
  onSelectReflection: (id: string) => void;
}
```

#### 3. ReflectionDetail

振り返り詳細表示。

```typescript
interface ReflectionDetailProps {
  reflectionId: string;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}
```

#### 4. ActionProgressSelector

アクション進捗状況の候補選択。

```typescript
interface ActionProgressSelectorProps {
  goalId: string;
  category: 'regretful' | 'slowProgress' | 'untouched';
  onSelect: (action: ActionProgress) => void;
}
```

## Data Models

### Reflection（既存）

```typescript
model Reflection {
  id                    String   @id @default(uuid())
  goalId                String   @map("goal_id")
  summary               String   @db.Text
  regretfulActions      String?  @map("regretful_actions") @db.Text
  slowProgressActions   String?  @map("slow_progress_actions") @db.Text
  untouchedActions      String?  @map("untouched_actions") @db.Text
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@index([goalId, createdAt(sort: Desc)])
  @@map("reflections")
}
```

### バリデーションスキーマ

```typescript
import { z } from 'zod';

export const createReflectionSchema = z.object({
  goalId: z.string().uuid(),
  summary: z.string().min(1, '総括は必須です').max(5000, '総括は5000文字以内で入力してください'),
  regretfulActions: z.string().max(2000, '惜しかったアクションは2000文字以内で入力してください').optional(),
  slowProgressActions: z.string().max(2000, '進まなかったアクションは2000文字以内で入力してください').optional(),
  untouchedActions: z.string().max(2000, '未着手アクションは2000文字以内で入力してください').optional(),
});

export const updateReflectionSchema = z.object({
  summary: z.string().min(1, '総括は必須です').max(5000, '総括は5000文字以内で入力してください').optional(),
  regretfulActions: z.string().max(2000, '惜しかったアクションは2000文字以内で入力してください').optional(),
  slowProgressActions: z.string().max(2000, '進まなかったアクションは2000文字以内で入力してください').optional(),
  untouchedActions: z.string().max(2000, '未着手アクションは2000文字以内で入力してください').optional(),
});
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 振り返り作成の完全性

*For any* 有効な目標IDとユーザーID、振り返りを作成すると、データベースに保存され、一意のIDが割り当てられる

**Validates: Requirements 1.3**

### Property 2: 振り返り取得の正確性

*For any* 振り返りID、そのIDで振り返りを取得すると、作成時と同じ内容が返される

**Validates: Requirements 2.3**

### Property 3: 振り返り一覧の順序性

*For any* 目標ID、その目標に紐づく振り返り一覧を取得すると、作成日時の降順でソートされている

**Validates: Requirements 2.1**

### Property 4: 振り返り更新の冪等性

*For any* 振り返りID、同じ内容で複数回更新しても、最終的な状態は同じになる

**Validates: Requirements 3.3**

### Property 5: 振り返り削除の完全性

*For any* 振り返りID、削除後にそのIDで取得しようとすると、見つからない

**Validates: Requirements 4.2**

### Property 6: アクション進捗分類の正確性

*For any* アクション進捗データ、進捗80%以上は「惜しかった」、20%以下は「進まなかった」、0%は「未着手」に分類される

**Validates: Requirements 5.2, 5.3, 5.4**

### Property 7: 目標削除時のカスケード削除

*For any* 目標ID、目標を削除すると、紐づく振り返りも全て削除される

**Validates: Requirements 6.2**

### Property 8: バリデーションエラーの一貫性

*For any* 無効な入力データ、バリデーションエラーが発生し、データベースには保存されない

**Validates: Requirements 1.4, 3.4**

### Property 9: 認証・認可の保証

*For any* ユーザーID、他のユーザーの振り返りにはアクセスできない

**Validates: Requirements 1.1, 2.1, 3.1, 4.1**

### Property 10: 日時の自動設定

*For any* 振り返り、作成時にcreatedAtとupdatedAtが自動設定され、更新時にupdatedAtが自動更新される

**Validates: Requirements 6.3, 6.4**

## Error Handling

### エラー分類

1. **Validation Error**: 入力データの検証エラー（400 Bad Request）
2. **Not Found Error**: リソースが見つからない（404 Not Found）
3. **Unauthorized Error**: 認証エラー（401 Unauthorized）
4. **Forbidden Error**: 認可エラー（403 Forbidden）
5. **Internal Server Error**: サーバー内部エラー（500 Internal Server Error）

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, string[]>;
}
```

### エラーハンドリング例

```typescript
try {
  const reflection = await reflectionService.createReflection(data);
  return c.json(reflection, 201);
} catch (error) {
  if (error instanceof z.ZodError) {
    return c.json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: error.flatten().fieldErrors,
    }, 400);
  }
  
  if (error instanceof NotFoundError) {
    return c.json({
      error: 'Not Found',
      message: error.message,
    }, 404);
  }
  
  logger.error('Failed to create reflection', { error });
  return c.json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  }, 500);
}
```

## Testing Strategy

### Unit Tests

各サービスとハンドラーの単体テスト。

- ReflectionService: CRUD操作、バリデーション
- ActionProgressService: 進捗取得、分類ロジック
- Lambda Handler: エンドポイント、エラーハンドリング

### Property-Based Tests

プロパティベーステストライブラリ: `fast-check`

各プロパティを100回以上反復実行して検証。

```typescript
import * as fc from 'fast-check';

describe('Property 1: 振り返り作成の完全性', () => {
  it('should create reflection with unique ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // goalId
        fc.string({ minLength: 1, maxLength: 5000 }), // summary
        async (goalId, summary) => {
          const reflection = await reflectionService.createReflection({
            goalId,
            summary,
          });
          
          expect(reflection.id).toBeDefined();
          expect(reflection.goalId).toBe(goalId);
          expect(reflection.summary).toBe(summary);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

APIエンドポイントの統合テスト。

- 振り返りの作成・取得・更新・削除フロー
- アクション進捗取得と分類
- エラーハンドリング

### E2E Tests

Playwrightによる主要ユーザーフローのテスト。

- 振り返り作成フロー
- 振り返り履歴閲覧フロー
- 振り返り編集・削除フロー

## Performance Considerations

### データベースクエリ最適化

- インデックス活用: `reflections(goal_id, created_at DESC)`
- N+1問題回避: Prisma includeで関連データを一括取得

### キャッシング

- 振り返り一覧: React Queryでキャッシュ（5分）
- アクション進捗: React Queryでキャッシュ（1分）

### ページネーション

振り返り一覧が多い場合は、ページネーションを実装（将来拡張）。

## Security Considerations

### 認証・認可

- JWT認証: 全エンドポイントで認証必須
- ユーザーID検証: 自分の振り返りのみアクセス可能

### 入力検証

- Zodスキーマ: 全入力データを検証
- SQLインジェクション対策: Prismaのパラメータ化クエリ

### XSS対策

- フロントエンド: React の自動エスケープ
- バックエンド: 入力データのサニタイゼーション

## Monitoring and Logging

### ログ

構造化ログで記録。

```typescript
logger.info('Reflection created', {
  reflectionId: reflection.id,
  goalId: reflection.goalId,
  userId,
});

logger.error('Failed to create reflection', {
  error: error.message,
  goalId,
  userId,
});
```

### メトリクス

CloudWatch メトリクスで監視。

- ReflectionCreated: 振り返り作成数
- ReflectionRetrieved: 振り返り取得数
- ReflectionUpdated: 振り返り更新数
- ReflectionDeleted: 振り返り削除数
- ReflectionError: エラー発生数

### アラート

- エラー率が10%を超えた場合
- API応答時間が2秒を超えた場合
