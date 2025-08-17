# GitHub ブランチ保護ルール設定ガイド

## 概要

このドキュメントでは、GitHubリポジトリのブランチ保護ルールの設定方法について説明します。ブランチ保護ルールにより、コードの品質を保ち、安全なデプロイメントを実現します。

## ブランチ保護ルール設定

### mainブランチの保護設定

#### 基本設定

1. GitHubリポジトリの **Settings** タブにアクセス
2. 左サイドバーの **Branches** をクリック
3. **Add rule** ボタンをクリック
4. 以下の設定を行う：

```
Branch name pattern: main
```

#### 必須設定項目

##### ✅ Require a pull request before merging

- **Required approving reviews**: 1
- **Dismiss stale reviews when new commits are pushed**: ✅
- **Require review from code owners**: ✅
- **Restrict pushes that create files that an owner cannot review**: ✅

##### ✅ Require status checks to pass before merging

- **Require branches to be up to date before merging**: ✅
- **Status checks that are required**:
  - `CI / lint-and-test`
  - `CI / type-check`
  - `CI / build`
  - `CI / test-coverage`

##### ✅ Require conversation resolution before merging

- すべてのコメントが解決されるまでマージを禁止

##### ✅ Require signed commits

- 署名されたコミットのみを許可

##### ✅ Require linear history

- マージコミットを禁止し、リベースまたはスカッシュマージのみを許可

##### ✅ Include administrators

- 管理者にもルールを適用

##### ❌ Allow force pushes

- フォースプッシュを禁止

##### ❌ Allow deletions

- ブランチ削除を禁止

### developブランチの保護設定

#### 基本設定

```
Branch name pattern: develop
```

#### 設定項目

##### ✅ Require a pull request before merging

- **Required approving reviews**: 1
- **Dismiss stale reviews when new commits are pushed**: ✅
- **Require review from code owners**: ❌ (developブランチでは緩和)

##### ✅ Require status checks to pass before merging

- **Require branches to be up to date before merging**: ✅
- **Status checks that are required**:
  - `CI / lint-and-test`
  - `CI / type-check`
  - `CI / build`

##### ✅ Require conversation resolution before merging

##### ❌ Require signed commits (developブランチでは緩和)

##### ❌ Require linear history (developブランチでは緩和)

##### ✅ Include administrators

##### ❌ Allow force pushes

##### ❌ Allow deletions

### feature/*ブランチの保護設定

#### 基本設定

```
Branch name pattern: feature/*
```

#### 設定項目

##### ✅ Require status checks to pass before merging

- **Status checks that are required**:
  - `CI / lint-and-test`
  - `CI / type-check`

##### ❌ その他の制限は適用しない（開発効率を重視）

## CODEOWNERSファイル設定

### ファイル作成

`.github/CODEOWNERS` ファイルを作成し、以下の内容を設定：

```
# Global owners
* @goal-mandala-team

# Frontend specific
/packages/frontend/ @frontend-team @goal-mandala-team

# Backend specific  
/packages/backend/ @backend-team @goal-mandala-team

# Infrastructure specific
/packages/infrastructure/ @devops-team @goal-mandala-team

# Shared packages
/packages/shared/ @goal-mandala-team

# CI/CD workflows
/.github/ @devops-team @goal-mandala-team

# Documentation
/docs/ @goal-mandala-team
README.md @goal-mandala-team
CONTRIBUTING.md @goal-mandala-team

# Configuration files
package.json @goal-mandala-team
pnpm-workspace.yaml @goal-mandala-team
turbo.json @goal-mandala-team
.tool-versions @goal-mandala-team

# Docker and development environment
docker-compose.yml @devops-team @goal-mandala-team
Dockerfile* @devops-team @goal-mandala-team
.env.example @devops-team @goal-mandala-team

# Security and compliance
.github/workflows/ @devops-team @goal-mandala-team
.husky/ @goal-mandala-team
```

### チーム設定

GitHubでチームを作成し、適切なメンバーを追加：

