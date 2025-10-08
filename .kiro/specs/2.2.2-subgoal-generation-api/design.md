# 設計書

## 概要

ユーザーが入力した目標から8つのサブ目標を自動生成するAPIの設計を定義します。2.2.1で実装したBedrock Lambda関数を基盤として、目標入力からマンダラチャート作成の最初のステップとなるサブ目標生成機能を提供します。

## アーキテクチャ

### システム構成図

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ POST /api/ai/generate/subgoals
       ▼
┌─────────────────────────────────────┐
│      API Gateway                    │
│  - Cognito Authorizer               │
│  - CORS設定                         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Lambda: SubGoalGenerationHandler   │
│  ┌───────────────────────────────┐  │
│  │  1. リクエスト検証            │  │
│  │  2. 認証チェック              │  │
│  │  3. 入力バリデーション        │  │
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
│  │  ValidationService            │  │
│  │  - 生成結果検証               │  │
│  │  - 品質チェック               │  │
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
1. ユーザー入力
   ↓
2. API Gateway（認証・CORS）
   ↓
3. Lambda Handler（検証）
   ↓
4. BedrockService（AI生成）
   ↓
5. ValidationService（品質チェック）
   ↓
6. DatabaseService（永続化）
   ↓
7. レスポンス返却
```

## コンポーネント設計

### 1. SubGoalGenerationHandler

**責務**: サブ目標生成リクエストの処理、認証、バリデーション、レスポンス返却

**ファイル**: `packages/backend/src/handlers/subgoal-generation.ts`


**インターフェース**:
```typescript
interface SubGoalGenerationRequest {
  goalId?: string; // 既存の目標を更新する場合
  title: string;
  description: string;
  deadline: string; // ISO 8601形式
  background: string;
  constraints?: string;
}

interface SubGoalGenerationResponse {
  success: boolean;
  data?: {
    goalId: string;
    subGoals: SubGoalOutput[];
  };
  metadata?: {
    generatedAt: string;
    tokensUsed: number;
    estimatedCost: number;
  };
  error?: ErrorDetail;
}
```

**主要メソッド**:
- `handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>`
- `validateRequest(body: unknown): SubGoalGenerationRequest`
- `extractUserId(event: APIGatewayProxyEvent): string`
- `formatResponse(result: SubGoalGenerationResponse): APIGatewayProxyResult`

### 2. SubGoalGenerationService

**責務**: サブ目標生成のビジネスロジック、BedrockServiceとDatabaseServiceの調整

**ファイル**: `packages/backend/src/services/subgoal-generation.service.ts`

**インターフェース**:
```typescript
interface SubGoalGenerationService {
  generateAndSaveSubGoals(
    userId: string,
    request: SubGoalGenerationRequest
  ): Promise<SubGoalGenerationResult>;
}

