# 設計書

## 概要

Amazon Bedrock Nova Microモデルを使用したAI生成機能の基盤となるLambda関数の設計を定義します。この関数は、目標からサブ目標、サブ目標からアクション、アクションからタスクを生成するための汎用的なAI生成エンジンとして機能します。

## アーキテクチャ

### システム構成図

```
┌─────────────┐
│   API GW    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│      Lambda Function                │
│  ┌───────────────────────────────┐  │
│  │  Handler                      │  │
│  │  - リクエスト検証             │  │
│  │  - 認証チェック               │  │
│  └───────────┬───────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  BedrockService               │  │
│  │  - プロンプト生成             │  │
│  │  - API呼び出し                │  │
│  │  - レスポンス解析             │  │
│  └───────────┬───────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  ValidationService            │  │
│  │  - 生成結果検証               │  │
│  │  - データ整形                 │  │
│  └───────────────────────────────┘  │
└─────────────┬───────────────────────┘
              ▼
      ┌───────────────┐
      │   Bedrock     │
      │  Nova Micro   │
      └───────────────┘
```

### レイヤー構造


1. **ハンドラー層**: リクエスト/レスポンス処理、認証、エラーハンドリング
2. **サービス層**: ビジネスロジック、Bedrock API呼び出し
3. **ユーティリティ層**: プロンプト生成、JSON解析、バリデーション

## コンポーネント設計

### 1. Lambda Handler

**責務**: HTTPリクエストの受付、認証、ルーティング、レスポンス返却

**インターフェース**:
```typescript
interface GenerateRequest {
  type: 'subgoal' | 'action' | 'task';
  input: GoalInput | SubGoalInput | ActionInput;
  userId: string;
}

interface GenerateResponse {
  success: boolean;
  data?: GeneratedItem[];
  error?: ErrorDetail;
}
```

**主要メソッド**:
- `handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>`
- `validateRequest(body: unknown): GenerateRequest`
- `formatResponse(result: GenerateResponse): APIGatewayProxyResult`

### 2. BedrockService

**責務**: Bedrock APIとの通信、プロンプト生成、レスポンス解析

**インターフェース**:
```typescript
interface BedrockService {
  generateSubGoals(goal: GoalInput): Promise<SubGoal[]>;
  generateActions(subGoal: SubGoalInput): Promise<Action[]>;
  generateTasks(action: ActionInput): Promise<Task[]>;
}
```


**主要メソッド**:
- `invokeModel(prompt: string, config: ModelConfig): Promise<string>`
- `buildPrompt(type: GenerationType, input: any): string`
- `parseResponse(response: string): any[]`
- `retryWithBackoff(fn: Function, maxRetries: number): Promise<any>`

### 3. PromptTemplateManager

**責務**: プロンプトテンプレートの管理と生成

**テンプレート構造**:
```typescript
interface PromptTemplate {
  systemMessage: string;
  userMessageTemplate: string;
  outputFormat: string;
  constraints: string[];
}
```

**テンプレート種類**:
- `SUBGOAL_GENERATION`: 目標→サブ目標（8個）
- `ACTION_GENERATION`: サブ目標→アクション（8個）
- `TASK_GENERATION`: アクション→タスク（N個）

### 4. ResponseParser

**責務**: Bedrockレスポンスの解析と検証

**主要メソッド**:
- `extractJSON(response: string): object`
- `validateStructure(data: unknown, schema: Schema): boolean`
- `sanitizeOutput(data: any): any`

### 5. ErrorHandler

**責務**: エラー分類、リトライ判定、ログ記録

**エラー分類**:
- `ThrottlingError`: スロットリングエラー（リトライ可能）
- `ValidationError`: 入力検証エラー（リトライ不可）
- `ParseError`: レスポンス解析エラー（リトライ不可）
- `TimeoutError`: タイムアウトエラー（リトライ可能）
- `UnknownError`: その他のエラー（リトライ可能）


## データモデル

### 入力データ

