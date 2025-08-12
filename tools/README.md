# 開発ツール

このディレクトリには、プロジェクトの開発・ビルド・テスト・デプロイに使用するツールとスクリプトが含まれています。

## ディレクトリ構成

```
tools/
├── docker/          # Docker関連設定ファイル
├── scripts/         # 開発用スクリプト
└── README.md        # このファイル
```

## 開発用スクリプト

### セットアップ

```bash
# 初回開発環境セットアップ
./tools/scripts/setup.sh
```

- Node.jsバージョンの確認
- pnpmのインストール（必要に応じて）
- 依存関係のインストール
- .envファイルの作成

### 開発サーバー

```bash
# 全パッケージの開発サーバー起動
./tools/scripts/dev.sh

# 特定パッケージの開発サーバー起動
./tools/scripts/dev.sh frontend
./tools/scripts/dev.sh backend
```

### ビルド

```bash
# 全パッケージのビルド
./tools/scripts/build.sh

# 特定パッケージのビルド
./tools/scripts/build.sh frontend
./tools/scripts/build.sh backend
```

### テスト

```bash
# 全パッケージのテスト実行
./tools/scripts/test.sh

# 特定パッケージのテスト実行
./tools/scripts/test.sh frontend

# ウォッチモードでテスト実行
./tools/scripts/test.sh --watch

# カバレッジレポート付きでテスト実行
./tools/scripts/test.sh --coverage

# 特定パッケージでウォッチモード + カバレッジ
./tools/scripts/test.sh frontend --watch --coverage
```

### リント

```bash
# 全パッケージのリントチェック
./tools/scripts/lint.sh

# 特定パッケージのリントチェック
./tools/scripts/lint.sh frontend

# 自動修正付きリントチェック
./tools/scripts/lint.sh --fix

# 特定パッケージで自動修正付きリントチェック
./tools/scripts/lint.sh --fix frontend
```

### クリーンアップ

```bash
# ビルド成果物とキャッシュの削除
./tools/scripts/clean.sh

# ディープクリーン（node_modules削除 + 再インストール）
./tools/scripts/clean.sh --deep
```

## 使用方法

1. **初回セットアップ**

   ```bash
   ./tools/scripts/setup.sh
   ```

2. **開発開始**

   ```bash
   ./tools/scripts/dev.sh
   ```

3. **コード品質チェック**

   ```bash
   ./tools/scripts/lint.sh
   ./tools/scripts/test.sh
   ```

4. **本番ビルド**

   ```bash
   ./tools/scripts/build.sh
   ```

## 注意事項

- スクリプトはプロジェクトルートから実行してください
- 初回実行時は `./tools/scripts/setup.sh` を実行してください
- エラーが発生した場合は、`./tools/scripts/clean.sh --deep` でクリーンアップしてから再試行してください

## Docker関連

Docker関連の設定ファイルは `tools/docker/` ディレクトリに配置予定です：

- `docker-compose.yml` - ローカル開発環境用
- `Dockerfile.*` - 各種Dockerファイル
- 初期化スクリプト等

## 今後の拡張予定

- デプロイスクリプト
- データベースマイグレーションスクリプト
- パフォーマンステストスクリプト
- セキュリティスキャンスクリプト
