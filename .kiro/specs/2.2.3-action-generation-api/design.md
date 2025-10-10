# 設計書

## 概要

サブ目標から8つのアクションを自動生成するAPIの設計を定義します。2.2.1で実装したBedrock Lambda関数と2.2.2で実装したサブ目標生成APIを基盤として、マンダラチャート作成の第2ステップとなるアクション生成機能を提供します。

## アーキテクチャ

### システム構成図

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ POST /api/ai/generate/actions
       ▼
┌─────────────────────────────────────┐
│      API Gateway                    │
│  - Cognito Authorizer               │
│  - CORS設定                         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Lambda: ActionGenerationHandler    │
│  ┌───────────────────────────────┐  │
│  │  1. リクエスト検証            │  │
│  │  2. 認証・認可チェック        │  │
│  │  3. コンテキスト取得          │  │
│  └───────────┬───────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  ContextService               │  │
│  │  - 目標情報取得               │  │
│  │  - サブ目標情報取得           │  │
│  │  - ユーザー情報取得           │  │
│  └───────────┬───────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  BedrockService               │  │
│  │  - プロンプト生成             │  │
│  │  - Bedrock API呼び出し        │  │
│  │  - レスポンス解析             │  │
│  └───────────┬───────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  ActionQualityValidator       │  │
│  │  - 生成結果検証               │  │
│  │  - 品質チェック               │  │
│  │  - 重複検出                   │  │
│  └───────────┬───────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  ActionTypeClassifier         │  │
│  │  - アクション種別判定         │  │
│  └───────────┬───────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  DatabaseService              │  │
│  │  - トランザクション管理       │  │
│  │  - データ永続化               │  │
│  └───────────────────────────────┘  │
└─────────────┬───────────────────────┘
              │
              ▼
      ┌───────────────┐
      │   Bedrock     │
      │  Nova Micro   │
      └───────────────┘
              │
              ▼
      ┌───────────────┐
      │   Aurora      │
      │  Serverless   │
      └───────────────┘
```

### データフロー

```
1. ユーザー入力（subGoalId）
   ↓
2. API Gateway（認証・CORS）
   ↓
3. Lambda Handler（検証・認可）
   ↓
4. ContextService（コンテキスト取得）
   ├─ 目標情報
   ├─ サブ目標情報
   ├─ 他のサブ目標情報
   └─ ユーザー情報
   ↓
5. BedrockService（AI生成）
   ↓
6. ActionQualityValidator（品質チェック）
   ↓
7. ActionTypeClassifier（種別判定）
   ↓
8. DatabaseService（永続化）
   ↓
9. レスポンス返却
```

## コンポーネント設計

### 1. ActionGenerationHandler

**責務**: アクション生成リクエストの処理、認証、バリデーション、レスポンス返却

**ファイル**: `packages/backend/src/handlers/action-generation.ts`

**インターフェース**:
```typescript
interface ActionGenerationRequest {
  subGoalId: string; // サブ目標ID（必須）
  regenerate?: boolean; // 既存のアクションを再生成する場合true
}

interface ActionGenerationResponse {
  success: boolean;
  data?: {
    subGoalId: string;
    actions: ActionOutput[];
  };
  metadata?: {
    generatedAt: string;
    tokensUsed: number;
    estimatedCost: number;
    goalContext: {
      goalTitle: string;
      subGoalTitle: string;
    };
  };
  error?: ErrorDetail;
}
```

**主要メソッド**:
- `handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>`
- `validateRequest(body: unknown): ActionGenerationRequest`
- `extractUserId(event: APIGatewayProxyEvent): string`
- `checkAuthorization(userId, subGoalId): Promise<void>`
- `formatResponse(result: ActionGenerationResponse): APIGatewayProxyResult`

### 2. ActionGenerationService

**責務**: アクション生成のビジネスロジック、各サービスの調整

**ファイル**: `packages/backend/src/services/action-generation.service.ts`

**インターフェース**:
```typescript
interface ActionGenerationService {
  generateAndSaveActions(
    userId: string,
    subGoalId: string,
    regenerate: boolean
  ): Promise<ActionGenerationResult>;
}

