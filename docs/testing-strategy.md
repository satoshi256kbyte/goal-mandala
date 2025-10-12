# テスト戦略

## 概要

目標管理曼荼羅システムでは、品質保証とメンテナンス性を確保するため、3層のテスト戦略を採用しています。

## テスト戦略の全体像

```
E2Eテスト（少数）
├── 主要ユーザーフローのテスト
├── 実際のAWS環境またはSAM Local
└── 将来実装予定

統合テスト（中程度）
├── API + データベースの結合テスト
├── インメモリデータベース使用
└── 将来実装予定

ユニットテスト（多数）
├── Jest + React Testing Library
├── モックを使用
└── データベース接続不要
```

## 1. ユニットテスト

### 概要
- **目的**: 個別のコンポーネント・サービス・関数の動作検証
- **実行環境**: モック使用、データベース接続不要
- **実行速度**: 高速（数秒〜数十秒）
- **カバレッジ目標**: 80%以上

### 実行方法

```bash
# 全ユニットテストの実行
cd packages/backend
pnpm test

# 特定のサービスのテスト
pnpm test -- --testPathPattern="services.*test.ts"

# カバレッジ付きテスト
pnpm test:coverage

# ウォッチモード
pnpm test -- --watch
```

### テスト対象

#### バックエンド
- **サービス層**: ビジネスロジックの検証
- **バリデーション**: 入力検証ロジック
- **ユーティリティ**: 共通関数の動作確認
- **エラーハンドリング**: 例外処理の検証

#### フロントエンド
- **コンポーネント**: UIコンポーネントのレンダリング
- **カスタムフック**: 状態管理ロジック
- **ユーティリティ**: 共通関数の動作確認

### モック戦略

```typescript
// Prismaクライアントのモック例
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// AWS SDKのモック例
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
}));
```

## 2. 統合テスト

### 概要
- **目的**: システム間の連携動作検証
- **実行環境**: インメモリデータベース
- **実行速度**: 中程度（数十秒〜数分）
- **前提条件**: なし（将来実装予定）

### 実行方法（将来実装予定）

```bash
# 統合テストの実行
cd packages/backend
pnpm test -- --testPathPattern="integration.*test.ts"

# 現在はユニットテストで代替
pnpm test
```

### テスト対象

- **API + データベース**: エンドツーエンドのデータフロー
- **認証フロー**: JWT認証の動作確認
- **トランザクション**: データ整合性の検証
- **外部サービス統合**: AWS SDKとの連携

### 現在の制限事項

**統合テスト未実装**:
統合テストは将来実装予定で、現在はユニットテストで代替しています。

**対処法**:
1. **ユニットテストのみ実行**（推奨）
2. **インメモリデータベースでの統合テスト**（将来実装）
3. **E2Eテストでの包括的検証**（将来実装）

## 3. E2Eテスト

### 概要
- **目的**: ユーザー視点での動作検証
- **実行環境**: 実際のブラウザ + API環境
- **実行速度**: 低速（数分〜数十分）
- **ツール**: Playwright（予定）

### 実行方法（将来実装）

```bash
# SAM Local環境の起動
cd packages/backend
pnpm dev &

# E2Eテストの実行
pnpm test:e2e

# 特定のフローのテスト
pnpm test:e2e -- --grep "マンダラ作成フロー"
```

### テスト対象（予定）

- **認証フロー**: ログイン〜ログアウト
- **マンダラ作成フロー**: 目標入力〜マンダラ完成
- **AI生成フロー**: サブ目標・アクション・タスク生成
- **タスク管理フロー**: タスク状態更新〜進捗反映

## テスト環境の管理

### 環境変数

テスト実行時は以下の環境変数が自動設定されます：

```env
NODE_ENV=test
DATABASE_URL=file:./test.db
JWT_SECRET=test-jwt-secret-key-for-testing-32chars
ENABLE_MOCK_AUTH=true
LOG_LEVEL=ERROR
```

### テストデータ管理

#### ユニットテスト
- **モックデータ**: テストファイル内で定義
- **フィクスチャ**: `__tests__/fixtures/`ディレクトリ
- **ヘルパー関数**: `__tests__/helpers/`ディレクトリ

#### 統合テスト（将来実装）
- **テストデータベース**: インメモリSQLite
- **データ初期化**: テスト開始時に自動作成
- **クリーンアップ**: テスト終了時に自動削除

### ファイル構成

```
packages/backend/
├── src/
│   ├── services/
│   │   ├── __tests__/              # ユニットテスト
│   │   │   ├── *.service.test.ts
│   │   │   ├── fixtures/           # テストデータ
│   │   │   └── helpers/            # テストヘルパー
│   │   └── *.service.ts
│   ├── handlers/
│   │   ├── __tests__/
│   │   │   └── *.test.ts
│   │   └── *.ts
│   └── test-setup.ts               # Jest設定
├── tests/
│   ├── integration/                # 統合テスト
│   │   ├── *.test.ts
│   │   └── setup.ts
│   └── e2e/                       # E2Eテスト（将来）
│       └── *.test.ts
└── jest.config.js                 # Jest設定
```

## CI/CDでのテスト実行

### GitHub Actions

```yaml
# プルリクエスト時
- name: Run Unit Tests
  run: pnpm test

# mainブランチ時（将来実装）
- name: Run Integration Tests
  run: pnpm test -- --testPathPattern="integration.*test.ts"
```

### ローカルCI（act）

```bash
# プルリクエストワークフローのテスト
pnpm run act:pr-check

# mainブランチワークフローのテスト
pnpm run act:main-ci
```

## 品質ゲート

### カバレッジ要件
- **ユニットテスト**: 80%以上
- **統合テスト**: 主要APIエンドポイント100%
- **E2Eテスト**: 主要ユーザーフロー100%

### パフォーマンス要件
- **API応答時間**: 95%ile < 2秒
- **ページロード時間**: < 3秒
- **AI生成時間**: < 30秒

### 品質チェック
- **全テスト実行**: `pnpm test:all`
- **静的解析**: `pnpm lint`
- **型チェック**: `pnpm type-check`
- **セキュリティスキャン**: `pnpm audit`

## トラブルシューティング

### よくある問題

#### テストタイムアウト
```bash
# Jest設定でタイムアウトを延長
jest.setTimeout(30000); // 30秒
```

#### データベース接続エラー（将来実装時）
```bash
# インメモリデータベースの初期化確認
pnpm test -- --verbose

# テストファイルの個別実行
pnpm test -- --testNamePattern="特定のテスト名"
```

### デバッグ方法

#### テストデバッグ
```bash
# 特定のテストのみ実行
pnpm test -- --testNamePattern="特定のテスト名"

# デバッグモード
node --inspect-brk node_modules/.bin/jest --runInBand

# ログレベル変更
LOG_LEVEL=DEBUG pnpm test
```

## 今後の改善計画

### 短期（1-2ヶ月）
- [ ] 統合テストの実装（インメモリデータベース使用）
- [ ] テストカバレッジの向上
- [ ] テストデータ管理の改善

### 中期（3-6ヶ月）
- [ ] E2Eテストの実装
- [ ] パフォーマンステストの追加
- [ ] ビジュアルリグレッションテスト

### 長期（6ヶ月以上）
- [ ] テスト自動化の拡張
- [ ] カオスエンジニアリング
- [ ] 本番環境でのカナリアテスト

## 参考資料

- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [Docker Compose公式ドキュメント](https://docs.docker.com/compose/)
