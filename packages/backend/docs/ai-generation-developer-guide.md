# AI生成機能 開発者ガイド

## 概要

このドキュメントは、AI生成機能（Amazon Bedrock Nova Micro統合）のアーキテクチャ、コンポーネント、拡張方法について説明します。

## アーキテクチャ

### システム構成図

```
┌─────────────────┐
│   API Gateway   │
│   (Cognito Auth)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      Lambda Function                │
│  ┌───────────────────────────────┐  │
│  │  Handler                      │  │
│  │  - リクエスト検証             │  │
│  │  - 認証チェック               │  │
│  │  - ルーティング               │  │
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
│  │  PromptTemplateManager        │  │
│  │  - テンプレート管理           │  │
│  │  - プロンプト構築             │  │
│  └───────────────────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  ResponseParser               │  │
│  │  - JSON抽出                   │  │
│  │  - バリデーション             │  │
│  │  - データ整形                 │  │
│  └───────────────────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  ErrorHandler                 │  │
│  │  - エラー分類                 │  │
│  │  - リトライ判定               │  │
│  │  - ログ記録                   │  │
│  └───────────────────────────────┘  │
└─────────────┬───────────────────────┘
              ▼
      ┌───────────────┐
      │   Bedrock     │
      │  Nova Micro   │
      └───────────────┘
```

### レイヤー構造

1. **ハンドラー層** (`src/handlers/ai-generation.ts`)
   - HTTPリクエストの受付
   - 認証・認可
   - ルーティング
   - レスポンス返却

2. **サービス層** (`src/services/`)
   - ビジネスロジック
   - Bedrock API呼び出し
   - データ変換

3. **ユーティリティ層** (`src/utils/`)
   - エラーハンドリング
   - リトライロジック
   - サニタイゼーション
   - ログ記録

## コンポーネント詳細

### 1. Lambda Handler

**ファイル**: `src/handlers/ai-generation.ts`

**責務**:

- リクエストの受付と検証
- 認証チェック
- 生成タイプに応じたルーティング
- レスポンスのフォーマット

**主要関数**:

```typescript
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult>;
```

**処理フロー**:

1. 認証情報の抽出と検証
2. リクエストボディのパースと検証
3. BedrockServiceの呼び出し
4. レスポンスのフォーマットと返却

### 2. BedrockService

**ファイル**: `src/services/bedrock.service.ts`

**責務**:

- Bedrock APIとの通信
- プロンプトの生成
- レスポンスの解析

**主要メソッド**:

```typescript
class BedrockService {
  async generateSubGoals(input: GoalInput): Promise<SubGoalOutput[]>;
  async generateActions(input: SubGoalInput): Promise<ActionOutput[]>;
  async generateTasks(input: ActionInput): Promise<TaskOutput[]>;
}
```

**実装例**:

```typescript
async generateSubGoals(input: GoalInput): Promise<SubGoalOutput[]> {
  // 1. プロンプトの生成
  const prompt = this.promptTemplate.buildSubGoalPrompt(input);

  // 2. Bedrock APIの呼び出し
  const response = await this.bedrockClient.invokeModel({
    modelId: 'amazon.nova-micro-v1:0',
    body: JSON.stringify({
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9,
      },
    }),
  });

  // 3. レスポンスの解析
  const subGoals = this.responseParser.parseSubGoals(response);

  return subGoals;
}
```

### 3. PromptTemplateManager

**ファイル**: `src/services/prompt-template.ts`

**責務**:

- プロンプトテンプレートの管理
- 入力データからプロンプトの構築
- 入力のサニタイゼーション

**テンプレート構造**:

```typescript
interface PromptTemplate {
  systemMessage: string;
  userMessageTemplate: string;
  outputFormat: string;
  constraints: string[];
}
```

**使用例**:

```typescript
const promptTemplate = new PromptTemplateManager();
const prompt = promptTemplate.buildSubGoalPrompt({
  title: 'TypeScriptのエキスパートになる',
  description: '6ヶ月でTypeScriptの高度な機能を習得する',
  deadline: '2025-12-31',
  background: '型安全性の高いコードを書けるようになりたい',
});
```

### 4. ResponseParser

**ファイル**: `src/services/response-parser.ts`

**責務**:

- BedrockレスポンスからのJSON抽出
- データのバリデーション
- データの整形

**主要メソッド**:

```typescript
class ResponseParser {
  parseSubGoals(response: string): SubGoalOutput[];
  parseActions(response: string): ActionOutput[];
  parseTasks(response: string): TaskOutput[];
  private extractJSON(response: string): object;
  private validateStructure(data: unknown, schema: Schema): boolean;
}
```

### 5. ErrorHandler

**ファイル**: `src/utils/error-handler.ts`

**責務**:

- エラーの分類
- リトライ可能性の判定
- エラーログの記録

**エラー分類**:

```typescript
enum ErrorType {
  THROTTLING = 'ThrottlingException',
  VALIDATION = 'ValidationError',
  PARSE = 'ParseError',
  TIMEOUT = 'TimeoutError',
  UNKNOWN = 'UnknownError',
}
```

**リトライロジック**:

```typescript
const RETRYABLE_ERRORS = [
  'ThrottlingException',
  'ServiceUnavailableException',
  'InternalServerException',
  'TimeoutError',
];

function isRetryable(error: Error): boolean {
  return RETRYABLE_ERRORS.includes(error.name);
}
```

## データフロー

### サブ目標生成のフロー

```
1. API Gateway
   ↓ (POST /ai/generate-subgoals)
2. Lambda Handler
   ↓ (リクエスト検証)
3. BedrockService.generateSubGoals()
   ↓ (プロンプト生成)
4. PromptTemplateManager.buildSubGoalPrompt()
   ↓ (プロンプト)
5. BedrockClient.invokeModel()
   ↓ (Bedrock API呼び出し)
6. Amazon Bedrock Nova Micro
   ↓ (AI生成レスポンス)
7. ResponseParser.parseSubGoals()
   ↓ (JSON抽出・バリデーション)
8. Lambda Handler
   ↓ (レスポンスフォーマット)
9. API Gateway
   ↓ (HTTPレスポンス)
10. クライアント
```

## 環境変数

| 変数名              | 説明                        | デフォルト値           | 必須 |
| ------------------- | --------------------------- | ---------------------- | ---- |
| NODE_ENV            | 実行環境                    | production             | ✓    |
| BEDROCK_MODEL_ID    | Bedrockモデル ID            | amazon.nova-micro-v1:0 | ✓    |
| BEDROCK_REGION      | Bedrockリージョン           | ap-northeast-1         | ✓    |
| BEDROCK_MAX_RETRIES | 最大リトライ回数            | 3                      | -    |
| BEDROCK_TIMEOUT_MS  | タイムアウト（ミリ秒）      | 300000                 | -    |
| DATABASE_SECRET_ARN | データベースシークレットARN | -                      | ✓    |
| APP_REGION          | アプリケーションリージョン  | ap-northeast-1         | ✓    |
| LOG_LEVEL           | ログレベル                  | info                   | -    |

## 拡張方法

### 新しい生成タイプの追加

1. **型定義の追加** (`src/types/ai-generation.types.ts`)

```typescript
// 新しい入力型
export interface NewInput {
  field1: string;
  field2: string;
}

// 新しい出力型
export interface NewOutput {
  result1: string;
  result2: number;
}

// GenerateRequestの更新
export type GenerateRequest = {
  type: 'subgoal' | 'action' | 'task' | 'new-type';
  userId: string;
  input: GoalInput | SubGoalInput | ActionInput | NewInput;
};
```

2. **プロンプトテンプレートの追加** (`src/services/prompt-template.ts`)