```typescript
// 目標入力（サブ目標生成用）
interface GoalInput {
  title: string;
  description: string;
  deadline: string;
  background: string;
  constraints?: string;
}

// サブ目標入力（アクション生成用）
interface SubGoalInput {
  goalTitle: string;
  goalDescription: string;
  subGoalTitle: string;
  subGoalDescription: string;
  background: string;
  constraints?: string;
}

// アクション入力（タスク生成用）
interface ActionInput {
  actionTitle: string;
  actionDescription: string;
  actionType: 'execution' | 'habit';
  background: string;
  constraints?: string;
}
```

### 出力データ

```typescript
// サブ目標出力
interface SubGoal {
  title: string;
  description: string;
  background: string;
  position: number; // 0-7
}

// アクション出力
interface Action {
  title: string;
  description: string;
  type: 'execution' | 'habit';
  background: string;
  position: number; // 0-7
}

// タスク出力
interface Task {
  title: string;
  description: string;
  type: 'execution' | 'habit';
  estimatedMinutes: number;
}
```


## プロンプト設計

### サブ目標生成プロンプト

**システムメッセージ**:
```
あなたは目標達成の専門家です。ユーザーの目標を分析し、
それを達成するための8つの具体的なサブ目標を提案してください。
```

**ユーザーメッセージテンプレート**:
```
# 目標
タイトル: {title}
説明: {description}
達成期限: {deadline}

# 背景
{background}

# 制約事項
{constraints}

# 指示
上記の目標を達成するために必要な8つのサブ目標を生成してください。
各サブ目標は以下の条件を満たす必要があります：
- 目標達成に直接貢献する
- 具体的で測定可能である
- 互いに重複しない
- バランスよく目標をカバーする

# 出力形式
以下のJSON形式で出力してください：
{
  "subGoals": [
    {
      "title": "サブ目標のタイトル（30文字以内）",
      "description": "サブ目標の詳細説明（200文字以内）",
      "background": "このサブ目標が必要な理由（100文字以内）",
      "position": 0
    },
    // ... 8個のサブ目標
  ]
}
```

### アクション生成プロンプト

**システムメッセージ**:
```
あなたは行動計画の専門家です。サブ目標を分析し、
それを達成するための8つの具体的なアクションを提案してください。
```


**ユーザーメッセージテンプレート**:
```
# 目標コンテキスト
目標: {goalTitle}
目標説明: {goalDescription}

# サブ目標
タイトル: {subGoalTitle}
説明: {subGoalDescription}

# 背景
{background}

# 制約事項
{constraints}

# 指示
上記のサブ目標を達成するために必要な8つのアクションを生成してください。
各アクションは以下の条件を満たす必要があります：
- サブ目標達成に直接貢献する
- 実行可能で具体的である
- 「実行アクション」または「習慣アクション」のいずれかに分類される
- 互いに重複しない

アクションタイプの定義：
- 実行アクション: 一度実行すれば完了するもの（例：プログラムを書く、登壇する）
- 習慣アクション: 継続的に行う必要があるもの（例：読書、ランニング）

# 出力形式
以下のJSON形式で出力してください：
{
  "actions": [
    {
      "title": "アクションのタイトル（30文字以内）",
      "description": "アクションの詳細説明（200文字以内）",
      "type": "execution" または "habit",
      "background": "このアクションが必要な理由（100文字以内）",
      "position": 0
    },
    // ... 8個のアクション
  ]
}
```

### タスク生成プロンプト

**システムメッセージ**:
```
あなたはタスク分解の専門家です。アクションを分析し、
それを実行するための具体的なタスクに分解してください。
```