interface SubGoalGenerationResult {
  goalId: string;
  subGoals: SubGoalOutput[];
  metadata: {
    generatedAt: Date;
    tokensUsed: number;
    estimatedCost: number;
  };
}
```

**主要メソッド**:
- `generateAndSaveSubGoals(userId, request): Promise<SubGoalGenerationResult>`
- `createOrUpdateGoal(userId, request): Promise<string>`
- `generateSubGoals(goalInput): Promise<SubGoalOutput[]>`
- `validateSubGoals(subGoals): void`
- `saveSubGoals(goalId, subGoals): Promise<void>`

### 3. InputValidationService

**責務**: リクエストデータの詳細なバリデーション

**ファイル**: `packages/backend/src/services/input-validation.service.ts`

**バリデーションルール**:
```typescript
const VALIDATION_RULES = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 200,
  },
  description: {
    required: true,
    minLength: 1,
    maxLength: 2000,
  },
  deadline: {
    required: true,
    format: 'ISO8601',
    minDate: 'now',
  },
  background: {
    required: true,
    minLength: 1,
    maxLength: 1000,
  },
  constraints: {
    required: false,
    maxLength: 1000,
  },
};
```

**主要メソッド**:
- `validateSubGoalGenerationRequest(request): ValidationResult`
- `validateTitle(title): ValidationError[]`
- `validateDescription(description): ValidationError[]`
- `validateDeadline(deadline): ValidationError[]`
- `sanitizeInput(input): string`

### 4. SubGoalQualityValidator

**責務**: 生成されたサブ目標の品質検証

**ファイル**: `packages/backend/src/services/subgoal-quality-validator.service.ts`

**品質基準**:
```typescript
const QUALITY_CRITERIA = {
  count: 8, // 必ず8個
  titleMaxLength: 30,
  descriptionMinLength: 50,
  descriptionMaxLength: 200,
  backgroundMaxLength: 100,
  allowDuplicateTitles: false,
};
```

**主要メソッド**:
- `validateQuality(subGoals): QualityValidationResult`
- `checkCount(subGoals): boolean`
- `checkTitleLength(subGoals): ValidationError[]`
- `checkDescriptionLength(subGoals): ValidationError[]`
- `checkDuplicates(subGoals): ValidationError[]`

### 5. DatabaseService

**責務**: データベース操作、トランザクション管理

**ファイル**: `packages/backend/src/services/database.service.ts`

**主要メソッド**:
- `createGoal(userId, goalData): Promise<string>`
- `updateGoal(goalId, goalData): Promise<void>`
- `deleteExistingSubGoals(goalId): Promise<void>`
- `createSubGoals(goalId, subGoals): Promise<SubGoal[]>`
- `executeInTransaction<T>(fn): Promise<T>`

## データモデル

### リクエストデータ

```typescript
interface SubGoalGenerationRequest {
  goalId?: string; // 既存の目標を更新する場合（オプション）
  title: string; // 目標タイトル（1-200文字）
  description: string; // 目標説明（1-2000文字）
  deadline: string; // 達成期限（ISO 8601形式、未来の日付）
  background: string; // 背景情報（1-1000文字）
  constraints?: string; // 制約事項（0-1000文字、オプション）
}
```

### レスポンスデータ

```typescript
interface SubGoalOutput {
  id: string; // UUID
  title: string; // サブ目標タイトル（30文字以内）
  description: string; // サブ目標説明（50-200文字）
  background: string; // 背景（100文字以内）
  position: number; // 位置（0-7）
  progress: number; // 進捗率（初期値: 0）
  createdAt: string; // 作成日時（ISO 8601形式）
  updatedAt: string; // 更新日時（ISO 8601形式）
}
```

## プロンプト設計

### システムメッセージ

```
あなたは目標達成の専門家です。ユーザーの目標を分析し、
それを達成するための8つの具体的なサブ目標を提案してください。

各サブ目標は以下の条件を満たす必要があります：
- 目標達成に直接貢献する
- 具体的で測定可能である
- 互いに重複しない
- バランスよく目標をカバーする
- 実行可能である
```

### ユーザーメッセージテンプレート

```
# 目標情報
タイトル: {title}
説明: {description}
達成期限: {deadline}

# 背景
{background}

# 制約事項
{constraints}

# ユーザー情報（利用可能な場合）
業種: {industry}
職種: {jobType}

# 指示
上記の目標を達成するために必要な8つのサブ目標を生成してください。

