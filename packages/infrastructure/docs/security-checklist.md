# セキュリティチェックリスト

## 概要

CDKプロジェクトのセキュリティ設定を確認するためのチェックリストです。デプロイ前に必ず確認してください。

## デプロイ前セキュリティチェック

### 🔐 認証・認可

- [ ] **IAM権限の最小化**: 各リソースに必要最小限の権限のみ付与
- [ ] **IAMロールの適切な設定**: サービス間の権限が適切に設定されている
- [ ] **クロスアカウントアクセスの制限**: 不要なアカウント間アクセスがない
- [ ] **一時的な認証情報の使用**: 長期間有効な認証情報を避ける

### 🛡️ ネットワークセキュリティ

- [ ] **VPCの適切な設定**: プライベートサブネットの使用
- [ ] **セキュリティグループの最小化**: 必要最小限のポート・プロトコルのみ許可
- [ ] **NACLの設定**: 必要に応じてネットワークACLを設定
- [ ] **VPCエンドポイントの使用**: AWSサービスへの通信をプライベートに保つ

### 🔒 データ保護

- [ ] **保存時暗号化**: データベース、S3バケットの暗号化有効化
- [ ] **転送時暗号化**: HTTPS/TLS通信の強制
- [ ] **機密情報の管理**: Secrets Managerでの機密情報管理
- [ ] **バックアップの暗号化**: バックアップデータの暗号化

### 📝 ログ・監視

- [ ] **CloudTrailの有効化**: API呼び出しログの記録
- [ ] **VPCフローログ**: ネットワークトラフィックの監視
- [ ] **CloudWatchログ**: アプリケーションログの集約
- [ ] **アラート設定**: セキュリティイベントの通知

### 🏷️ リソース管理

- [ ] **タグ付けの統一**: セキュリティ管理のためのタグ設定
- [ ] **リソース命名規約**: 一貫した命名規約の適用
- [ ] **削除保護**: 重要なリソースの削除保護設定
- [ ] **バージョニング**: S3バケットのバージョニング有効化

## 環境別セキュリティ設定

### 開発環境 (dev)

```typescript
// 開発環境では緩い設定も許可
const devSecurityConfig = {
  database: {
    deletionProtection: false,
    backupRetention: 7, // 7日間
    encryption: true,
  },
  s3: {
    versioning: false,
    publicAccess: false,
  },
  lambda: {
    reservedConcurrency: 10,
  },
};
```

### ステージング環境 (stg)

```typescript
// 本番に近い設定でテスト
const stgSecurityConfig = {
  database: {
    deletionProtection: true,
    backupRetention: 14, // 14日間
    encryption: true,
  },
  s3: {
    versioning: true,
    publicAccess: false,
  },
  lambda: {
    reservedConcurrency: 50,
  },
};
```

### 本番環境 (prod)

```typescript
// 最高レベルのセキュリティ設定
const prodSecurityConfig = {
  database: {
    deletionProtection: true,
    backupRetention: 30, // 30日間
    encryption: true,
    multiAZ: true,
  },
  s3: {
    versioning: true,
    publicAccess: false,
    mfaDelete: true,
  },
  lambda: {
    reservedConcurrency: 100,
  },
};
```

## セキュリティ検証コマンド

### CDK Nag実行

```bash
# セキュリティルールチェック
pnpm cdk synth --context environment=prod

# 特定のルールセットでチェック
pnpm cdk synth --context environment=prod --context cdkNagRules=AWS-Solutions
```

### AWS Config Rules

```bash
# コンプライアンスチェック
aws configservice get-compliance-details-by-config-rule \
  --config-rule-name encrypted-volumes

# セキュリティグループチェック
aws configservice get-compliance-details-by-config-rule \
  --config-rule-name security-group-ssh-check
```

### AWS Security Hub

```bash
# セキュリティ標準の確認
aws securityhub get-enabled-standards

# セキュリティファインディングの確認
aws securityhub get-findings \
  --filters '{"SeverityLabel":[{"Value":"HIGH","Comparison":"EQUALS"}]}'
```

## 脆弱性スキャン

### 依存関係スキャン

```bash
# npm audit
pnpm audit

# Snyk スキャン（導入している場合）
npx snyk test

# OWASP Dependency Check
dependency-check --project "goal-mandala" --scan ./
```

### コードスキャン

```bash
# ESLint セキュリティルール
pnpm lint

# SonarQube スキャン（導入している場合）
sonar-scanner

# CodeQL スキャン（GitHub Actions）
# .github/workflows/codeql-analysis.yml で設定
```

## インシデント対応手順

### 1. 検知・初期対応

```bash
# 緊急時のリソース停止
aws lambda put-function-concurrency \
  --function-name goal-mandala-prod-api \
  --reserved-concurrent-executions 0

# CloudFront無効化
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"
```

### 2. 調査・分析

```bash
# CloudTrail ログ確認
aws logs filter-log-events \
  --log-group-name /aws/cloudtrail \
  --start-time $(date -d '1 hour ago' +%s)000

# VPC フローログ確認
aws logs filter-log-events \
  --log-group-name /aws/vpc/flowlogs \
  --filter-pattern '[srcaddr="suspicious-ip"]'
```

### 3. 復旧・改善

```bash
# セキュリティパッチ適用
pnpm update

# 設定の修正・再デプロイ
./scripts/deploy.sh prod --no-approval

# 監視強化
aws logs put-metric-filter \
  --log-group-name /aws/lambda/goal-mandala-prod-api \
  --filter-name SecurityAlerts \
  --filter-pattern "ERROR"
```

## 定期的なセキュリティ監査

### 月次チェック

- [ ] IAMアクセスレビュー
- [ ] 未使用リソースの確認
- [ ] セキュリティグループの見直し
- [ ] CloudTrailログの分析

### 四半期チェック

- [ ] 依存関係の脆弱性スキャン
- [ ] ペネトレーションテスト
- [ ] セキュリティ設定の見直し
- [ ] インシデント対応手順の確認

### 年次チェック

- [ ] セキュリティポリシーの見直し
- [ ] 災害復旧計画の確認
- [ ] セキュリティ研修の実施
- [ ] 外部セキュリティ監査

## セキュリティツール設定

### AWS Security Hub

```typescript
// CDKでSecurity Hub有効化
const securityHub = new securityhub.CfnHub(this, 'SecurityHub', {
  tags: [
    {
      key: 'Environment',
      value: props.environment,
    },
  ],
});
```

### AWS GuardDuty

```typescript
// CDKでGuardDuty有効化
const guardDuty = new guardduty.CfnDetector(this, 'GuardDuty', {
  enable: true,
  findingPublishingFrequency: 'FIFTEEN_MINUTES',
});
```

### AWS Config

```typescript
// CDKでConfig有効化
const configRecorder = new config.CfnConfigurationRecorder(this, 'ConfigRecorder', {
  name: 'default',
  roleArn: configRole.roleArn,
  recordingGroup: {
    allSupported: true,
    includeGlobalResourceTypes: true,
  },
});
```

## 緊急連絡先

### セキュリティインシデント報告

- **プライマリ**: <security@company.com>
- **セカンダリ**: <admin@company.com>
- **緊急時電話**: +81-XX-XXXX-XXXX

### エスカレーション手順

1. **Level 1**: 開発チーム（即座に対応）
2. **Level 2**: セキュリティチーム（30分以内）
3. **Level 3**: 経営陣（重大インシデントの場合）

## 参考資料

- [AWS セキュリティベストプラクティス](https://aws.amazon.com/security/security-learning/)
- [CDK セキュリティガイド](https://docs.aws.amazon.com/cdk/v2/guide/security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