interface ActionGenerationResult {
  subGoalId: string;
  actions: ActionOutput[];
  metadata: {
    generatedAt: Date;
    tokensUsed: number;
    estimatedCost: number;
    goalContext: GoalContext;
  };
}
```

**主要メソッド**:
- `generateAndSaveActions(userId, subGoalId, regenerate): Promise<ActionGenerationResult>`
- `getContext(subGoalId): Promise<GenerationContext>`
- `generateActions(context): Promise<ActionOutput[]>`
- `validateActions(actions): void`
- `classifyActionTypes(actions): ActionOutput[]`
- `saveActions(subGoalId, actions): Promise<void>`

### 3. ContextService

**責務**: アクション生成に必要なコンテキスト情報の取得

**ファイル**: `packages/backend/src/services/context.service.ts`

**インターフェース**:
```typescript
interface GenerationContext {
  goal: {
    id: string;
    title: string;
    description: string;
    deadline: Date;
    background: string;
    constraints?: string;
  };
  subGoal: {
    id: string;
    title: string;
    description: string;
    background: string;
    position: number;
  };
  relatedSubGoals: Array<{
    title: string;
    description: string;
    position: number;
  }>;
  user: {
    industry?: string;
    jobType?: string;
  };
}
```

**主要メソッド**:
- `getGenerationContext(subGoalId): Promise<GenerationContext>`
- `getGoalInfo(goalId): Promise<GoalInfo>`
- `getSubGoalInfo(subGoalId): Promise<SubGoalInfo>`
- `getRelatedSubGoals(goalId, excludePosition): Promise<SubGoalInfo[]>`
- `getUserInfo(userId): Promise<UserInfo>`

### 4. ActionQualityValidator

**責務**: 生成されたアクションの品質検証と重複検出

**ファイル**: `packages/backend/src/services/action-quality-validator.service.ts`

**品質基準**:
```typescript
const QUALITY_CRITERIA = {
  count: 8, // 必ず8個
  titleMaxLength: 50,
  descriptionMinLength: 100,
  descriptionMaxLength: 200,
  backgroundMaxLength: 100,
  allowDuplicateTitles: false,
  similarityThreshold: 0.8, // 類似度80%以上で重複とみなす
};
```

**主要メソッド**:
- `validateQuality(actions): QualityValidationResult`
- `checkCount(actions): boolean`
- `checkTitleLength(actions): ValidationError[]`
- `checkDescriptionLength(actions): ValidationError[]`
- `checkDuplicates(actions): ValidationError[]`
- `calculateSimilarity(text1, text2): number`
- `detectAbstractActions(actions): ValidationError[]`

### 5. ActionTypeClassifier

**責務**: アクションの種別（実行/習慣）の判定

**ファイル**: `packages/backend/src/services/action-type-classifier.service.ts`

**判定基準**:
```typescript
const CLASSIFICATION_RULES = {
  habitKeywords: [
    '毎日', '毎週', '継続', '習慣', '定期的',
    '日々', '常に', 'ルーティン', '繰り返し'
  ],
  executionKeywords: [
    '作成', '実装', '完成', '達成', '登壇',
    '発表', '提出', '公開', 'リリース'
  ],
  defaultType: 'EXECUTION',
};
```

**主要メソッド**:
- `classifyActions(actions): ActionOutput[]`
- `classifyActionType(action): ActionType`
- `containsHabitKeywords(text): boolean`
- `containsExecutionKeywords(text): boolean`
- `analyzeActionNature(description): ActionType`

### 6. ActionDatabaseService

**責務**: アクションのデータベース操作、トランザクション管理

**ファイル**: `packages/backend/src/services/action-database.service.ts`

**主要メソッド**:
- `deleteExistingActions(subGoalId): Promise<void>`
- `createActions(subGoalId, actions): Promise<Action[]>`
- `updateSubGoalProgress(subGoalId): Promise<void>`
- `executeInTransaction<T>(fn): Promise<T>`

## データモデル

### リクエストデータ

```typescript
interface ActionGenerationRequest {
  subGoalId: string; // サブ目標ID（UUID、必須）
  regenerate?: boolean; // 既存のアクションを再生成する場合true（オプション、デフォルト: false）
}
```

### レスポンスデータ

```typescript
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
  HABIT = 'habit'         // 習慣アクション
}
```

## プロンプト設計

### システムメッセージ

```
あなたは目標達成の専門家です。ユーザーのサブ目標を分析し、
それを達成するための8つの具体的なアクションを提案してください。