```typescript
class PromptTemplateManager {
  buildNewTypePrompt(input: NewInput): string {
    const template = this.templates.NEW_TYPE;
    return this.replaceVariables(template.userMessageTemplate, input);
  }

  private templates = {
    // ... 既存のテンプレート
    NEW_TYPE: {
      systemMessage: 'あなたは...',
      userMessageTemplate: '...',
      outputFormat: '...',
      constraints: ['...'],
    },
  };
}
```

3. **レスポンスパーサーの追加** (`src/services/response-parser.ts`)

```typescript
class ResponseParser {
  parseNewType(response: string): NewOutput[] {
    const json = this.extractJSON(response);
    // バリデーションと整形
    return json.results;
  }
}
```

4. **BedrockServiceメソッドの追加** (`src/services/bedrock.service.ts`)

```typescript
class BedrockService {
  async generateNewType(input: NewInput): Promise<NewOutput[]> {
    const prompt = this.promptTemplate.buildNewTypePrompt(input);
    const response = await this.invokeModel(prompt);
    return this.responseParser.parseNewType(response);
  }
}
```

5. **ハンドラーのルーティング更新** (`src/handlers/ai-generation.ts`)

```typescript
switch (request.type) {
  case 'subgoal':
    data = await bedrockService.generateSubGoals(request.input as GoalInput);
    break;
  case 'action':
    data = await bedrockService.generateActions(request.input as SubGoalInput);
    break;
  case 'task':
    data = await bedrockService.generateTasks(request.input as ActionInput);
    break;
  case 'new-type':
    data = await bedrockService.generateNewType(request.input as NewInput);
    break;
  default:
    throw new Error(`不正な生成タイプ: ${request.type}`);
}
```

6. **テストの追加**

```typescript
// src/handlers/ai-generation.test.ts
describe('新しい生成タイプ', () => {
  it('正常に処理できる', async () => {
    const mockOutput = [{ result1: 'test', result2: 123 }];
    jest
      .spyOn(BedrockService.prototype, 'generateNewType')
      .mockResolvedValue(mockOutput);

    const event = createTestEvent({
      type: 'new-type',
      input: { field1: 'value1', field2: 'value2' },
      userId: 'test-user',
    });

    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toEqual(mockOutput);
  });
});
```

### プロンプトのカスタマイズ

プロンプトをカスタマイズする場合は、`src/services/prompt-template.ts`を編集します：

```typescript
private templates = {
  SUBGOAL_GENERATION: {
    systemMessage: `
あなたは目標達成の専門家です。
ユーザーの目標を分析し、それを達成するための8つの具体的なサブ目標を提案してください。

【重要な指針】
- 各サブ目標は目標達成に直接貢献すること
- 具体的で測定可能であること
- 互いに重複しないこと
- バランスよく目標をカバーすること
    `,
    userMessageTemplate: `
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
    `,
    outputFormat: `
{
  "subGoals": [
    {
      "title": "サブ目標のタイトル（30文字以内）",
      "description": "サブ目標の詳細説明（200文字以内）",
      "background": "このサブ目標が必要な理由（100文字以内）",
      "position": 0
    }
  ]
}
    `,
    constraints: [
      '必ず8個のサブ目標を生成すること',
      'タイトルは30文字以内',
      '説明は200文字以内',
      '背景は100文字以内',
    ],
  },
};
```

### モデルパラメータの調整

Bedrockモデルのパラメータを調整する場合は、`src/config/bedrock.config.ts`を編集します：

```typescript
export const BEDROCK_CONFIG = {
  modelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0',
  region: process.env.BEDROCK_REGION || 'ap-northeast-1',
  inferenceConfig: {
    temperature: 0.7, // 0.0-1.0（高いほど創造的）
    maxTokens: 2000, // 最大出力トークン数
    topP: 0.9, // 0.0-1.0（高いほど多様）
  },
  retryConfig: {
    maxRetries: parseInt(process.env.BEDROCK_MAX_RETRIES || '3'),
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
};
```

