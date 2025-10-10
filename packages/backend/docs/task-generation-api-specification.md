# タスク生成API 仕様書

## 概要

タスク生成API（`POST /api/ai/generate/tasks`）は、アクションから複数の具体的なタスクを自動生成するAPIです。Amazon Bedrock（Nova Microモデル）を使用して、アクションを達成するための実行可能なタスクを生成します。

## 目次

1. [エンドポイント](#エンドポイント)
2. [認証](#認証)
3. [リクエスト](#リクエスト)
4. [レスポンス](#レスポンス)
5. [エラーレスポンス](#エラーレスポンス)
6. [タスク粒度](#タスク粒度)
7. [タスク種別](#タスク種別)
8. [優先度](#優先度)
9. [依存関係](#依存関係)
10. [サンプルコード](#サンプルコード)
11. [制限事項](#制限事項)

---

## エンドポイント

```
POST /api/ai/generate/tasks
```

### 基本情報

- **プロトコル**: HTTPS
- **メソッド**: POST
- **Content-Type**: application/json
- **認証**: JWT Bearer Token（必須）

---

## 認証

### 認証方法

Amazon Cognito User Poolによる認証が必要です。リクエストヘッダーに有効なJWTトークンを含める必要があります。

### 認証ヘッダー

```http
Authorization: Bearer <JWT_TOKEN>
```

### 認証エラー

- **401 Unauthorized**: トークンが提供されていない、または無効
- **403 Forbidden**: 他人のアクションへのアクセス試行

---

## リクエスト

### リクエストボディ

```typescript
interface TaskGenerationRequest {
  actionId: string; // アクションID（UUID、必須）
  regenerate?: boolean; // 既存のタスクを再生成する場合true（オプション、デフォルト: false）
}
```

### フィールド詳細

#### actionId（必須）

- **型**: string（UUID形式）
- **説明**: タスクを生成するアクションのID
- **制約**:
  - UUID v4形式である必要があります
  - 存在するアクションのIDである必要があります
  - リクエストユーザーが所有する目標のアクションである必要があります

#### regenerate（オプション）

- **型**: boolean
- **説明**: 既存のタスクを削除して再生成するかどうか
- **デフォルト**: false
- **動作**:
  - `true`: 既存のタスクを削除してから新規生成
  - `false`: 既存のタスクがある場合はエラー

### リクエスト例

```json
{
  "actionId": "770e8400-e29b-41d4-a716-446655440000",
  "regenerate": false
}
```

---

## レスポンス

### 成功レスポンス（200 OK）

```typescript
interface TaskGenerationResponse {
  success: true;
  data: {
    actionId: string;
    tasks: TaskOutput[];
  };
  metadata: {
    generatedAt: string; // ISO 8601形式
    tokensUsed: number; // 使用トークン数
    estimatedCost: number; // 推定コスト（USD）
    actionContext: {
      goalTitle: string; // 目標タイトル
      subGoalTitle: string; // サブ目標タイトル
      actionTitle: string; // アクションタイトル
      actionType: ActionType; // アクション種別
    };
    taskCount: number; // 生成されたタスク数
    totalEstimatedMinutes: number; // 全タスクの推定時間合計
  };
}

interface TaskOutput {
  id: string; // UUID
  title: string; // タスクタイトル（50文字以内）
  description: string; // タスク説明（200文字以内）
  type: TaskType; // タスク種別（EXECUTION/HABIT）
  status: TaskStatus; // タスク状態（初期値: NOT_STARTED）
  estimatedMinutes: number; // 推定所要時間（15-120分）
  priority: TaskPriority; // 優先度（HIGH/MEDIUM/LOW）
  dependencies: string[]; // 依存タスクIDの配列
  createdAt: string; // 作成日時（ISO 8601形式）
  updatedAt: string; // 更新日時（ISO 8601形式）
}

enum TaskType {
  EXECUTION = 'execution', // 実行タスク
  HABIT = 'habit', // 習慣タスク
}

enum TaskStatus {
  NOT_STARTED = 'not_started', // 未着手
  IN_PROGRESS = 'in_progress', // 進行中
  COMPLETED = 'completed', // 完了
  SKIPPED = 'skipped', // スキップ
}

enum TaskPriority {
  HIGH = 'high', // 高優先度
  MEDIUM = 'medium', // 中優先度
  LOW = 'low', // 低優先度
}

enum ActionType {
  EXECUTION = 'execution', // 実行アクション
  HABIT = 'habit', // 習慣アクション
}
```

### レスポンス例

```json
{
  "success": true,
  "data": {
    "actionId": "770e8400-e29b-41d4-a716-446655440000",
    "tasks": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440001",
        "title": "TypeScript公式ドキュメントの基礎編を読む",
        "description": "TypeScript公式ドキュメントの基礎編（型システム、インターフェース、クラス）を読み、サンプルコードを実際に動かして理解を深める",
        "type": "execution",
        "status": "not_started",
        "estimatedMinutes": 45,
        "priority": "high",
        "dependencies": [],
        "createdAt": "2025-10-10T10:00:00.000Z",
        "updatedAt": "2025-10-10T10:00:00.000Z"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440002",
        "title": "TypeScriptの型システムを実践する",
        "description": "学んだ型システムの知識を使って、簡単なTypeScriptプログラムを作成し、型の恩恵を体感する",
        "type": "execution",
        "status": "not_started",
        "estimatedMinutes": 60,
        "priority": "medium",
        "dependencies": ["880e8400-e29b-41d4-a716-446655440001"],
        "createdAt": "2025-10-10T10:00:00.000Z",
        "updatedAt": "2025-10-10T10:00:00.000Z"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "title": "ジェネリクスの章を読む",
        "description": "TypeScript公式ドキュメントのジェネリクスの章を読み、型パラメータの使い方を理解する",
        "type": "execution",
        "status": "not_started",
        "estimatedMinutes": 30,
        "priority": "medium",
        "dependencies": ["880e8400-e29b-41d4-a716-446655440001"],
        "createdAt": "2025-10-10T10:00:00.000Z",
        "updatedAt": "2025-10-10T10:00:00.000Z"
      }
    ]
  },
  "metadata": {
    "generatedAt": "2025-10-10T10:00:00.000Z",
    "tokensUsed": 2500,
    "estimatedCost": 0.00038,
    "actionContext": {
      "goalTitle": "TypeScriptのエキスパートになる",
      "subGoalTitle": "TypeScriptの基礎文法を習得する",
      "actionTitle": "TypeScript公式ドキュメントを読む",
      "actionType": "execution"
    },
    "taskCount": 3,
    "totalEstimatedMinutes": 135
  }
}
```

---

## エラーレスポンス

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable?: boolean;
    details?: ValidationErrorDetail[];
  };
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### エラーコード一覧

詳細は[エラーコード一覧](./task-generation-error-codes.md)を参照してください。

#### VALIDATION_ERROR（400 Bad Request）

入力データが不正な場合に発生します。

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力データが不正です",
    "retryable": false,
    "details": [
      {
        "field": "actionId",
        "message": "アクションIDは有効なUUID形式である必要があります"
      }
    ]
  }
}
```

#### NOT_FOUND（404 Not Found）

指定されたアクションが見つからない場合に発生します。

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "指定されたアクションが見つかりません",
    "retryable": false
  }
}
```

#### FORBIDDEN（403 Forbidden）

他人のアクションにアクセスしようとした場合に発生します。

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "このアクションにアクセスする権限がありません",
    "retryable": false
  }
}
```

#### QUALITY_ERROR（422 Unprocessable Entity）

AI生成結果の品質が基準を満たさない場合に発生します。

```json
{
  "success": false,
  "error": {
    "code": "QUALITY_ERROR",
    "message": "AI生成結果の品質が基準を満たしませんでした。もう一度お試しください。",
    "retryable": true
  }
}
```

#### DATABASE_ERROR（500 Internal Server Error）

データベース操作でエラーが発生した場合に発生します。

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データの保存に失敗しました",
    "retryable": true
  }
}
```

#### AI_SERVICE_ERROR（503 Service Unavailable）

AI生成サービスが一時的に利用できない場合に発生します。

```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "AI生成サービスが一時的に利用できません",
    "retryable": true
  }
}
```

---

## タスク粒度

タスクは日々実行可能な粒度に分解されます。

### 推定所要時間

- **目標範囲**: 30-60分
- **許容範囲**: 15-120分
- **デフォルト値**: 45分（推定が不明確な場合）

### 粒度調整の仕組み

AIは以下の基準でタスクを適切な粒度に分解します：

1. **大きなアクション**: 複数のタスクに分割
   - 例: 「TypeScript公式ドキュメントを読む」→「基礎編を読む」「ジェネリクスの章を読む」「高度な型の章を読む」

2. **小さなアクション**: 1つのタスクとして生成
   - 例: 「TypeScriptの環境構築」→「TypeScriptの環境構築」（そのまま）

3. **適切なアクション**: 2-3個のタスクに分割
   - 例: 「小規模プロジェクトをTypeScriptで実装」→「プロジェクト設計」「実装」「テスト」

### タスク数の目安

- **実行アクション**: 1-5個のタスク
- **習慣アクション**: 1-3個のタスク（継続的な実施が前提）

---

## タスク種別

タスクの種別はアクションの種別を継承します。

### 実行タスク（EXECUTION）

実行アクションから生成されるタスクです。

**特徴**:

- 一度実施すれば完了
- 明確な完了条件がある
- 全タスク完了でアクション達成

**例**:

- 「TypeScript公式ドキュメントの基礎編を読む」
- 「TypeScriptの型システムを実践する」
- 「ジェネリクスの章を読む」

### 習慣タスク（HABIT）

習慣アクションから生成されるタスクです。

**特徴**:

- 継続的な実施が必要
- 目標達成期間の8割を継続することでアクション達成
- 週に1度リマインド

**例**:

- 「毎日TypeScriptコードを書く」
- 「TypeScript関連の技術記事を読む」
- 「TypeScript関連の動画教材を視聴」

### 種別の継承ルール

```
実行アクション（EXECUTION）→ 実行タスク（EXECUTION）
習慣アクション（HABIT）→ 習慣タスク（HABIT）
```

---

## 優先度

各タスクには優先度が設定されます。

### 優先度レベル

#### HIGH（高優先度）

- アクションの重要度が高い
- 他のタスクの前提条件となる
- 早期に着手すべきタスク

**例**:

- 「TypeScript公式ドキュメントの基礎編を読む」（基礎知識が必要）
- 「プロジェクト設計」（実装の前提）

#### MEDIUM（中優先度）

- 標準的な優先度
- 順次実施すべきタスク
- デフォルト値

**例**:

- 「TypeScriptの型システムを実践する」
- 「ジェネリクスの章を読む」

#### LOW（低優先度）

- 補助的なタスク
- 後回しにしても問題ないタスク
- オプショナルなタスク

**例**:

- 「TypeScript関連の動画教材を視聴」（補助的な学習）
- 「コミュニティイベントに参加」（オプション）

### 優先度設定の仕組み

AIは以下の基準で優先度を判定します：

1. **依存関係**: 他のタスクの前提条件となるタスクは高優先度
2. **アクションの重要度**: 重要なアクションのタスクは高優先度
3. **実施順序**: 早期に実施すべきタスクは高優先度
4. **補助的な性質**: 補助的なタスクは低優先度

---

## 依存関係

タスク間の依存関係を管理します。

### 依存関係の種類

#### 前提条件（Prerequisites）

あるタスクを実施する前に完了すべきタスクです。

**例**:

```
「TypeScript公式ドキュメントの基礎編を読む」
  ↓（前提条件）
「TypeScriptの型システムを実践する」
```

### 依存関係の表現

```typescript
{
  "id": "task-002",
  "title": "TypeScriptの型システムを実践する",
  "dependencies": ["task-001"] // task-001が前提条件
}
```

### 依存関係の制約

- **循環依存の禁止**: タスクAがタスクBに依存し、タスクBがタスクAに依存することは禁止
- **依存深度**: 依存関係の深さは最大3レベルまで
- **依存数**: 1つのタスクが依存できるタスク数は最大3個まで

### 依存関係の自動検出

AIは以下の基準で依存関係を検出します：

1. **順序性**: 「〜してから」「〜の後に」などのキーワード
2. **前提知識**: 基礎的な知識が必要なタスク
3. **実施順序**: 論理的な実施順序

---

## サンプルコード

### JavaScript/TypeScript

```typescript
// タスク生成APIの呼び出し例
async function generateTasks(
  actionId: string,
  regenerate: boolean = false
): Promise<TaskGenerationResponse> {
  const token = await getAuthToken(); // 認証トークンを取得

  const response = await fetch(
    'https://api.example.com/api/ai/generate/tasks',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        actionId,
        regenerate,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.error.message}`);
  }

  return await response.json();
}

// 使用例
try {
  const result = await generateTasks('770e8400-e29b-41d4-a716-446655440000');
  console.log(`生成されたタスク数: ${result.data.tasks.length}`);
  console.log(`全タスクの推定時間: ${result.metadata.totalEstimatedMinutes}分`);
  console.log(`使用トークン数: ${result.metadata.tokensUsed}`);
  console.log(`推定コスト: ${result.metadata.estimatedCost}`);

  // 優先度別の集計
  const highPriority = result.data.tasks.filter(
    t => t.priority === 'high'
  ).length;
  const mediumPriority = result.data.tasks.filter(
    t => t.priority === 'medium'
  ).length;
  const lowPriority = result.data.tasks.filter(
    t => t.priority === 'low'
  ).length;
  console.log(
    `高優先度: ${highPriority}個、中優先度: ${mediumPriority}個、低優先度: ${lowPriority}個`
  );

  // 依存関係のあるタスク
  const tasksWithDependencies = result.data.tasks.filter(
    t => t.dependencies.length > 0
  );
  console.log(`依存関係のあるタスク: ${tasksWithDependencies.length}個`);
} catch (error) {
  console.error('タスク生成エラー:', error);
}
```

### エラーハンドリング

```typescript
async function generateTasksWithRetry(
  actionId: string,
  maxRetries: number = 3
): Promise<TaskGenerationResponse> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateTasks(actionId);
    } catch (error) {
      const errorResponse = error as ErrorResponse;

      // リトライ可能なエラーの場合
      if (errorResponse.error?.retryable && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 指数バックオフ
        console.log(`リトライします（${i + 1}/${maxRetries}）: ${delay}ms後`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // リトライ不可能なエラー、または最大リトライ回数に達した場合
      throw error;
    }
  }

  throw new Error('最大リトライ回数に達しました');
}
```

### React Hookの例

```typescript
import { useState } from 'react';

interface UseTaskGenerationResult {
  generateTasks: (actionId: string, regenerate?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
  tasks: TaskOutput[] | null;
  metadata: TaskGenerationResponse['metadata'] | null;
}

function useTaskGeneration(): UseTaskGenerationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskOutput[] | null>(null);
  const [metadata, setMetadata] = useState<TaskGenerationResponse['metadata'] | null>(null);

  const generateTasks = async (actionId: string, regenerate: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateTasksWithRetry(actionId);
      setTasks(result.data.tasks);
      setMetadata(result.metadata);
    } catch (err) {
      const errorResponse = err as ErrorResponse;
      setError(errorResponse.error?.message || 'タスク生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return { generateTasks, loading, error, tasks, metadata };
}

// 使用例
function TaskGenerationComponent({ actionId }: { actionId: string }) {
  const { generateTasks, loading, error, tasks, metadata } = useTaskGeneration();

  const handleGenerate = () => {
    generateTasks(actionId);
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'タスク生成中...' : 'タスクを生成'}
      </button>

      {error && <div className="error">{error}</div>}

      {tasks && metadata && (
        <div>
          <h3>生成されたタスク（{metadata.taskCount}個）</h3>
          <p>推定時間合計: {metadata.totalEstimatedMinutes}分</p>

          {tasks.map(task => (
            <div key={task.id} className={`task priority-${task.priority}`}>
              <h4>
                {task.title}
                <span className="badge">{task.priority}</span>
                <span className="badge">{task.type === 'execution' ? '実行' : '習慣'}</span>
              </h4>
              <p>{task.description}</p>
              <p>推定時間: {task.estimatedMinutes}分</p>
              {task.dependencies.length > 0 && (
                <p>依存タスク: {task.dependencies.length}個</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 依存関係の可視化

```typescript
// タスクの依存関係をグラフ構造で表現
function buildTaskDependencyGraph(
  tasks: TaskOutput[]
): Map<string, TaskOutput[]> {
  const graph = new Map<string, TaskOutput[]>();

  tasks.forEach(task => {
    if (task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        if (!graph.has(depId)) {
          graph.set(depId, []);
        }
        graph.get(depId)!.push(task);
      });
    }
  });

  return graph;
}

// 実行可能なタスク（依存タスクが全て完了している）を取得
function getExecutableTasks(
  tasks: TaskOutput[],
  completedTaskIds: Set<string>
): TaskOutput[] {
  return tasks.filter(task => {
    // 未完了のタスクのみ
    if (task.status === 'completed') return false;

    // 依存タスクが全て完了している
    return task.dependencies.every(depId => completedTaskIds.has(depId));
  });
}

// 使用例
const tasks = result.data.tasks;
const completedTaskIds = new Set(['task-001', 'task-002']);
const executableTasks = getExecutableTasks(tasks, completedTaskIds);
console.log(`実行可能なタスク: ${executableTasks.length}個`);
```

---

## 制限事項

### レート制限

- **リクエスト数**: 10リクエスト/分/ユーザー
- **同時実行数**: 10（Lambda関数レベル）
- **超過時のレスポンス**: 429 Too Many Requests

### 処理時間

- **タイムアウト**: 60秒
- **推奨処理時間**: 95パーセンタイルで30秒以内
- **超過時の動作**: タイムアウトエラー

### データサイズ

- **リクエストボディ**: 最大10KB
- **レスポンスボディ**: 最大100KB

### タスク生成

- **生成数**: 最低1個以上
- **タイトル**: 50文字以内
- **説明**: 200文字以内
- **推定時間**: 15-120分

### コスト

- **トークン使用量**: 約2500トークン/リクエスト
- **推定コスト**: 約$0.00038/リクエスト（Nova Microモデル）

---

## ベストプラクティス

### 1. エラーハンドリング

- リトライ可能なエラーは指数バックオフでリトライ
- ユーザーフレンドリーなエラーメッセージを表示
- エラーログを適切に記録

### 2. パフォーマンス

- 不要なリクエストを避ける
- 生成結果をキャッシュする
- 並列リクエストを制限する

### 3. ユーザーエクスペリエンス

- 処理中の進捗を表示
- 生成結果をプレビュー表示
- 編集機能を提供
- 依存関係を視覚的に表示

### 4. セキュリティ

- 認証トークンを安全に管理
- HTTPS通信を使用
- 入力値を適切にバリデーション

### 5. タスク管理

- 優先度に基づいてタスクをソート
- 依存関係を考慮した実行順序を提案
- 完了したタスクを適切に記録

---

## 関連ドキュメント

- [エラーコード一覧](./task-generation-error-codes.md)
- [運用ガイド](./task-generation-operations-guide.md)
- [トラブルシューティングガイド](./task-generation-troubleshooting-guide.md)
- [アクション生成API仕様書](./action-generation-api-specification.md)
- [サブ目標生成API仕様書](./subgoal-generation-api-specification.md)

---

## 変更履歴

| バージョン | 日付       | 変更内容     |
| ---------- | ---------- | ------------ |
| 1.0.0      | 2025-10-10 | 初版リリース |

---

## サポート

質問や問題がある場合は、以下の情報を含めて開発チームに連絡してください：

- エラーコード
- リクエストID
- タイムスタンプ
- 再現手順
- 期待される動作
- 実際の動作
