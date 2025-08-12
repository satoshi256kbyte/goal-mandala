# CI用バージョン設定ドキュメント

## 概要

このドキュメントでは、CI/CD環境で使用するNode.js、Python、pnpmのバージョン設定について説明します。

## バージョン管理

### asdf設定（.tool-versions）

プロジェクトルートの`.tool-versions`ファイルで以下のバージョンを管理しています：

```
nodejs 23.10.0
python 3.13.3
```

**注意**: pnpmは`package.json`の`packageManager`フィールドで管理されており、asdfでは管理していません。

### package.json engines設定

ルート`package.json`の`engines`フィールドで最小バージョンを指定しています：

```json
{
  "engines": {
    "node": ">=23.10.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

## CI/CD環境での設定

### GitHub Actions

GitHub Actionsワークフローでは以下のように設定してください：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '23.10.0'
          cache: 'pnpm'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.13.3'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8.15.0'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
```

### Docker環境

Dockerfileでは以下のベースイメージを使用してください：

```dockerfile
# Node.js 23.10.0を使用
FROM node:23.10.0-alpine

# Python 3.13.3のインストール
RUN apk add --no-cache python3=~3.13.3 py3-pip

# pnpm 8.15.0のインストール
RUN npm install -g pnpm@8.15.0

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .
RUN pnpm build
```

## バージョン確認コマンド

開発環境でバージョンを確認するには以下のコマンドを実行してください：

```bash
# Node.jsバージョン確認
node --version
# 期待値: v23.10.0

# Pythonバージョン確認
python --version
# 期待値: Python 3.13.3

# pnpmバージョン確認（package.jsonのpackageManagerフィールドで管理）
npx pnpm --version
# 期待値: 8.15.0
```

## バージョン更新手順

### 1. .tool-versionsファイルの更新

```bash
# 新しいバージョンを指定
echo "nodejs 23.11.0" > .tool-versions
echo "python 3.13.4" >> .tool-versions
```

### 2. package.jsonのenginesフィールド更新

```json
{
  "engines": {
    "node": ">=23.11.0",
    "pnpm": ">=8.16.0"
  },
  "packageManager": "pnpm@8.16.0"
}
```

### 3. CI/CDワークフローの更新

GitHub ActionsやDockerfileの該当箇所を新しいバージョンに更新してください。

### 4. 依存関係の再インストール

```bash
# 古い依存関係を削除
rm -rf node_modules pnpm-lock.yaml

# 新しいバージョンで依存関係をインストール
pnpm install
```

## トラブルシューティング

### Node.jsバージョンが一致しない場合

```bash
# asdfでNode.jsを再インストール
asdf uninstall nodejs 23.10.0
asdf install nodejs 23.10.0
asdf global nodejs 23.10.0
```

### Pythonバージョンが一致しない場合

```bash
# asdfでPythonを再インストール
asdf uninstall python 3.13.3
asdf install python 3.13.3
asdf global python 3.13.3
```

### pnpmバージョンが一致しない場合

```bash
# pnpmを再インストール
npm uninstall -g pnpm
npm install -g pnpm@8.15.0
```

## 注意事項

- バージョン更新時は必ず全てのパッケージでテストを実行してください
- 本番環境デプロイ前に必ずステージング環境での動作確認を行ってください
- バージョン変更は破壊的変更の可能性があるため、メジャーバージョンアップ時は特に注意してください

## 関連ファイル

- `.tool-versions` - asdf用バージョン設定
- `package.json` - Node.js engines設定
- `.github/workflows/` - GitHub Actionsワークフロー（今後作成予定）
- `Dockerfile` - Docker環境設定（今後作成予定）
