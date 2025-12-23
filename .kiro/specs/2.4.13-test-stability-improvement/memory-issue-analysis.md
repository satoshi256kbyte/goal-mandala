# メモリ不足問題の詳細分析

## 実行日時
2025年12月5日 20:47

## 問題の詳細

### 症状
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

### 試した対策と結果

#### 1. NODE_OPTIONS設定（失敗）
- 設定: `NODE_OPTIONS='--max-old-space-size=10240'` (10GB)
- 結果: メモリ不足エラー継続

#### 2. execArgv設定（失敗）
- 設定: `execArgv: ['--max-old-space-size=4096', '--expose-gc']`
- 結果: メモリ不足エラー継続

#### 3. maxConcurrency制限（失敗）
- 設定: `maxConcurrency: 1`
- 結果: メモリ不足エラー継続

#### 4. singleFork: false（失敗）
- 設定: `singleFork: false` (各テストファイル後にワーカー再起動)
- 結果: メモリ不足エラー継続

### 根本原因の推測

1. **テストファイル数が多すぎる**
   - 144テストファイル、2462テスト
   - 各テストファイルがメモリを蓄積

2. **jsdom環境のメモリリーク**
   - jsdomは大量のDOM操作でメモリを消費
   - ガベージコレクションが追いつかない

3. **テスト間のクリーンアップ不足**
   - グローバル状態が残っている可能性
   - タイマーやイベントリスナーが残っている可能性

## 推奨される解決策

### 短期的対策（即座に実施）

#### 1. テストファイルのバッチ実行

テストを小さなバッチに分割して実行:

```bash
# 方法1: ディレクトリ単位で実行
pnpm --filter @goal-mandala/frontend vitest run src/components/auth
pnpm --filter @goal-mandala/frontend vitest run src/components/common
pnpm --filter @goal-mandala/frontend vitest run src/components/forms
# ...

# 方法2: パターンマッチで実行
pnpm --filter @goal-mandala/frontend vitest run --testNamePattern="^(Auth|Login|Signup)"
pnpm --filter @goal-mandala/frontend vitest run --testNamePattern="^(Form|Input|Button)"
# ...
```

#### 2. 重いテストファイルの特定と分離

メモリを多く消費するテストファイルを特定:

```bash
# 各テストファイルを個別実行してメモリ使用量を確認
for file in src/**/*.test.tsx; do
  echo "Testing: $file"
  pnpm vitest run "$file" --reporter=verbose
done
```

### 中期的対策（次のイテレーション）

#### 1. テストの簡素化

- 不要なテストケースの削除
- 重複テストの統合
- モックの最適化

#### 2. テスト環境の最適化

- `happy-dom`への移行検討（jsdomより軽量）
- テストファイルの分割（大きなファイルを小さく）

#### 3. CI/CD環境での並列実行

- GitHub Actionsのmatrix戦略でテストを並列実行
- 各ジョブで異なるテストディレクトリを実行

### 長期的対策（将来の改善）

#### 1. テストアーキテクチャの見直し

- ユニットテストと統合テストの明確な分離
- E2Eテストへの移行（重いテストケース）

#### 2. メモリプロファイリング

- Chrome DevToolsでメモリリークを特定
- ヒープスナップショットの分析

## 参考情報

### 現在のテスト統計

- テストファイル数: 144
- テスト数: 2462
- 成功率: 97.4%（2399/2462）
- 実行時間: 約97秒（メモリ不足前）

### メモリ設定の履歴

1. 初期: `--max-old-space-size=10240` (10GB)
2. 試行1: `execArgv: ['--max-old-space-size=2048']` (2GB)
3. 試行2: `execArgv: ['--max-old-space-size=4096']` (4GB)
4. 結果: すべて失敗

### 類似プロジェクトの事例

- React Testing Libraryの大規模プロジェクトでは、テストを複数のCI/CDジョブに分割
- Vitestの公式ドキュメントでは、`--shard`オプションでテストを分割実行することを推奨

## 次のアクション

### 即座に実施

1. テストをディレクトリ単位で分割実行
2. 各バッチの実行時間とメモリ使用量を記録
3. 成功したバッチと失敗したバッチを特定

### 次のイテレーション

1. 重いテストファイルの最適化
2. テスト環境の変更検討（happy-dom）
3. CI/CD環境での並列実行設定