各アクションは以下の条件を満たす必要があります：
- サブ目標達成に直接貢献する
- 具体的で実行可能である
- 互いに重複しない
- バランスよくサブ目標をカバーする
- 実行アクション（一度で完了）または習慣アクション（継続的実施）のいずれかである

アクション種別の判定基準：
- 実行アクション: 一度実施すれば完了するもの（例：資料作成、登壇、リリース）
- 習慣アクション: 継続的に実施する必要があるもの（例：毎日の学習、定期的な運動）
```

### ユーザーメッセージテンプレート

```
# 目標情報
タイトル: {goal.title}
説明: {goal.description}
達成期限: {goal.deadline}
背景: {goal.background}
制約事項: {goal.constraints}

# サブ目標情報（アクションを生成する対象）
タイトル: {subGoal.title}
説明: {subGoal.description}
背景: {subGoal.background}
位置: {subGoal.position}

# 関連サブ目標（参考情報）
{relatedSubGoals.map(sg => `- ${sg.title}: ${sg.description}`).join('\n')}

# ユーザー情報
業種: {user.industry}
職種: {user.jobType}

# 指示
上記のサブ目標「{subGoal.title}」を達成するために必要な8つのアクションを生成してください。
目標全体のコンテキストと他のサブ目標との関係を考慮し、具体的で実行可能なアクションを提案してください。

各アクションについて、それが「実行アクション」か「習慣アクション」かを判定してください。

# 出力形式
以下のJSON形式で出力してください：
{
  "actions": [
    {
      "title": "アクションのタイトル（50文字以内）",
      "description": "アクションの詳細説明（100-200文字）",
      "background": "このアクションが必要な理由（100文字以内）",
      "type": "execution" または "habit",
      "position": 0
    },
    // ... 8個のアクション
  ]
}
```

## バリデーション設計

### 入力バリデーション

```typescript
// Zodスキーマ定義
const ActionGenerationRequestSchema = z.object({
  subGoalId: z.string().uuid({
    message: 'サブ目標IDは有効なUUID形式である必要があります'
  }),
  regenerate: z.boolean().optional().default(false),
});
```

### 出力バリデーション

```typescript
// アクションの品質チェック
function validateActionQuality(actions: ActionOutput[]): void {
  // 個数チェック
  if (actions.length !== 8) {
    throw new QualityError(`アクションは8個である必要があります（現在: ${actions.length}個）`);
  }

  // 各アクションのチェック
  actions.forEach((action, index) => {
    // タイトル長チェック
    if (action.title.length > 50) {
      throw new QualityError(`アクション${index + 1}のタイトルが長すぎます（${action.title.length}文字）`);
    }

    // 説明長チェック
    if (action.description.length < 100 || action.description.length > 200) {
      throw new QualityError(`アクション${index + 1}の説明が不適切な長さです（${action.description.length}文字）`);
    }

    // 背景長チェック
    if (action.background.length > 100) {
      throw new QualityError(`アクション${index + 1}の背景が長すぎます（${action.background.length}文字）`);
    }

    // 種別チェック
    if (!['execution', 'habit'].includes(action.type)) {
      throw new QualityError(`アクション${index + 1}の種別が不正です（${action.type}）`);
    }
  });

  // 重複チェック
  const titles = actions.map(a => a.title);
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size !== titles.length) {
    console.warn('警告: アクションのタイトルに重複があります');
  }

  // 類似度チェック
  for (let i = 0; i < actions.length; i++) {
    for (let j = i + 1; j < actions.length; j++) {
      const similarity = calculateSimilarity(
        actions[i].description,
        actions[j].description
      );
      if (similarity > 0.8) {
        console.warn(`警告: アクション${i + 1}とアクション${j + 1}の説明が類似しています（類似度: ${similarity}）`);
      }
    }
  }
}