## テスト

### ユニットテストの実行

```bash
# 全てのユニットテストを実行
npm test

# 特定のファイルのテストを実行
npm test -- ai-generation.test.ts

# カバレッジ付きで実行
npm test -- --coverage
```

### 統合テストの実行

```bash
# 統合テストを実行（モック使用）
npm test -- ai-generation.integration.test.ts

# 実際のBedrock APIを使用した統合テスト
ENABLE_BEDROCK_INTEGRATION_TEST=true npm test -- ai-generation.integration.test.ts
```

### テストの追加

新しい機能を追加する場合は、必ずテストも追加してください：

1. **ユニットテスト**: 各コンポーネントの単体テスト
2. **統合テスト**: エンドツーエンドのフローテスト
3. **エラーシナリオテスト**: エラーハンドリングのテスト

## デバッグ

### ローカルでのデバッグ

```bash
# ローカルでLambda関数を実行
sam local invoke ApiFunction -e events/ai-generation-event.json

# ローカルでAPI Gatewayをエミュレート
sam local start-api
```

### ログの確認

```typescript
// 構造化ログの出力
console.log(
  JSON.stringify({
    level: 'INFO',
    message: 'AI生成開始',
    requestId: event.requestContext.requestId,
    userId: authenticatedUserId,
    type: request.type,
  })
);
```

### X-Rayトレーシング

Lambda関数はX-Rayトレーシングが有効化されているため、AWS X-Rayコンソールでトレースを確認できます。

## ベストプラクティス

### 1. エラーハンドリング

```typescript
try {
  const result = await bedrockService.generateSubGoals(input);
  return formatSuccessResponse(result);
} catch (error) {
  if (error instanceof ValidationError) {
    return formatErrorResponse(error, 400);
  } else if (error instanceof ThrottlingError) {
    return formatErrorResponse(error, 429);
  } else {
    return formatErrorResponse(error, 500);
  }
}
```

### 2. リトライロジック

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryable(error)) {
        throw error;
      }

      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### 3. 入力のサニタイゼーション

```typescript
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // HTMLタグの除去
    .replace(/\{|\}/g, '') // 中括弧の除去
    .trim()
    .substring(0, MAX_INPUT_LENGTH);
}
```

### 4. プロンプトインジェクション対策

```typescript
const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s*:/i,
  /assistant\s*:/i,
];

function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(input));
}
```

## パフォーマンス最適化

### 1. クライアントの再利用

```typescript
// Lambda実行環境で再利用されるシングルトンインスタンス
let bedrockServiceInstance: BedrockService | null = null;

function getBedrockServiceInstance(): BedrockService {
  if (!bedrockServiceInstance) {
    bedrockServiceInstance = new BedrockService();
  }
  return bedrockServiceInstance;
}
```

### 2. プロンプトの最適化

- 不要なトークンを削減
- 簡潔で明確な指示
- 適切な例の提供

### 3. Lambda設定の最適化

- メモリサイズ: 1024MB
- タイムアウト: 15分
- 予約済み同時実行数: 10

## セキュリティ

### 1. IAM権限の最小化

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-micro-v1:0"
      ]
    }
  ]
}
```

### 2. 入力検証

- 全ての入力を検証
- 文字数制限の適用
- 型チェックの実施

### 3. ログのサニタイゼーション

```typescript
function sanitizeLogData(data: any): any {
  const sanitized = { ...data };

  // 機密情報の除外
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.apiKey;

  return sanitized;
}
```

## 参考資料

- [API仕様書](./ai-generation-api-specification.md)
- [運用ガイド](./ai-generation-operations-guide.md)
- [Amazon Bedrock ドキュメント](https://docs.aws.amazon.com/bedrock/)
- [AWS Lambda ベストプラクティス](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [TypeScript ドキュメント](https://www.typescriptlang.org/docs/)
