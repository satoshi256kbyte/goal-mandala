# 統合テスト実装ドキュメント

## 概要

このドキュメントでは、モノレポ設定の動作確認を行う統合テストの実装について説明します。

## 実装されたテストスクリプト

### 1. シンプル版統合テスト (`tools/scripts/integration-test-simple.js`)

基本的な設定ファイルの整合性とワークスペース構成を確認する軽量なテストです。

**主要機能:**

- 前提条件チェック（Node.js、pnpm バージョン）
- 設定ファイル存在確認
- ワークスペース構成確認
- 依存関係構成確認
- Turbo設定確認
- バージョン整合性確認

### 2. 完全版統合テスト (`tools/scripts/integration-test-full.js`)

実際のビルド・テスト実行を含む包括的な検証を行うテストです。

**主要機能:**

- 依存関係インストール
- 個別パッケージのビルド・テスト実行
- パフォーマンス測定
- エラーハンドリング

### 3. 改良版統合テスト (`tools/scripts/integration-test.js`)

要件に基づいた体系的なテストを実行する最新版です。

## 改良版統合テストの詳細

### テスト対象要件

- **要件 1.1**: `pnpm install` の動作確認
- **要件 1.2**: `pnpm build` の動作確認  
- **要件 1.3**: `pnpm test` の動作確認
- **要件 1.4**: `pnpm lint` の動作確認
- **要件 2.1**: パッケージ間依存関係の正常動作検証
- **要件 2.2**: パッケージ間依存関係の正常動作検証

### テストカテゴリ

#### 1. 基本機能テスト

- 依存関係インストール
- ワークスペース構成確認
- 型チェック
- リント
- ビルド
- ユニットテスト

#### 2. 高度な機能テスト

- パッケージ間依存関係
- ビルド成果物検証
- Turbo設定
- 設定ファイル詳細検証

#### 3. パフォーマンステスト

- ビルド時間測定
- 個別パッケージのパフォーマンス測定

### 実行方法

```bash
# 改良版統合テスト実行
node tools/scripts/integration-test.js

# シンプル版実行
node tools/scripts/integration-test-simple.js

# 完全版実行
node tools/scripts/integration-test-full.js

# package.json スクリプト経由
pnpm run test:integration        # シンプル版
pnpm run test:integration:full   # 完全版
pnpm run test:integration:advanced # 改良版
```

### テストレポート

テスト実行後、`integration-test-report.json` ファイルが生成されます。

**レポート内容:**

- テスト結果サマリー
- 個別テスト結果詳細
- 実行時間
- 環境情報
- エラー詳細（失敗時）

### 成功基準

- 全11テストが成功
- 成功率100%
- 主要コマンド（install, build, test, lint）が正常動作
- パッケージ間依存関係が正常動作

## 実装された機能

### 1. モノレポ設定検証

- **pnpm workspace設定**: `pnpm-workspace.yaml` の正確性
- **turbo設定**: `turbo.json` のパイプライン設定
- **TypeScript設定**: 各パッケージの `tsconfig.json` 設定
- **パッケージ構成**: 4つのパッケージ（shared, frontend, backend, infrastructure）

### 2. 依存関係検証

- **workspace プロトコル**: `workspace:*` の使用確認
- **パッケージ参照**: shared パッケージへの正常な参照
- **ビルド順序**: 依存関係に基づく正しいビルド順序

### 3. ビルド成果物検証

- **shared パッケージ**: TypeScript 宣言ファイル生成
- **frontend パッケージ**: Vite ビルド成果物
- **backend パッケージ**: TypeScript コンパイル結果
- **infrastructure パッケージ**: CDK ビルド成果物

### 4. パフォーマンス測定

- **全体ビルド時間**: 10秒以上で警告
- **個別パッケージビルド時間**: パッケージ別測定
- **キャッシュ効果**: Turbo キャッシュの動作確認

## トラブルシューティング

### よくある問題と解決方法

#### 1. TypeScript 設定エラー

```
Referenced project may not disable emit
```

**解決方法**: shared パッケージの tsconfig.json で `noEmit` を削除

#### 2. ESLint 設定エラー

```
Cannot find config "@typescript-eslint/recommended"
```

**解決方法**: 各パッケージに `.eslintrc.cjs` を作成し、基本設定を使用

#### 3. テストファイル不足

```
No test files found
```

**解決方法**: 各パッケージに基本的なテストファイルを作成

#### 4. ワークスペース構成エラー

```
Expected package not found in workspace
```

**解決方法**: `pnpm list -r` コマンドでワークスペース一覧を確認

## 今後の改善点

### 1. テスト内容の拡充

- E2Eテストの追加
- セキュリティテストの追加
- より詳細なパフォーマンステスト

### 2. CI/CD統合

- GitHub Actions での自動実行
- プルリクエスト時の自動テスト
- テスト結果の通知

### 3. レポート機能の強化

- HTML形式のレポート生成
- テスト履歴の管理
- パフォーマンス推移の可視化

## まとめ

統合テストの実装により、モノレポ設定の正常性を自動的に検証できるようになりました。これにより、開発者は設定変更後に素早く問題を発見し、修正することができます。

テストは段階的に実行され、問題が発生した場合は詳細なエラー情報とトラブルシューティングガイドが提供されます。
