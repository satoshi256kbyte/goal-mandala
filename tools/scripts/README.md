# 統合テストスクリプト

このディレクトリには、モノレポ設定の動作確認を行う統合テストスクリプトが含まれています。

## 利用可能なテストスクリプト

### 1. シンプル版統合テスト（推奨）

```bash
pnpm run test:integration
# または
node tools/scripts/integration-test-simple.js
```

**特徴:**

- 設定ファイルの整合性チェック
- ワークスペース構成の確認
- 依存関係設定の検証
- 実際のビルド・テストは実行しない
- 高速実行（数秒で完了）

**用途:**

- 設定変更後の基本確認
- CI/CDでの基本チェック
- 開発環境セットアップ後の確認

### 2. 完全版統合テスト

```bash
pnpm run test:integration:full
# または
node tools/scripts/integration-test-full.js
```

**特徴:**

- 実際の依存関係インストール
- 各パッケージのビルド実行
- 型チェック・リント・テストの実行
- パフォーマンス測定
- 包括的な動作確認

**用途:**

- 本格的な動作確認
- リリース前の最終チェック
- パフォーマンス測定

### 3. 高度版統合テスト

```bash
pnpm run test:integration:advanced
# または
node tools/scripts/integration-test.js
```

**特徴:**

- 最も包括的なテスト
- 非同期処理の詳細テスト
- エラーハンドリングの検証
- 詳細なログ出力

**用途:**

- 開発中のデバッグ
- 詳細な問題調査

### 4. Shell版統合テスト

```bash
pnpm run test:integration:shell
# または
bash tools/scripts/integration-test.sh
```

**特徴:**

- Bashスクリプトベース
- Node.js環境に依存しない
- シンプルな実装

**用途:**

- Node.js環境が不安定な場合
- シンプルなCI環境

## 使い分けガイド

| 状況 | 推奨スクリプト | 理由 |
|------|---------------|------|
| 日常的な開発 | シンプル版 | 高速で基本的な問題を検出 |
| 設定変更後 | シンプル版 | 設定の整合性を素早く確認 |
| プルリクエスト前 | 完全版 | 実際の動作を包括的に確認 |
| リリース前 | 完全版 | 本番環境での動作を保証 |
| 問題調査 | 高度版 | 詳細な情報で問題を特定 |
| CI/CD | シンプル版 | 高速で基本的な品質を保証 |

## テスト内容

### 共通テスト項目

- Node.js バージョン確認
- pnpm インストール確認
- 設定ファイル存在確認
- ワークスペース構成確認
- パッケージ依存関係確認
- Turbo設定確認

### 完全版・高度版の追加項目

- 実際の依存関係インストール
- 各パッケージのビルド
- 型チェック実行
- リント実行
- ユニットテスト実行
- パフォーマンス測定

## トラブルシューティング

### よくある問題と解決方法

#### 1. Node.js バージョンエラー

```bash
# asdf使用時
asdf install nodejs 23.10.0
asdf local nodejs 23.10.0

# nvm使用時
nvm install 23.10.0
nvm use 23.10.0
```

#### 2. pnpm がない

```bash
# npm経由でインストール
npm install -g pnpm

# または corepack使用
corepack enable
corepack prepare pnpm@latest --activate
```

#### 3. 依存関係エラー

```bash
# キャッシュクリア
pnpm store prune

# 再インストール
rm -rf node_modules packages/*/node_modules
pnpm install
```

#### 4. ビルドエラー

```bash
# shared パッケージを最初にビルド
pnpm --filter @goal-mandala/shared run build

# 全体をビルド
pnpm run build
```

## カスタマイズ

### 新しいテストの追加

各スクリプトの `main` 関数に新しいテストを追加できます：

```javascript
await runTest('新しいテスト', async () => {
  // テストロジック
});
```

### テストの無効化

特定のテストを無効化する場合は、該当する `runTest` 呼び出しをコメントアウトしてください。

### 設定の変更

各スクリプトの上部にある設定値を変更することで、テストの動作をカスタマイズできます。

## 関連ドキュメント

- [統合テストガイド](../../docs/integration-testing.md)
- [開発環境セットアップ](../../README.md)
- [モノレポ構成](../../docs/monorepo-structure.md)