# 出力形式
以下のJSON形式で出力してください：
{
  "subGoals": [
    {
      "title": "サブ目標のタイトル（30文字以内）",
      "description": "サブ目標の詳細説明（50-200文字）",
      "background": "このサブ目標が必要な理由（100文字以内）",
      "position": 0
    },
    // ... 8個のサブ目標
  ]
}
```

## バリデーション設計

### 入力バリデーション

```typescript
// Zodスキーマ定義
const SubGoalGenerationRequestSchema = z.object({
  goalId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  deadline: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    { message: '達成期限は未来の日付である必要があります' }
  ),
  background: z.string().min(1).max(1000),
  constraints: z.string().max(1000).optional(),
});
```

### 出力バリデーション

```typescript
// サブ目標の品質チェック
function validateSubGoalQuality(subGoals: SubGoalOutput[]): void {
  // 個数チェック
  if (subGoals.length !== 8) {
    throw new QualityError(`サブ目標は8個である必要があります（現在: ${subGoals.length}個）`);
  }

  // 各サブ目標のチェック
  subGoals.forEach((subGoal, index) => {
    // タイトル長チェック
    if (subGoal.title.length > 30) {
      throw new QualityError(`サブ目標${index + 1}のタイトルが長すぎます（${subGoal.title.length}文字）`);
    }

    // 説明長チェック
    if (subGoal.description.length < 50 || subGoal.description.length > 200) {
      throw new QualityError(`サブ目標${index + 1}の説明が不適切な長さです（${subGoal.description.length}文字）`);
    }

    // 背景長チェック
    if (subGoal.background.length > 100) {
      throw new QualityError(`サブ目標${index + 1}の背景が長すぎます（${subGoal.background.length}文字）`);
    }
  });

  // 重複チェック
  const titles = subGoals.map(sg => sg.title);
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size !== titles.length) {
    console.warn('警告: サブ目標のタイトルに重複があります');
  }
}
```


## データベース設計

### トランザクション処理

```typescript
async function generateAndSaveSubGoals(
  userId: string,
  request: SubGoalGenerationRequest
): Promise<SubGoalGenerationResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. 目標の作成または更新
    let goalId: string;
    if (request.goalId) {
      // 既存の目標を更新
      await tx.goal.update({
        where: { id: request.goalId, userId },
        data: {
          title: request.title,
          description: request.description,
          deadline: new Date(request.deadline),
          background: request.background,
          constraints: request.constraints,
          updatedAt: new Date(),
        },
      });
      goalId = request.goalId;

      // 既存のサブ目標を削除
      await tx.subGoal.deleteMany({
        where: { goalId },
      });
    } else {
      // 新規目標を作成
      const goal = await tx.goal.create({
        data: {
          userId,
          title: request.title,
          description: request.description,
          deadline: new Date(request.deadline),
          background: request.background,
          constraints: request.constraints,
          status: 'ACTIVE',
          progress: 0,
        },
      });
      goalId = goal.id;
    }

    // 2. AI生成
    const bedrockService = new BedrockService();
    const generatedSubGoals = await bedrockService.generateSubGoals({
      title: request.title,
      description: request.description,
      deadline: request.deadline,
      background: request.background,
      constraints: request.constraints,
    });

    // 3. 品質検証
    validateSubGoalQuality(generatedSubGoals);

    // 4. サブ目標の保存
    const subGoals = await Promise.all(
      generatedSubGoals.map((subGoal) =>
        tx.subGoal.create({
          data: {
            goalId,
            title: subGoal.title,
            description: subGoal.description,
            background: subGoal.background,
            position: subGoal.position,
            progress: 0,
          },
        })
      )
    );

    return {
      goalId,
      subGoals: subGoals.map(mapSubGoalToOutput),
      metadata: {
        generatedAt: new Date(),
        tokensUsed: 1500, // 実際の値はBedrockレスポンスから取得
        estimatedCost: 0.000225,
      },
    };
  });
}
```

### データマッピング

```typescript
function mapSubGoalToOutput(subGoal: SubGoal): SubGoalOutput {
  return {
    id: subGoal.id,
    title: subGoal.title,
    description: subGoal.description || '',
    background: subGoal.background || '',
    position: subGoal.position,
    progress: subGoal.progress,
    createdAt: subGoal.createdAt.toISOString(),
    updatedAt: subGoal.updatedAt.toISOString(),
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
  // Cognito Authorizerが設定したクレームから取得
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
async function checkAuthorization(userId: string, goalId?: string): Promise<void> {
  if (goalId) {
    // 既存の目標を更新する場合、所有者チェック
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { userId: true },
    });

    if (!goal) {
      throw new NotFoundError('目標が見つかりません');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenError('この目標を編集する権限がありません');
    }
  }
}
```

### プロンプトインジェクション対策

```typescript
// 入力サニタイゼーション
function sanitizeInput(input: string): string {
  // 特殊文字のエスケープ
  let sanitized = input
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

// ユーザー単位のレート制限（DynamoDBで管理）
async function checkUserRateLimit(userId: string): Promise<void> {
  const key = `rate_limit:${userId}`;
  const limit = 10; // 10リクエスト/分
  const window = 60; // 60秒

  // DynamoDBまたはElastiCacheでカウント管理
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
const subGoalGenerationFunction = new lambda.Function(this, 'SubGoalGenerationFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'subgoal-generation.handler',
  code: lambda.Code.fromAsset('dist'),
  memorySize: 1024, // MB
  timeout: Duration.seconds(60), // 60秒（サブ目標生成は比較的高速）
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

async function getUserInfo(userId: string): Promise<UserInfo> {
  // キャッシュチェック
  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }

  // データベースから取得
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
```


## 監視とログ設計

### 構造化ログ

```typescript
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  requestId: string;
  userId?: string;
  action: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

function logInfo(requestId: string, action: string, metadata?: Record<string, any>): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    requestId,
    action,
    metadata,
  };
  console.log(JSON.stringify(logEntry));
}

function logError(requestId: string, action: string, error: Error): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    requestId,
    action,
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
}): Promise<void> {
  const cloudwatch = new CloudWatchClient({ region: 'ap-northeast-1' });

  await cloudwatch.send(
    new PutMetricDataCommand({
      Namespace: 'GoalMandala/AI',
      MetricData: [
        {
          MetricName: 'SubGoalGeneration',
          Value: metrics.success ? 1 : 0,
          Unit: 'Count',
          Timestamp: new Date(),
        },
        {
          MetricName: 'SubGoalGenerationDuration',
          Value: metrics.duration,
          Unit: 'Milliseconds',
          Timestamp: new Date(),
        },
        {
          MetricName: 'TokensUsed',
          Value: metrics.tokensUsed,
          Unit: 'Count',
          Timestamp: new Date(),
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
const errorAlarm = new cloudwatch.Alarm(this, 'SubGoalGenerationErrorAlarm', {
  metric: subGoalGenerationFunction.metricErrors({
    period: Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 2,
  alarmDescription: 'サブ目標生成のエラー率が閾値を超えました',
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

const durationAlarm = new cloudwatch.Alarm(this, 'SubGoalGenerationDurationAlarm', {
  metric: subGoalGenerationFunction.metricDuration({
    period: Duration.minutes(5),
    statistic: 'p95',
  }),
  threshold: 30000, // 30秒
  evaluationPeriods: 2,
  alarmDescription: 'サブ目標生成の処理時間が閾値を超えました',
});

// SNS通知設定
errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
durationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
```

## テスト戦略

### ユニットテスト

```typescript
// InputValidationServiceのテスト
describe('InputValidationService', () => {
  describe('validateSubGoalGenerationRequest', () => {
    it('有効なリクエストを検証できる', () => {
      const request = {
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: '2025-12-31T23:59:59Z',
        background: 'フロントエンド開発者として成長したい',
      };

      const result = validateRequest(request);
      expect(result.isValid).toBe(true);
    });

    it('タイトルが長すぎる場合エラーを返す', () => {
      const request = {
        title: 'a'.repeat(201),
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = validateRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'タイトルは200文字以内である必要があります',
      });
    });

    it('過去の日付をエラーとする', () => {
      const request = {
        title: 'タイトル',
        description: '説明',
        deadline: '2020-01-01T00:00:00Z',
        background: '背景',
      };

      const result = validateRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'deadline',
        message: '達成期限は未来の日付である必要があります',
      });
    });
  });
});

// SubGoalQualityValidatorのテスト
describe('SubGoalQualityValidator', () => {
  it('8個のサブ目標を検証できる', () => {
    const subGoals = Array.from({ length: 8 }, (_, i) => ({
      title: `サブ目標${i + 1}`,
      description: 'a'.repeat(100),
      background: '背景',
      position: i,
    }));

    expect(() => validateQuality(subGoals)).not.toThrow();
  });

  it('7個のサブ目標でエラーを投げる', () => {
    const subGoals = Array.from({ length: 7 }, (_, i) => ({
      title: `サブ目標${i + 1}`,
      description: 'a'.repeat(100),
      background: '背景',
      position: i,
    }));

    expect(() => validateQuality(subGoals)).toThrow(QualityError);
  });
});
```

### 統合テスト

```typescript
// エンドツーエンドテスト
describe('SubGoalGeneration API', () => {
  it('サブ目標を生成して保存できる', async () => {
    const request = {
      title: 'TypeScriptのエキスパートになる',
      description: '6ヶ月でTypeScriptの高度な機能を習得する',
      deadline: '2025-12-31T23:59:59Z',
      background: 'フロントエンド開発者として成長したい',
    };

    const response = await handler({
      httpMethod: 'POST',
      path: '/api/ai/generate/subgoals',
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
    expect(body.data.subGoals).toHaveLength(8);
    expect(body.data.goalId).toBeDefined();

    // データベースに保存されていることを確認
    const goal = await prisma.goal.findUnique({
      where: { id: body.data.goalId },
      include: { subGoals: true },
    });

    expect(goal).toBeDefined();
    expect(goal?.subGoals).toHaveLength(8);
  });

  it('不正なリクエストで400エラーを返す', async () => {
    const request = {
      title: '', // 空のタイトル
      description: '説明',
      deadline: '2025-12-31T23:59:59Z',
      background: '背景',
    };

    const response = await handler({
      httpMethod: 'POST',
      path: '/api/ai/generate/subgoals',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user-001',
      },
      body: JSON.stringify(request),
      requestContext: {
        requestId: 'test-request-002',
      },
    } as any);

    expect(response.statusCode).toBe(400);
    
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## デプロイ設計

### CDKスタック定義

```typescript
// Lambda関数の定義
const subGoalGenerationFunction = new lambda.Function(this, 'SubGoalGenerationFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'subgoal-generation.handler',
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
const subgoalsResource = generateResource.addResource('subgoals');

subgoalsResource.addMethod(
  'POST',
  new apigateway.LambdaIntegration(subGoalGenerationFunction),
  {
    authorizer: cognitoAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
  }
);
```

### IAM権限設定

```typescript
// Lambda実行ロール
const aiGenerationRole = new iam.Role(this, 'AIGenerationRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
  ],
});

// Bedrock権限
aiGenerationRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-micro-v1:0`,
    ],
  })
);

// Secrets Manager権限
aiGenerationRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [databaseSecret.secretArn],
  })
);

// CloudWatch権限
aiGenerationRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['cloudwatch:PutMetricData'],
    resources: ['*'],
  })
);
```

## ディレクトリ構造

```
packages/backend/src/
├── handlers/
│   └── subgoal-generation.ts        # Lambda ハンドラー
├── services/
│   ├── subgoal-generation.service.ts # ビジネスロジック
│   ├── input-validation.service.ts   # 入力検証
│   ├── subgoal-quality-validator.service.ts # 品質検証
│   └── database.service.ts           # データベース操作
├── types/
│   └── subgoal-generation.types.ts   # 型定義
└── __tests__/
    ├── unit/
    │   ├── input-validation.test.ts
    │   └── subgoal-quality-validator.test.ts
    └── integration/
        └── subgoal-generation.test.ts
```

## 制限事項と今後の拡張

### 現在の制限事項

1. 同時実行数: 10（初期設定）
2. タイムアウト: 60秒
3. 生成言語: 日本語のみ
4. モデル: Nova Microのみ
5. ユーザー情報の活用: 業種・職種のみ

### 今後の拡張予定

1. 複数モデル対応（Claude、GPT等）
2. 多言語対応
3. カスタムプロンプトテンプレート機能
4. 類似目標からの学習機能
5. ユーザーフィードバックによる品質改善
6. キャッシュ機能の追加（同じ目標の再生成を高速化）

## まとめ

この設計により、以下を実現します：

1. **高品質なサブ目標生成**: 適切なプロンプト設計と品質検証により一貫性のある結果を生成
2. **堅牢性**: 入力検証、エラーハンドリング、トランザクション管理により安定した動作を保証
3. **セキュリティ**: 認証・認可、プロンプトインジェクション対策、レート制限により安全性を確保
4. **パフォーマンス**: 適切なLambda設定、接続プール、キャッシュにより高速化
5. **監視性**: 構造化ログ、カスタムメトリクス、アラートにより運用を容易化
6. **テスト容易性**: モジュール化された設計により高いテストカバレッジを実現
7. **拡張性**: 将来の機能追加を考慮した柔軟な設計
