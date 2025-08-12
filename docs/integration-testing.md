# モノレポ統合テストガイド

## 概要

このドキュメントでは、モノレポ設定の動作確認を行う統合テストについて説明します。

## テストスクリプト

### 1. Node.js版統合テスト（推奨）

```bash
pnpm run test:integration
```

または直接実行:

```bash
node tools/scripts/integration-test.js
```

### 2. Shell版統合テスト

```bash
pnpm run test:integration:shell
```

または直接実行:

```bash
bash tools/scripts/integration-test.sh
```

## テスト内容

### 前提条件チェック

- Node.js バージョン確認（23.10.0以上）
- pnpm インストール確認
- 必要な設定ファイルの存在確認

### 基本機能テスト

1. **依存関係インストール**
   - `pnpm install --frozen-lockfile` の実行
   - lockfile の整合性確認

2. **ワークスペース構成確認**
   - 全パッケージの認識確認
   - パッケージ名の正確性確認

3. **型チェック**
   - 全パッケージの TypeScript 型チェック
   - 型定義の整合性確認

4. **リント**
   - ESLint による静的解析
   - コーディング規約の遵守確認

5. **ビルド**
   - 全パッケージのビルド実行
   - 依存関係順序の確認

6. **ユニットテスト**
   - 各パッケージのテスト実行
   - テスト結果の集約

### 高度なテスト

7. **パッケージ間依存関係**
   - shared パッケージの参照確認
   - workspace: プロトコルの動作確認

8. **Turbo設定**
   - turbo.json の設定確認
   - パイプライン実行の確認

9. **設定ファイル整合性**
   - 必要な設定ファイルの存在確認
   - バージョン設定の整合性確認

10. **パフォーマンス**
    - ビルド時間の測定
    - パフォーマンス警告の表示

## テスト結果の解釈

### 成功時

```
[SUCCESS] 全てのテストが成功しました！
[SUCCESS] モノレポ設定は正常に動作しています。
```

### 失敗時

```
[ERROR] 失敗: 2
[ERROR] 失敗したテスト:
[ERROR]   - パッケージ間依存関係
[ERROR]   - Turbo設定
```

## トラブルシューティング

### よくある問題

#### 1. Node.js バージョン不一致

**症状**: Node.js バージョンが要件を満たしていない

**解決方法**:

```bash
# asdf を使用している場合
asdf install nodejs 23.10.0
asdf local nodejs 23.10.0

# nvm を使用している場合
nvm install 23.10.0
nvm use 23.10.0
```

#### 2. pnpm がインストールされていない

**症状**: `pnpm: command not found`

**解決方法**:

```bash
# npm 経由でインストール
npm install -g pnpm

# または corepack を使用
corepack enable
corepack prepare pnpm@latest --activate
```

#### 3. 依存関係インストールエラー

**症状**: `pnpm install` が失敗する

**解決方法**:

```bash
# キャッシュをクリア
pnpm store prune

# node_modules を削除して再インストール
rm -rf node_modules packages/*/node_modules
pnpm install
```

#### 4. パッケージ間依存関係エラー

**症状**: shared パッケージを参照できない

**解決方法**:

```bash
# shared パッケージをビルド
pnpm --filter @goal-mandala/shared run build

# 全体を再ビルド
pnpm run build
```

#### 5. 型チェックエラー

**症状**: TypeScript の型エラー

**解決方法**:

```bash
# 型定義を再生成
pnpm run build

# 個別パッケージの型チェック
pnpm --filter @goal-mandala/shared run type-check
```

### デバッグ方法

#### 詳細ログの有効化

```bash
# Node.js版でデバッグ情報を表示
DEBUG=* node tools/scripts/integration-test.js

# Shell版で詳細出力
bash -x tools/scripts/integration-test.sh
```

#### 個別テストの実行

特定のテストのみを実行したい場合は、スクリプトを直接編集するか、個別のコマンドを実行してください。

```bash
# 例: ビルドテストのみ
pnpm run build

# 例: 特定パッケージのテスト
pnpm --filter @goal-mandala/frontend run test
```

## CI/CD での使用

### GitHub Actions での統合

```yaml
name: Integration Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '23.10.0'
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Run Integration Tests
        run: pnpm run test:integration
```

### ローカル開発での使用

開発中は以下のタイミングで統合テストを実行することを推奨します：

1. **新しい依存関係を追加した後**
2. **パッケージ構成を変更した後**
3. **設定ファイルを更新した後**
4. **プルリクエスト作成前**

## カスタマイズ

### テストの追加

新しいテストを追加する場合は、`tools/scripts/integration-test.js` の `main` 関数に追加してください：

```javascript
await runTest('新しいテスト', async () => {
  // テストロジック
});
```

### テストの無効化

特定のテストを一時的に無効化する場合は、該当する `runTest` 呼び出しをコメントアウトしてください。

## 関連ドキュメント

- [開発環境セットアップガイド](../README.md)
- [モノレポアーキテクチャ](./monorepo-architecture.md)
- [統合テスト実装](./integration-test-implementation.md)
- [CI用バージョン設定](./ci-version-settings.md)