// 簡易的な類似度計算（Jaccard係数）
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
```

## データベース設計

### トランザクション処理

```typescript
async function generateAndSaveActions(
  userId: string,
  subGoalId: string,
  regenerate: boolean
): Promise<ActionGenerationResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. サブ目標の存在確認と認可チェック
    const subGoal = await tx.subGoal.findUnique({
      where: { id: subGoalId },
      include: {
        goal: {
          select: {
            id: true,
            userId: true,
            title: true,
            description: true,
            deadline: true,
            background: true,
            constraints: true,
          },
        },
      },
    });

    if (!subGoal) {
      throw new NotFoundError('サブ目標が見つかりません');
    }

    if (subGoal.goal.userId !== userId) {
      throw new ForbiddenError('このサブ目標にアクセスする権限がありません');
    }

    // 2. コンテキスト情報の取得
    const relatedSubGoals = await tx.subGoal.findMany({
      where: {
        goalId: subGoal.goal.id,
        position: { not: subGoal.position },
      },
      select: {
        title: true,
        description: true,
        position: true,
      },
      orderBy: { position: 'asc' },
    });

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        industry: true,
        jobType: true,
      },
    });

    // 3. コンテキストの構築
    const context: GenerationContext = {
      goal: {
        id: subGoal.goal.id,
        title: subGoal.goal.title,
        description: subGoal.goal.description,
        deadline: subGoal.goal.deadline,
        background: subGoal.goal.background,
        constraints: subGoal.goal.constraints,
      },
      subGoal: {
        id: subGoal.id,
        title: subGoal.title,
        description: subGoal.description || '',
        background: subGoal.background || '',
        position: subGoal.position,
      },
      relatedSubGoals: relatedSubGoals.map(sg => ({
        title: sg.title,
        description: sg.description || '',
        position: sg.position,
      })),
      user: {
        industry: user?.industry,
        jobType: user?.jobType,
      },
    };

    // 4. AI生成
    const bedrockService = new BedrockService();
    const generatedActions = await bedrockService.generateActions(context);

    // 5. 品質検証
    validateActionQuality(generatedActions);

    // 6. アクション種別の判定（AIが判定していない場合のフォールバック）
    const classifier = new ActionTypeClassifier();
    const classifiedActions = classifier.classifyActions(generatedActions);

    // 7. 既存のアクションを削除（再生成の場合）
    if (regenerate) {
      await tx.action.deleteMany({
        where: { subGoalId },
      });
    }

    // 8. アクションの保存
    const actions = await Promise.all(
      classifiedActions.map((action) =>
        tx.action.create({
          data: {
            subGoalId,
            title: action.title,
            description: action.description,
            background: action.background,
            type: action.type,
            position: action.position,
            progress: 0,
          },
        })
      )
    );

    return {
      subGoalId,
      actions: actions.map(mapActionToOutput),
      metadata: {
        generatedAt: new Date(),
        tokensUsed: 2000, // 実際の値はBedrockレスポンスから取得
        estimatedCost: 0.0003,
        goalContext: {
          goalTitle: subGoal.goal.title,
          subGoalTitle: subGoal.title,
        },
      },
    };
  });
}
```

### データマッピング

```typescript
function mapActionToOutput(action: Action): ActionOutput {
  return {
    id: action.id,
    title: action.title,
    description: action.description || '',
    background: action.background || '',
    type: action.type as ActionType,
    position: action.position,
    progress: action.progress,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  };
}
```

## エラーハンドリング設計

### エラー分類

```typescript
// カスタムエラークラス
class ValidationError extends Error {
  constructor(message: string, public details?: ValidationErrorDetail[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

class QualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QualityError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

class BedrockError extends Error {
  constructor(message: string, public retryable: boolean = true) {
    super(message);
    this.name = 'BedrockError';
  }
}
```

### エラーレスポンスマッピング

```typescript
function mapErrorToResponse(error: Error): APIGatewayProxyResult {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'サーバーエラーが発生しました';
  let retryable = true;
  let details: any = undefined;

  if (error instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
    retryable = false;
    details = error.details;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = error.message;
    retryable = false;
  } else if (error instanceof ForbiddenError) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = error.message;
    retryable = false;
  } else if (error instanceof QualityError) {
    statusCode = 422;
    errorCode = 'QUALITY_ERROR';
    message = 'AI生成結果の品質が基準を満たしませんでした。もう一度お試しください。';
    retryable = true;
  } else if (error instanceof DatabaseError) {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = 'データの保存に失敗しました';
    retryable = true;
  } else if (error instanceof BedrockError) {
    statusCode = 503;
    errorCode = 'AI_SERVICE_ERROR';
    message = 'AI生成サービスが一時的に利用できません';
    retryable = error.retryable;
  }

  // ログ出力
  console.error('エラー発生:', {
    errorCode,
    message: error.message,
    stack: error.stack,
  });

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: false,
      error: {
        code: errorCode,
        message,
        retryable,
        details,
      },
    }),
  };
}
```

## セキュリティ設計

### 認証・認可

```typescript
// Cognito Authorizerによる認証
function extractUserId(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext?.authorizer?.claims;
  if (claims && typeof claims === 'object') {
    const userId = (claims as Record<string, string>).sub;
    if (!userId) {
      throw new AuthenticationError('ユーザーIDが取得できません');
    }
    return userId;
  }

  // 開発環境用フォールバック
  if (process.env.NODE_ENV === 'development') {
    const devUserId = event.headers?.['x-user-id'];
    if (devUserId) {
      return devUserId;
    }
  }

  throw new AuthenticationError('認証が必要です');
}

