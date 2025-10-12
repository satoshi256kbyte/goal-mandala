# 開発スクリプト

現在の開発環境で使用する必要最小限のスクリプト集です。

## 利用可能なスクリプト

### 開発環境

- **sam-local-start.sh**: AWS SAM CLIでローカルAPI起動
- **dev.sh**: 開発サーバー起動（フロントエンド/バックエンド）

### ビルド・テスト

- **build.sh**: プロジェクトビルド
- **test.sh**: テスト実行
- **lint.sh**: コード品質チェック
- **sam-build.sh**: SAM ビルド

### ユーティリティ

- **validate-env.js**: 環境変数検証
- **clean.sh**: ビルド成果物クリーンアップ

## 使用例

```bash
# ローカル開発環境起動
./tools/scripts/sam-local-start.sh

# 環境変数チェック
./tools/scripts/validate-env.js

# テスト実行
./tools/scripts/test.sh
```

## 非推奨スクリプト

Docker関連や複雑な統合テストスクリプトは `tools/deprecated/scripts/` に移動されました。
