# アクション生成API 仕様書

## 概要

アクション生成API（`POST /api/ai/generate/actions`）は、サブ目標から8つのアクションを自動生成するAPIです。Amazon Bedrock（Nova Microモデル）を使用して、サブ目標を達成するための具体的なアクションを生成します。

## 目次

1. [エンドポイント](#エンドポイント)
2. [認証](#認証)
3. [リクエスト](#リクエスト)
4. [レスポンス](#レスポンス)
5. [エラーレスポンス](#エラーレスポンス)
6. [アクション種別](#アクション種別)
7. [サンプルコード](#サンプルコード)
8. [制限事項](#制限事項)

---

## エンドポイント

```
POST /api/ai/generate/actions
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
- **403 Forbidden**: 他人のサブ目標へのアクセス試行

---

## リクエスト

### リクエストボディ

```typescript
interface ActionGenerationRequest {
  subGoalId: string; // サブ目標ID（UUID、必須）
  regenerate?: boolean; // 既存のアクションを再生成する場合true（オプション、デフォルト: false）
}
```

### フィールド詳細

#### subGoalId（必須）

- **型**: string（UUID形式）
- **説明**: アクションを生成するサブ目標のID
- **制約**:
  - UUID v4形式である必要があります
  - 存在するサブ目標のIDである必要があります
  - リクエストユーザーが所有する目標のサブ目標である必要があります

#### regenerate（オプション）

- **型**: boolean
- **説明**: 既存のアクションを削除して再生成するかどうか
- **デフォルト**: false
- **動作**:
  - `true`: 既存のアクションを削除してから新規生成
  - `false`: 既存のアクションがある場合はエラー

### リクエスト例

```json
{
  "subGoalId": "550e8400-e29b-41d4-a716-446655440000",
  "regenerate": false
}
```

---

## レスポンス

### 成功レスポンス（200 OK）

```typescript
interface ActionGenerationResponse {
  success: true;
  data: {
    subGoalId: string;
    actions: ActionOutput[];
  };
  metadata: {
    generatedAt: string; // ISO 8601形式
    tokensUsed: number; // 使用トークン数
    estimatedCost: number; // 推定コスト（USD）
    goalContext: {
      goalTitle: string; // 目標タイトル
      subGoalTitle: string; // サブ目標タイトル
    };
  };
}

interface ActionOutput {
  id: string; // UUID
  title: string; // アクションタイトル（50文字以内）
  description: string; // アクション説明（100-200文字）
  background: string; // 背景（100文字以内）
  type: ActionType; // アクション種別（EXECUTION/HABIT）
  position: number; // 位置（0-7）
  progress: number; // 進捗率（初期値: 0）
  createdAt: string; // 作成日時（ISO 8601形式）
  updatedAt: string; // 更新日時（ISO 8601形式）
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
    "subGoalId": "550e8400-e29b-41d4-a716-446655440000",
    "actions": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "TypeScript公式ドキュメントを読む",
        "description": "TypeScript公式ドキュメントの基礎編を1日1章ずつ読み進め、サンプルコードを実際に動かして理解を深める。特に型システムの章を重点的に学習する。",
        "background": "公式ドキュメントは最も正確で体系的な情報源であり、基礎を固めるために不可欠である",
        "type": "execution",
        "position": 0,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "title": "毎日TypeScriptコードを書く",
        "description": "毎日最低30分はTypeScriptでコードを書き、型システムの理解を深める習慣を作る。小さなプロジェクトやコードチャレンジに取り組む。",
        "background": "継続的な実践により、TypeScriptの型システムが自然に身につく",
        "type": "habit",
        "position": 1,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440003",
        "title": "TypeScript演習問題を解く",
        "description": "TypeScript Exercisesやtype-challengesなどのオンライン演習問題を解き、型システムの理解を深める。難易度を徐々に上げていく。",
        "background": "実践的な問題を解くことで、型システムの応用力が身につく",
        "type": "execution",
        "position": 2,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440004",
        "title": "TypeScript関連の技術記事を読む",
        "description": "Qiita、Zenn、Medium等でTypeScript関連の技術記事を週に3本以上読み、最新のベストプラクティスやTipsを学ぶ。",
        "background": "コミュニティの知見を吸収することで、実践的なスキルが向上する",
        "type": "habit",
        "position": 3,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440005",
        "title": "小規模プロジェクトをTypeScriptで実装",
        "description": "ToDoアプリやAPIクライアントなど、小規模なプロジェクトをTypeScriptで実装し、実践的なスキルを身につける。",
        "background": "実際のプロジェクトを通じて、TypeScriptの実践的な使い方が理解できる",
        "type": "execution",
        "position": 4,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440006",
        "title": "TypeScriptの型定義を書く練習",
        "description": "既存のJavaScriptライブラリの型定義を書く練習をする。DefinitelyTypedのコントリビューションも検討する。",
        "background": "型定義を書くことで、TypeScriptの型システムへの理解が深まる",
        "type": "execution",
        "position": 5,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440007",
        "title": "TypeScriptのコードレビューを受ける",
        "description": "書いたTypeScriptコードを経験者にレビューしてもらい、フィードバックを受ける。オンラインコミュニティやメンターを活用する。",
        "background": "他者からのフィードバックにより、自分では気づかない改善点が見つかる",
        "type": "execution",
        "position": 6,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440008",
        "title": "TypeScript関連の動画教材を視聴",
        "description": "Udemy、YouTube等でTypeScript関連の動画教材を視聴し、視覚的に理解を深める。週に2本以上のペースで学習する。",
        "background": "動画教材により、文字だけでは理解しにくい概念が視覚的に理解できる",
        "type": "habit",
        "position": 7,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      }
    ]
  },
  "metadata": {
    "generatedAt": "2025-10-09T10:00:00.000Z",
    "tokensUsed": 2000,
    "estimatedCost": 0.0003,
    "goalContext": {
      "goalTitle": "TypeScriptのエキスパートになる",
      "subGoalTitle": "TypeScriptの基礎文法を習得する"
    }
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

詳細は[エラーコード一覧](./action-generation-error-codes.md)を参照してください。

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
        "field": "subGoalId",
        "message": "サブ目標IDは有効なUUID形式である必要があります"
      }
    ]
  }
}
```

#### NOT_FOUND（404 Not Found）

指定されたサブ目標が見つからない場合に発生します。

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "指定されたサブ目標が見つかりません",
    "retryable": false
  }
}
```

#### FORBIDDEN（403 Forbidden）

他人のサブ目標にアクセスしようとした場合に発生します。

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "このサブ目標にアクセスする権限がありません",
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

## アクション種別

アクションには2つの種別があります：

### 実行アクション（EXECUTION）

一度実施すれば完了となるアクションです。

**特徴**:

- 明確な完了条件がある
- 一度で完結する
- 進捗は完了率（0-100%）で表現

**例**:

- 「TypeScript公式ドキュメントを読む」
- 「小規模プロジェクトをTypeScriptで実装」
- 「TypeScriptの型定義を書く練習」

**判定基準**:

- 「作成」「実装」「完成」「達成」「登壇」「発表」「提出」「公開」「リリース」などのキーワードを含む
- 一度で完了する性質のもの

### 習慣アクション（HABIT）

継続的に実施する必要があるアクションです。

**特徴**:

- 継続的な実施が必要
- 習慣化が目的
- 進捗は継続率で表現

**例**:

- 「毎日TypeScriptコードを書く」
- 「TypeScript関連の技術記事を読む」
- 「TypeScript関連の動画教材を視聴」

**判定基準**:

- 「毎日」「毎週」「継続」「習慣」「定期的」「日々」「常に」「ルーティン」「繰り返し」などのキーワードを含む
- 継続的な実施が必要なもの

### アクション種別の自動判定

AIがアクションの内容から種別を自動判定します。判定が不明確な場合は、デフォルトで「実行アクション（EXECUTION）」が設定されます。

---

## サンプルコード

### JavaScript/TypeScript

```typescript
// アクション生成APIの呼び出し例
async function generateActions(
  subGoalId: string,
  regenerate: boolean = false
): Promise<ActionGenerationResponse> {
  const token = await getAuthToken(); // 認証トークンを取得

  const response = await fetch(
    'https://api.example.com/api/ai/generate/actions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subGoalId,
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
  const result = await generateActions('550e8400-e29b-41d4-a716-446655440000');
  console.log(`生成されたアクション数: ${result.data.actions.length}`);
  console.log(`使用トークン数: ${result.metadata.tokensUsed}`);
  console.log(`推定コスト: $${result.metadata.estimatedCost}`);

  // アクション種別の集計
  const executionCount = result.data.actions.filter(
    a => a.type === 'execution'
  ).length;
  const habitCount = result.data.actions.filter(a => a.type === 'habit').length;
  console.log(
    `実行アクション: ${executionCount}個、習慣アクション: ${habitCount}個`
  );
} catch (error) {
  console.error('アクション生成エラー:', error);
}
```

### エラーハンドリング

```typescript
async function generateActionsWithRetry(
  subGoalId: string,
  maxRetries: number = 3
): Promise<ActionGenerationResponse> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateActions(subGoalId);
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

interface UseActionGenerationResult {
  generateActions: (subGoalId: string, regenerate?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
  actions: ActionOutput[] | null;
}

function useActionGeneration(): UseActionGenerationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionOutput[] | null>(null);

  const generateActions = async (subGoalId: string, regenerate: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateActionsWithRetry(subGoalId);
      setActions(result.data.actions);
    } catch (err) {
      const errorResponse = err as ErrorResponse;
      setError(errorResponse.error?.message || 'アクション生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return { generateActions, loading, error, actions };
}

// 使用例
function ActionGenerationComponent({ subGoalId }: { subGoalId: string }) {
  const { generateActions, loading, error, actions } = useActionGeneration();

  const handleGenerate = () => {
    generateActions(subGoalId);
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'アクション生成中...' : 'アクションを生成'}
      </button>

      {error && <div className="error">{error}</div>}

      {actions && (
        <div>
          <h3>生成されたアクション（{actions.length}個）</h3>
          {actions.map(action => (
            <div key={action.id}>
              <h4>{action.title} ({action.type === 'execution' ? '実行' : '習慣'})</h4>
              <p>{action.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
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

### アクション生成

- **生成数**: 必ず8個
- **タイトル**: 50文字以内
- **説明**: 100-200文字
- **背景**: 100文字以内

### コスト

- **トークン使用量**: 約2000トークン/リクエスト
- **推定コスト**: 約$0.0003/リクエスト（Nova Microモデル）

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

### 4. セキュリティ

- 認証トークンを安全に管理
- HTTPS通信を使用
- 入力値を適切にバリデーション

---

## 関連ドキュメント

- [エラーコード一覧](./action-generation-error-codes.md)
- [運用ガイド](./action-generation-operations-guide.md)
- [トラブルシューティングガイド](./action-generation-troubleshooting-guide.md)
- [サブ目標生成API仕様書](./subgoal-generation-api-specification.md)

---

## 変更履歴

| バージョン | 日付       | 変更内容     |
| ---------- | ---------- | ------------ |
| 1.0.0      | 2025-10-09 | 初版リリース |

---

## サポート

質問や問題がある場合は、以下の情報を含めて開発チームに連絡してください：

- エラーコード
- リクエストID
- タイムスタンプ
- 再現手順
- 期待される動作
- 実際の動作