// 認可チェック
async function checkAuthorization(
  userId: string,
  subGoalId: string
): Promise<void> {
  const subGoal = await prisma.subGoal.findUnique({
    where: { id: subGoalId },
    include: {
      goal: {
        select: { userId: true },
      },
    },
  });

  if (!subGoal) {
    throw new NotFoundError('サブ目標が見つかりません');
  }

  if (subGoal.goal.userId !== userId) {
    throw new ForbiddenError('このサブ目標にアクセスする権限がありません');
  }
}
```

### プロンプトインジェクション対策

```typescript
// 入力サニタイゼーション（ContextServiceで実施）
function sanitizeContextInput(context: GenerationContext): GenerationContext {
  return {
    goal: {
      ...context.goal,
      title: sanitizeText(context.goal.title),
      description: sanitizeText(context.goal.description),
      background: sanitizeText(context.goal.background),
      constraints: context.goal.constraints ? sanitizeText(context.goal.constraints) : undefined,
    },
    subGoal: {
      ...context.subGoal,
      title: sanitizeText(context.subGoal.title),
      description: sanitizeText(context.subGoal.description),
      background: sanitizeText(context.subGoal.background),
    },
    relatedSubGoals: context.relatedSubGoals.map(sg => ({
      ...sg,
      title: sanitizeText(sg.title),
      description: sanitizeText(sg.description),
    })),
    user: context.user,
  };
}

function sanitizeText(text: string): string {
  // 特殊文字のエスケープ
  let sanitized = text
    .replace(/[<>]/g, '') // HTMLタグ除去
    .replace(/\{|\}/g, '') // 中括弧除去
    .trim();

  // プロンプトインジェクションパターンの検出
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/i,
    /system\s*:/i,
    /assistant\s*:/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      throw new ValidationError('不正な入力が検出されました');
    }
  }

  return sanitized;
}
```

### レート制限

```typescript
// API Gatewayのレート制限設定
const apiThrottleSettings = {
  rateLimit: 10, // リクエスト/秒
  burstLimit: 20, // バースト時の最大リクエスト数
};

// ユーザー単位のレート制限
async function checkUserRateLimit(userId: string): Promise<void> {
  const key = `rate_limit:action_generation:${userId}`;
  const limit = 10; // 10リクエスト/分
  const window = 60; // 60秒

  const count = await getRateLimitCount(key, window);
  
  if (count >= limit) {
    throw new RateLimitError('リクエスト制限を超えました。しばらく待ってから再試行してください。');
  }

  await incrementRateLimitCount(key, window);
}
```

## パフォーマンス最適化

### Lambda設定

```typescript
// CDKでのLambda設定
const actionGenerationFunction = new lambda.Function(this, 'ActionGenerationFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'action-generation.handler',
  code: lambda.Code.fromAsset('dist'),
  memorySize: 1024, // MB
  timeout: Duration.seconds(60), // 60秒
  reservedConcurrentExecutions: 10, // 同時実行数制限
  environment: {
    DATABASE_URL: databaseUrl,
    BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
    BEDROCK_REGION: 'ap-northeast-1',
    LOG_LEVEL: 'INFO',
  },
});
```

### データベース接続プール

```typescript
// Prismaクライアントの設定
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
  // 接続プール設定
  // connection_limit=10&pool_timeout=20
});
```

### キャッシュ戦略

```typescript
// ユーザー情報のキャッシュ（Lambda実行環境で再利用）
const userCache = new Map<string, UserInfo>();
const goalCache = new Map<string, GoalInfo>();

