# テスト実行ルールとガイドライン

## 概要

このドキュメントでは、Goal Mandalaプロジェクトにおけるテスト実行のルール、タイムアウト設定、ベストプラクティスを定義します。

## タイムアウト設定

### 基本タイムアウト

| パッケージ | テストタイムアウト | 全体タイムアウト | 理由 |
|------------|-------------------|------------------|------|
| shared | 30秒 | 30秒 | 軽量なユーティリティ関数のみ |
| backend | 30秒 | 60秒 | データベースモック、AWS SDK モック |
| frontend | 30秒 | 60秒 | DOM操作、非同期レンダリング |
| infrastructure | 30秒 | 120秒 | CDK構文チェック、設定検証（重い処理） |

### 拡張タイムアウト（CI/CD環境）

| 環境 | 全体タイムアウト | 個別テストタイムアウト |
|------|------------------|------------------------|
| ローカル開発 | 120秒 | 30秒 |
| CI/CD | 180秒 | 45秒 |
| 統合テスト | 300秒 | 60秒 |

## テスト実行コマンド

### 基本コマンド

```bash
# 全パッケージのテスト（タイムアウト付き）
pnpm run test:timeout

# 個別パッケージのテスト
pnpm run test:timeout:backend
pnpm run test:timeout:frontend
pnpm run test:timeout:shared

# 安全モード（長めのタイムアウト）
pnpm run test:safe
```

### 直接実行

```bash
# タイムアウト管理スクリプトを直接実行
./tools/scripts/test-with-timeout.sh all 120
./tools/scripts/test-with-timeout.sh backend 60
./tools/scripts/test-with-timeout.sh frontend 60
```

## テスト実行ルール

### 1. 必須ルール

- **全テストは30秒以内に完了する必要がある**
- **テストが指定時間を超える場合は強制終了される**
- **メモリリークを防ぐため、テスト後はプロセスを強制終了する**
- **並列実行は最大1プロセスに制限する**

### 2. 推奨ルール

- **テストは独立して実行可能である必要がある**
- **外部依存関係はモックを使用する**
- **テストデータは各テスト内で完結させる**
- **非同期処理は適切にawaitする**

### 3. 禁止事項

- **実際のAWSリソースへの接続**
- **実際のデータベースへの接続（統合テスト除く）**
- **ネットワーク通信を伴うテスト**
- **ファイルシステムへの永続的な書き込み**

## 現在のテスト状況

### 成功パッケージ
- ✅ **shared**: 2/2 テスト成功
- ✅ **backend**: 422/616 テスト成功（一部設定問題あり）

### 問題のあるパッケージ
- ❌ **frontend**: 設定ファイルの問題
- ❌ **infrastructure**: 194/616 テスト失敗（設定不備）

## トラブルシューティング

### テストがタイムアウトする場合

1. **非同期処理の確認**
   ```typescript
   // ❌ 悪い例
   test('async test', () => {
     someAsyncFunction(); // awaitなし
   });
   
   // ✅ 良い例
   test('async test', async () => {
     await someAsyncFunction();
   });
   ```

2. **モックの適切な設定**
   ```typescript
   // ❌ 悪い例
   // モックなしで外部API呼び出し
   
   // ✅ 良い例
   jest.mock('@aws-sdk/client-bedrock-runtime');
   ```

3. **リソースのクリーンアップ**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
     // その他のクリーンアップ
   });
   ```

### メモリリークの対処

1. **Jest設定の確認**
   ```javascript
   // jest.config.js
   {
     forceExit: true,
     detectOpenHandles: true,
     logHeapUsage: true,
     maxWorkers: 1,
     maxConcurrency: 1,
   }
   ```

2. **Vitest設定の確認**
   ```typescript
   // vitest.config.ts
   {
     pool: 'forks',
     poolOptions: {
       forks: { singleFork: true }
     },
     maxConcurrency: 1,
   }
   ```

### よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| テストが永続的にハング | 非同期処理の未完了 | await/Promiseの適切な処理 |
| メモリ使用量の増加 | モックのクリーンアップ不足 | afterEach でのクリーンアップ |
| ランダムな失敗 | テスト間の状態共有 | 独立したテストデータの使用 |
| AWS SDK エラー | モック設定の不備 | aws-sdk-client-mock の適切な使用 |
| CDK テスト失敗 | 設定ファイルの不備 | 環境設定の見直し |

## CI/CD統合

### GitHub Actions設定

```yaml
- name: Run tests with timeout
  run: pnpm run test:timeout
  timeout-minutes: 5

- name: Run safe tests (fallback)
  if: failure()
  run: pnpm run test:safe
  timeout-minutes: 8
```

### ローカル開発

```bash
# 開発中の高速テスト
pnpm run test:timeout:backend

# コミット前の全体テスト
pnpm run test:safe
```

## パフォーマンス監視

### メトリクス

- **テスト実行時間**: 各パッケージ60秒以内
- **メモリ使用量**: 500MB以内
- **成功率**: 95%以上

### 監視コマンド

```bash
# ヒープ使用量の監視
pnpm run test:timeout 2>&1 | grep "heap"

# 実行時間の測定
time pnpm run test:timeout
```

## 今後の改善計画

### 短期目標（1週間以内）
1. Infrastructure パッケージのテスト修正
2. Frontend パッケージの設定問題解決
3. 全パッケージでの95%成功率達成

### 中期目標（1ヶ月以内）
1. 統合テストの実装
2. E2Eテストの自動化
3. パフォーマンステストの追加

### 長期目標（3ヶ月以内）
1. テストカバレッジ90%達成
2. 自動テスト実行の最適化
3. テスト結果の可視化

## 更新履歴

- 2024-10-14: 初版作成、タイムアウト設定とルール定義
- 2024-10-14: 実際のテスト結果を反映、問題パッケージの特定