#### @goal-mandala-team

- プロジェクトの全体責任者
- 全ファイルのレビュー権限

#### @frontend-team

- フロントエンド開発者
- `/packages/frontend/` のレビュー権限

#### @backend-team

- バックエンド開発者
- `/packages/backend/` のレビュー権限

#### @devops-team

- インフラ・DevOps担当者
- インフラとCI/CDのレビュー権限

## プルリクエストワークフロー

### 1. ブランチ作成

```bash
# 機能開発用ブランチ
git checkout -b feature/user-authentication

# バグ修正用ブランチ
git checkout -b fix/login-validation-error

# ホットフィックス用ブランチ
git checkout -b hotfix/security-patch
```

### 2. 開発・コミット

```bash
# 変更をステージング
git add .

# Conventional Commitsに従ってコミット
git commit -m "feat: add user authentication functionality"

# プッシュ
git push origin feature/user-authentication
```

### 3. プルリクエスト作成

1. GitHubでプルリクエストを作成
2. プルリクエストテンプレートに従って情報を記入
3. 適切なレビュアーを指定
4. ラベルを設定

### 4. レビュープロセス

1. **自動チェック**: GitHub Actionsによる自動テスト
2. **コードレビュー**: 指定されたレビュアーによるレビュー
3. **修正対応**: レビューコメントに基づく修正
4. **承認**: 必要な承認数を満たす
5. **マージ**: 保護ルールを満たした後にマージ

## 緊急時の対応

### ホットフィックス手順

1. **緊急ブランチ作成**

   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-security-fix
   ```

2. **修正実装**
   - 最小限の変更で問題を修正
   - テストを追加・実行

3. **緊急レビュー**
   - 管理者権限でのレビュー
   - 必要に応じて保護ルールの一時的な緩和

4. **緊急デプロイ**
   - 手動でのマージ承認
   - 即座のデプロイ実行

### 保護ルールの一時的な無効化

緊急時のみ、以下の手順で保護ルールを一時的に無効化：

1. **Settings** > **Branches** にアクセス
2. 該当ブランチの **Edit** をクリック
3. **Include administrators** のチェックを外す
4. 緊急対応完了後、即座に設定を戻す

## モニタリングとメトリクス

### 追跡すべきメトリクス

- **プルリクエスト作成からマージまでの時間**
- **レビュー待ち時間**
- **CI/CDパイプラインの成功率**
- **保護ルール違反の回数**

### 定期的な見直し

- **月次**: 保護ルールの効果測定
- **四半期**: ルール設定の見直し
- **年次**: チーム構成とルールの整合性確認

## トラブルシューティング

### よくある問題と解決方法

#### 1. ステータスチェックが通らない

```bash
# 問題: CI/CDパイプラインが失敗
# 解決方法:
1. ローカルでテストを実行
   pnpm test
   pnpm lint
   pnpm type-check

2. 問題を修正してプッシュ
   git add .
   git commit -m "fix: resolve CI/CD issues"
   git push
```

#### 2. レビュアーが不在

```bash
# 問題: 指定されたレビュアーが不在
# 解決方法:
1. 代替レビュアーを指定
2. チームメンバーに依頼
3. 緊急時は管理者に相談
```

#### 3. マージコンフリクト

```bash
# 問題: ブランチが最新でない
# 解決方法:
git checkout feature/my-feature
git fetch origin
git rebase origin/main
# コンフリクトを解決
git add .
git rebase --continue
git push --force-with-lease
```

## セキュリティ考慮事項

### 1. 権限管理

- 最小権限の原則を適用
- 定期的な権限レビュー
- 退職者の権限即座削除

### 2. 監査ログ

- ブランチ保護ルールの変更履歴
- 緊急時の権限使用履歴
- 異常なアクセスパターンの検出

### 3. 自動化

- 権限変更の自動通知
- 保護ルール違反のアラート
- 定期的なセキュリティスキャン

## 参考リンク

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Teams](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams)

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2025-01-XX | 初版作成 | 開発チーム |