async function getUserInfo(userId: string): Promise<UserInfo> {
  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      industry: true,
      jobType: true,
    },
  });

  if (user) {
    userCache.set(userId, user);
  }

  return user || {};
}

async function getGoalInfo(goalId: string): Promise<GoalInfo> {
  if (goalCache.has(goalId)) {
    return goalCache.get(goalId)!;
  }

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: {
      id: true,
      title: true,
      description: true,
      deadline: true,
      background: true,
      constraints: true,
    },
  });

  if (goal) {
    goalCache.set(goalId, goal);
  }

  return goal!;
}
```

## 監視とログ設計

### 構造化ログ

```typescript
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  requestId: string;
  userId?: string;
  subGoalId?: string;
  action: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

function logInfo(
  requestId: string,
  action: string,
  metadata?: Record<string, any>
): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    requestId,
    action,
    metadata,
  };
  console.log(JSON.stringify(logEntry));
}

function logError(
  requestId: string,
  action: string,
  error: Error,
  metadata?: Record<string, any>
): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    requestId,
    action,
    metadata,
    error: {
      code: error.name,
      message: error.message,
      stack: error.stack,
    },
  };
  console.error(JSON.stringify(logEntry));
}
```

### CloudWatchメトリクス

```typescript
// カスタムメトリクスの送信
async function sendMetrics(metrics: {
  success: boolean;
  duration: number;
  tokensUsed: number;
  cost: number;
  actionType: 'execution' | 'habit' | 'mixed';
}): Promise<void> {
  const cloudwatch = new CloudWatchClient({ region: 'ap-northeast-1' });

  await cloudwatch.send(
    new PutMetricDataCommand({
      Namespace: 'GoalMandala/AI',
      MetricData: [
        {
          MetricName: 'ActionGeneration',
          Value: metrics.success ? 1 : 0,
          Unit: 'Count',
          Timestamp: new Date(),
        },
        {
          MetricName: 'ActionGenerationDuration',
          Value: metrics.duration,
          Unit: 'Milliseconds',
          Timestamp: new Date(),
        },
        {
          MetricName: 'TokensUsed',
          Value: metrics.tokensUsed,
          Unit: 'Count',
          Timestamp: new Date(),
          Dimensions: [
            {
              Name: 'GenerationType',
              Value: 'Action',
            },
          ],
        },
        {
          MetricName: 'EstimatedCost',
          Value: metrics.cost,
          Unit: 'None',
          Timestamp: new Date(),
        },
      ],
    })
  );
}
```

### アラート設定

```typescript
// CDKでのアラーム設定
const errorAlarm = new cloudwatch.Alarm(this, 'ActionGenerationErrorAlarm', {
  metric: actionGenerationFunction.metricErrors({
    period: Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 2,
  alarmDescription: 'アクション生成のエラー率が閾値を超えました',
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

const durationAlarm = new cloudwatch.Alarm(this, 'ActionGenerationDurationAlarm', {
  metric: actionGenerationFunction.metricDuration({
    period: Duration.minutes(5),
    statistic: 'p95',
  }),
  threshold: 30000, // 30秒
  evaluationPeriods: 2,
  alarmDescription: 'アクション生成の処理時間が閾値を超えました',
});

// SNS通知設定
errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
durationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
```

## テスト戦略

### ユニットテスト

```typescript
// ActionTypeClassifierのテスト
describe('ActionTypeClassifier', () => {
  describe('classifyActionType', () => {
    it('習慣キーワードを含むアクションをHABITと判定する', () => {
      const action = {
        title: '毎日TypeScriptコードを書く',
        description: '毎日最低30分はTypeScriptでコードを書き、型システムの理解を深める習慣を作る',
        background: '継続的な実践により、TypeScriptの型システムが自然に身につく',
        position: 0,
      };

      const result = classifyActionType(action);
      expect(result).toBe('HABIT');
    });

    it('実行キーワードを含むアクションをEXECUTIONと判定する', () => {
      const action = {
        title: 'TypeScript公式ドキュメントを読む',
        description: 'TypeScript公式ドキュメントの基礎編を1日1章ずつ読み進め、サンプルコードを実際に動かして理解を深める',
        background: '公式ドキュメントは最も正確で体系的な情報源である',
        position: 0,
      };

      const result = classifyActionType(action);
      expect(result).toBe('EXECUTION');
    });

    it('キーワードがない場合デフォルトでEXECUTIONと判定する', () => {
      const action = {
        title: 'TypeScriptを学ぶ',
        description: 'TypeScriptの基礎を学習する',
        background: '基礎が重要',
        position: 0,
      };

      const result = classifyActionType(action);
      expect(result).toBe('EXECUTION');
    });
  });
});

// ActionQualityValidatorのテスト
describe('ActionQualityValidator', () => {
  it('8個のアクションを検証できる', () => {
    const actions = Array.from({ length: 8 }, (_, i) => ({
      title: `アクション${i + 1}`,
      description: 'a'.repeat(150),
      background: '背景',
      type: 'execution' as ActionType,
      position: i,
    }));

    expect(() => validateQuality(actions)).not.toThrow();
  });

  it('7個のアクションでエラーを投げる', () => {
    const actions = Array.from({ length: 7 }, (_, i) => ({
      title: `アクション${i + 1}`,
      description: 'a'.repeat(150),
      background: '背景',
      type: 'execution' as ActionType,
      position: i,
    }));

    expect(() => validateQuality(actions)).toThrow(QualityError);
  });

  it('重複するタイトルを検出する', () => {
    const actions = Array.from({ length: 8 }, (_, i) => ({
      title: i < 2 ? '同じタイトル' : `アクション${i + 1}`,
      description: 'a'.repeat(150),
      background: '背景',
      type: 'execution' as ActionType,
      position: i,
    }));

    // 警告ログが出力されることを確認
    const consoleSpy = jest.spyOn(console, 'warn');
    validateQuality(actions);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('重複があります')
    );
  });
});

// ContextServiceのテスト
describe('ContextService', () => {
  it('サブ目標のコンテキストを取得できる', async () => {
    const subGoalId = 'test-subgoal-id';
    
    const context = await getGenerationContext(subGoalId);
    
    expect(context.goal).toBeDefined();
    expect(context.subGoal).toBeDefined();
    expect(context.relatedSubGoals).toHaveLength(7); // 他の7個のサブ目標
    expect(context.user).toBeDefined();
  });
});
```

### 統合テスト

```typescript
// エンドツーエンドテスト
describe('ActionGeneration API', () => {
  it('アクションを生成して保存できる', async () => {
    // テストデータの準備
    const { goalId, subGoalId } = await createTestGoalAndSubGoal();

    const request = {
      subGoalId,
    };

    const response = await handler({
      httpMethod: 'POST',
      path: '/api/ai/generate/actions',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user-001',
      },
      body: JSON.stringify(request),
      requestContext: {
        requestId: 'test-request-001',
      },
    } as any);

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.actions).toHaveLength(8);
    expect(body.data.subGoalId).toBe(subGoalId);

    // データベースに保存されていることを確認
    const actions = await prisma.action.findMany({
      where: { subGoalId },
    });

    expect(actions).toHaveLength(8);
    
    // アクション種別が設定されていることを確認
    actions.forEach(action => {
      expect(['execution', 'habit']).toContain(action.type);
    });
  });

  it('存在しないサブ目標で404エラーを返す', async () => {
    const request = {
      subGoalId: 'non-existent-id',
    };

    const response = await handler({
      httpMethod: 'POST',
      path: '/api/ai/generate/actions',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user-001',
      },
      body: JSON.stringify(request),
      requestContext: {
        requestId: 'test-request-002',
      },
    } as any);

    expect(response.statusCode).toBe(404);
    
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('他人のサブ目標で403エラーを返す', async () => {
    const { subGoalId } = await createTestGoalAndSubGoal('other-user-id');

    const request = {
      subGoalId,
    };

    const response = await handler({
      httpMethod: 'POST',
      path: '/api/ai/generate/actions',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user-001',
      },
      body: JSON.stringify(request),
      requestContext: {
        requestId: 'test-request-003',
      },
    } as any);

    expect(response.statusCode).toBe(403);
    
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });
});
```

## デプロイ設計

### CDKスタック定義

```typescript
// Lambda関数の定義
const actionGenerationFunction = new lambda.Function(this, 'ActionGenerationFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'action-generation.handler',
  code: lambda.Code.fromAsset('dist'),
  memorySize: 1024,
  timeout: Duration.seconds(60),
  reservedConcurrentExecutions: 10,
  environment: {
    DATABASE_URL: databaseSecret.secretValueFromJson('url').unsafeUnwrap(),
    BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
    BEDROCK_REGION: 'ap-northeast-1',
    LOG_LEVEL: 'INFO',
  },
  role: aiGenerationRole,
});