**ユーザーメッセージテンプレート**:
```
# アクション
タイトル: {actionTitle}
説明: {actionDescription}
タイプ: {actionType}

# 背景
{background}

# 制約事項
{constraints}

# 指示
上記のアクションを実行するための具体的なタスクに分解してください。
各タスクは以下の条件を満たす必要があります：
- 所要時間が30分〜60分程度である
- 具体的で実行可能である
- アクションタイプ（実行/習慣）に対応している
- 順序立てて実行できる

タスク数の目安：
- 実行アクション: 3〜10個のタスク
- 習慣アクション: 1〜3個の繰り返しタスク

# 出力形式
以下のJSON形式で出力してください：
{
  "tasks": [
    {
      "title": "タスクのタイトル（50文字以内）",
      "description": "タスクの詳細説明（200文字以内）",
      "type": "execution" または "habit",
      "estimatedMinutes": 30
    },
    // ... 必要な数のタスク
  ]
}
```

## Bedrock API設定

### モデル設定

```typescript
const MODEL_CONFIG = {
  modelId: 'amazon.nova-micro-v1:0',
  region: 'ap-northeast-1',
  inferenceConfig: {
    temperature: 0.7,      // 創造性と一貫性のバランス
    maxTokens: 2000,       // 最大出力トークン数
    topP: 0.9,             // 多様性の制御
  },
};
```


### リクエスト形式

```typescript
const request = {
  modelId: MODEL_CONFIG.modelId,
  contentType: 'application/json',
  accept: 'application/json',
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: [
          {
            text: promptText,
          },
        ],
      },
    ],
    system: [
      {
        text: systemMessage,
      },
    ],
    inferenceConfig: MODEL_CONFIG.inferenceConfig,
  }),
};
```

## エラーハンドリング戦略

### リトライロジック

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,        // 1秒
  maxDelay: 10000,        // 10秒
  backoffMultiplier: 2,   // 指数バックオフ
};

// リトライ可能なエラー
const RETRYABLE_ERRORS = [
  'ThrottlingException',
  'ServiceUnavailableException',
  'InternalServerException',
  'TimeoutError',
];
```

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}
```


## セキュリティ設計

### プロンプトインジェクション対策

```typescript
function sanitizeInput(input: string): string {
  // 特殊文字のエスケープ
  const escaped = input
    .replace(/[<>]/g, '')
    .replace(/\{|\}/g, '')
    .trim();
  
  // 長さ制限
  return escaped.substring(0, MAX_INPUT_LENGTH);
}

// プロンプトインジェクション検出パターン
const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s*:/i,
  /assistant\s*:/i,
];
```

### IAM権限設計

```typescript
// Lambda実行ロールに必要な権限
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-micro-v1:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## パフォーマンス最適化

### Lambda設定

```typescript
const LAMBDA_CONFIG = {
  memorySize: 1024,        // MB
  timeout: 300,            // 5分（AI生成に十分な時間）
  reservedConcurrency: 10, // 同時実行数制限
};
```

### クライアント再利用

```typescript
// 関数スコープでクライアントを初期化（コールドスタート時のみ）
let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: MODEL_CONFIG.region,
    });
  }
  return bedrockClient;
}
```


## 監視とログ

### 構造化ログ形式

```typescript
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  requestId: string;
  userId?: string;
  action: string;
  duration?: number;
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, any>;
}
```

### CloudWatchメトリクス

```typescript
// カスタムメトリクス
const METRICS = {
  GenerationSuccess: 'AI/Generation/Success',
  GenerationFailure: 'AI/Generation/Failure',
  GenerationDuration: 'AI/Generation/Duration',
  TokensUsed: 'AI/Tokens/Used',
  Cost: 'AI/Cost/Estimated',
};
```

## テスト戦略

### ユニットテスト

- BedrockServiceのモック化
- プロンプト生成ロジックのテスト
- レスポンス解析ロジックのテスト
- エラーハンドリングのテスト
- バリデーションロジックのテスト

### 統合テスト

- 実際のBedrock APIを使用したエンドツーエンドテスト
- 各生成タイプ（サブ目標、アクション、タスク）のテスト
- エラーシナリオのテスト
- パフォーマンステスト

### テストデータ

```typescript
// サンプル目標入力
const SAMPLE_GOAL: GoalInput = {
  title: 'TypeScriptのエキスパートになる',
  description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
  deadline: '2025-12-31',
  background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
  constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
};
```


## ディレクトリ構造

```
packages/backend/src/
├── handlers/
│   └── ai-generation.ts          # Lambda ハンドラー
├── services/
│   ├── bedrock.service.ts        # Bedrock API呼び出し
│   ├── prompt-template.service.ts # プロンプト生成
│   └── validation.service.ts     # レスポンス検証
├── utils/
│   ├── error-handler.ts          # エラーハンドリング
│   ├── logger.ts                 # ログ出力
│   └── retry.ts                  # リトライロジック
├── types/
│   ├── ai-generation.types.ts    # 型定義
│   └── bedrock.types.ts          # Bedrock関連型
└── config/
    └── bedrock.config.ts         # Bedrock設定
