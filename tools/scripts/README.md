# 開発スクリプト

現在の開発環境で使用する必要最小限のスクリプト集です。

## 利用可能なスクリプト

### 開発環境

- **sam-local-start.sh**: AWS SAM CLIでローカルAPI起動
- **dev.sh**: 開発サーバー起動（フロントエンド/バックエンド）

### ビルド・テスト

- **build.sh**: プロジェクトビルド
- **test.sh**: テスト実行
- **test-with-timeout.sh**: タイムアウト付きテスト実行
- **lint.sh**: コード品質チェック
- **sam-build.sh**: SAM ビルド

### ユーティリティ

- **validate-env.js**: 環境変数検証
- **clean.sh**: ビルド成果物クリーンアップ

## 使用例

### 基本的な使用方法

```bash
# ローカル開発環境起動
./tools/scripts/sam-local-start.sh

# 環境変数チェック
./tools/scripts/validate-env.js

# テスト実行
./tools/scripts/test.sh
```

### test-with-timeout.sh の使用方法

タイムアウト管理機能を持つテスト実行スクリプトです。テストが無限ループやハングした場合に自動的に終了します。

#### 基本構文

```bash
./tools/scripts/test-with-timeout.sh [package] [timeout_seconds]
```

#### 引数

- **package**: テスト対象パッケージ（省略時: `all`）
  - `all`: 全パッケージをテスト
  - `backend`: バックエンドパッケージのみ
  - `frontend`: フロントエンドパッケージのみ
  - `shared`: 共有パッケージのみ
  - `infrastructure`: インフラパッケージのみ

- **timeout_seconds**: タイムアウト時間（秒）（省略時: 120秒）
  - フロントエンドパッケージのデフォルトは60秒に自動調整されます

#### 使用例

```bash
# 全パッケージをデフォルトタイムアウト（120秒）でテスト
./tools/scripts/test-with-timeout.sh

# バックエンドパッケージのみをテスト
./tools/scripts/test-with-timeout.sh backend

# フロントエンドパッケージを60秒タイムアウトでテスト
./tools/scripts/test-with-timeout.sh frontend 60

# 全パッケージを180秒タイムアウトでテスト
./tools/scripts/test-with-timeout.sh all 180

# ヘルプを表示
./tools/scripts/test-with-timeout.sh --help
```

#### 動作仕様

- テストプロセスをバックグラウンドで実行し、指定時間内に完了しない場合は強制終了します
- タイムアウト時は終了コード124を返します
- 各パッケージのテスト結果を色分けして表示します（成功: 緑、失敗: 赤、警告: 黄）
- 全パッケージテスト時は、各パッケージの結果サマリーを表示します

#### 注意事項

- macOS環境に対応しています
- テストが指定時間内に完了しない場合、プロセスは強制終了されます
- フロントエンドテストは最適化されており、デフォルトで60秒タイムアウトが適用されます

## 非推奨スクリプト

Docker関連や複雑な統合テストスクリプトは `tools/deprecated/scripts/` に移動されました。