// API Gateway統合
const api = new apigateway.RestApi(this, 'GoalMandalaAPI', {
  restApiName: 'Goal Mandala API',
  description: 'Goal Mandala Management API',
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'Authorization'],
  },
});

const aiResource = api.root.addResource('ai');
const generateResource = aiResource.addResource('generate');
const actionsResource = generateResource.addResource('actions');

actionsResource.addMethod(
  'POST',
  new apigateway.LambdaIntegration(actionGenerationFunction),
  {
    authorizer: cognitoAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
  }
);
```

### IAM権限設定

```typescript
// Lambda実行ロール（既存のaiGenerationRoleを使用）
// Bedrock権限、Secrets Manager権限、CloudWatch権限は既に設定済み
```

## ディレクトリ構造

```
packages/backend/src/
├── handlers/
│   └── action-generation.ts              # Lambda ハンドラー
├── services/
│   ├── action-generation.service.ts      # ビジネスロジック
│   ├── context.service.ts                # コンテキスト取得
│   ├── action-quality-validator.service.ts # 品質検証
│   ├── action-type-classifier.service.ts # 種別判定
│   └── action-database.service.ts        # データベース操作
├── types/
│   └── action-generation.types.ts        # 型定義
└── __tests__/
    ├── unit/
    │   ├── action-quality-validator.test.ts
    │   └── action-type-classifier.test.ts
    └── integration/
        └── action-generation.test.ts