```

## 依存関係

### NPMパッケージ

```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.x.x",
    "@aws-sdk/client-cloudwatch": "^3.x.x",
    "zod": "^3.x.x"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.x.x",
    "aws-sdk-client-mock": "^3.x.x"
  }
}
```

## デプロイ設計

### CDKスタック定義

```typescript
// Lambda関数の定義
const aiGenerationFunction = new lambda.Function(this, 'AIGenerationFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'ai-generation.handler',
  code: lambda.Code.fromAsset('dist'),
  memorySize: 1024,
  timeout: Duration.minutes(5),
  environment: {
    BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
    BEDROCK_REGION: 'ap-northeast-1',
    LOG_LEVEL: 'INFO',
  },
  role: aiGenerationRole,
});

// API Gateway統合
const api = new apigateway.RestApi(this, 'AIGenerationAPI');
const aiResource = api.root.addResource('ai');
const generateResource = aiResource.addResource('generate');
generateResource.addMethod('POST', new apigateway.LambdaIntegration(aiGenerationFunction), {
  authorizer: cognitoAuthorizer,
});
```


## 運用設計

### アラート設定

```typescript
// エラー率アラーム
const errorAlarm = new cloudwatch.Alarm(this, 'AIGenerationErrorAlarm', {
  metric: aiGenerationFunction.metricErrors(),
  threshold: 5,
  evaluationPeriods: 2,
  alarmDescription: 'AI生成エラーが閾値を超えました',
});

// レスポンス時間アラーム
const durationAlarm = new cloudwatch.Alarm(this, 'AIGenerationDurationAlarm', {
  metric: aiGenerationFunction.metricDuration(),
  threshold: 30000, // 30秒
  evaluationPeriods: 2,
  alarmDescription: 'AI生成の処理時間が閾値を超えました',
});
```

### コスト監視

```typescript
// 推定コスト計算
function estimateCost(tokensUsed: number): number {
  const COST_PER_1K_TOKENS = 0.00015; // Nova Microの料金
  return (tokensUsed / 1000) * COST_PER_1K_TOKENS;
}

// 月次コスト上限チェック
const MONTHLY_BUDGET = 100; // USD
```

## 制限事項と今後の拡張

### 現在の制限事項

1. 同時実行数: 10（初期設定）
2. タイムアウト: 5分
3. 生成言語: 日本語のみ
4. モデル: Nova Microのみ

### 今後の拡張予定

1. 複数モデル対応（Claude、GPT等）
2. ストリーミングレスポンス対応
3. キャッシュ機能の追加
4. 多言語対応
5. カスタムプロンプトテンプレート機能

## まとめ

この設計により、以下を実現します：

1. **高品質なAI生成**: 適切なプロンプト設計により一貫性のある結果を生成
2. **堅牢性**: エラーハンドリングとリトライ機能により安定した動作を保証
3. **セキュリティ**: プロンプトインジェクション対策と最小権限の原則を適用
4. **パフォーマンス**: クライアント再利用と適切なLambda設定により高速化
5. **監視性**: 構造化ログとメトリクスにより運用を容易化
6. **テスト容易性**: モック可能な設計により高いテストカバレッジを実現