```

## 制限事項と今後の拡張

### 現在の制限事項

1. 同時実行数: 10（初期設定）
2. タイムアウト: 60秒
3. 生成言語: 日本語のみ
4. モデル: Nova Microのみ
5. アクション種別判定: キーワードベース

### 今後の拡張予定

1. 複数モデル対応（Claude、GPT等）
2. 多言語対応
3. 機械学習ベースのアクション種別判定
4. ユーザーフィードバックによる品質改善
5. 類似サブ目標からの学習機能
6. カスタムプロンプトテンプレート機能
7. アクション推定所要時間の自動算出

## まとめ

この設計により、以下を実現します：

1. **高品質なアクション生成**: 目標全体のコンテキストを活用した一貫性のある結果を生成
2. **自動種別判定**: アクションの性質に応じた適切な種別（実行/習慣）の自動判定
3. **重複排除**: 類似度計算による重複アクションの検出と警告
4. **堅牢性**: 入力検証、エラーハンドリング、トランザクション管理により安定した動作を保証
5. **セキュリティ**: 認証・認可、プロンプトインジェクション対策、レート制限により安全性を確保
6. **パフォーマンス**: 適切なLambda設定、接続プール、キャッシュにより高速化
7. **監視性**: 構造化ログ、カスタムメトリクス、アラートにより運用を容易化
8. **テスト容易性**: モジュール化された設計により高いテストカバレッジを実現
9. **拡張性**: 将来の機能追加を考慮した柔軟な設計
