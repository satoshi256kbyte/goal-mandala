# 進捗計算エンジン API ドキュメント

## 概要

進捗計算エンジンは、マンダラチャートシステムにおける階層的な進捗計算（タスク→アクション→サブ目標→目標）を実行するコアサービスです。

## 主要機能

- **階層的進捗計算**: タスクからアクション、サブ目標、目標まで自動的に進捗を計算
- **キャッシュ機能**: 計算結果をキャッシュして高速化
- **エラーハンドリング**: 堅牢なエラー処理とフォールバック機能
- **セキュリティ**: データアクセス制御と整合性チェック

## API インターフェース

### ProgressCalculationEngine

```typescript
interface ProgressCalculationEngine {
  calculateTaskProgress(taskId: string): Promise<number>;
  calculateActionProgress(actionId: string): Promise<number>;
  calculateSubGoalProgress(subGoalId: string): Promise<number>;
  calculateGoalProgress(goalId: string): Promise<number>;
  recalculateFromTask(taskId: string): Promise<ProgressHierarchy>;
}
```

## メソッド詳細

### calculateTaskProgress(taskId: string): Promise<number>

タスクの進捗を計算します。

**パラメータ:**

- `taskId` (string): タスクID

**戻り値:**

- `Promise<number>`: 進捗率（0-100）

**計算ロジック:**

- 完了済み（COMPLETED）: 100%
- 進行中（IN_PROGRESS）: 50%
- 未着手（NOT_STARTED）: 0%
- スキップ（SKIPPED）: 0%

**エラー:**

- `Invalid task ID provided`: 無効なタスクID
- `Task not found: {taskId}`: タスクが見つからない

### calculateActionProgress(actionId: string): Promise<number>

アクションの進捗を計算します。

**パラメータ:**

- `actionId` (string): アクションID

**戻り値:**

- `Promise<number>`: 進捗率（0-100）

**計算ロジック:**

#### 実行アクション

```
進捗率 = (全タスクの進捗値の合計 / タスク数)
各タスクの進捗値: COMPLETED=100, IN_PROGRESS=50, NOT_STARTED=0, SKIPPED=0
```

例：4つのタスク（2つ完了、1つ進行中、1つ未着手）の場合

```
進捗率 = (100 + 100 + 50 + 0) / 4 = 62.5% → 63%（四捨五入）
```

#### 習慣アクション

```
進捗率 = min((最新の連続日数 / 必要日数) × 100, 100)
必要日数 = 目標日数 × 0.8 (80%継続で達成)
```

**連続日数の計算方法:**

- 完了日時でソートし、日付の連続性をチェック
- 連続が途切れた場合は、最新の連続日数のみをカウント
- 同じ日に複数回完了した場合は1日としてカウント

例：目標30日の習慣アクション

- 連続30日完了 → 100%
- 連続24日完了 → 100%（24日 ≥ 30日 × 0.8）
- 連続12日完了 → 50%（12日 / 24日）

**エラー:**

- `Invalid action ID provided`: 無効なアクションID
- `Action not found: {actionId}`: アクションが見つからない

### calculateSubGoalProgress(subGoalId: string): Promise<number>

サブ目標の進捗を計算します。

**パラメータ:**

- `subGoalId` (string): サブ目標ID

**戻り値:**

- `Promise<number>`: 進捗率（0-100）

**計算ロジック:**

```
進捗率 = 有効なアクションの平均進捗率
有効な進捗値: 0 ≤ 進捗値 ≤ 100 かつ NaN でない
```

**進捗値の検証:**

- 無効な進捗値（0未満、100超過、NaN）は自動的にフィルタリング
- 無効な進捗値が検出された場合は警告ログを出力
- 全てのアクション進捗が無効な場合はエラー

**エラー:**

- `Invalid subgoal ID provided`: 無効なサブ目標ID
- `No valid action progress values for subgoal: {subGoalId}`: 有効なアクション進捗がない

### calculateGoalProgress(goalId: string): Promise<number>

目標の進捗を計算します。

**パラメータ:**

- `goalId` (string): 目標ID

**戻り値:**

- `Promise<number>`: 進捗率（0-100）

**計算ロジック:**

```
進捗率 = 有効なサブ目標の平均進捗率
有効な進捗値: 0 ≤ 進捗値 ≤ 100 かつ NaN でない
```

**進捗値の検証:**

- 無効な進捗値（0未満、100超過、NaN）は自動的にフィルタリング
- 無効な進捗値が検出された場合は警告ログを出力
- 全てのサブ目標進捗が無効な場合はエラー

**エラー:**

- `Invalid goal ID provided`: 無効な目標ID
- `No valid subgoal progress values for goal: {goalId}`: 有効なサブ目標進捗がない

### recalculateFromTask(taskId: string): Promise<ProgressHierarchy>

タスクから上位階層まで全ての進捗を再計算します。

**パラメータ:**

- `taskId` (string): 起点となるタスクID

**戻り値:**

- `Promise<ProgressHierarchy>`: 階層的な進捗データ

```typescript
interface ProgressHierarchy {
  task: TaskProgress;
  action: ActionProgress;
  subGoal: SubGoalProgress;
  goal: GoalProgress;
}
```

## キャッシュ機能

### キャッシュ戦略

- **有効期限**: 5分間
- **依存関係管理**: 下位レベルの変更時に上位レベルのキャッシュを自動無効化
- **キーフォーマット**: `{entityType}:{entityId}`

### キャッシュ操作

```typescript
// キャッシュから取得
private getFromCache(key: string): number | null

// キャッシュに設定
private setCache(key: string, data: number, dependencies: string[]): void

// 関連キャッシュをクリア
private clearRelatedCache(taskId: string): void
```

## エラーハンドリング

### エラー種類

```typescript
enum ProgressCalculationError {
  INVALID_ENTITY = 'INVALID_ENTITY',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  CALCULATION_TIMEOUT = 'CALCULATION_TIMEOUT',
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY',
}
```

### エラー処理戦略

- **タイムアウト**: 30秒でタイムアウト
- **リトライ**: エラー種類に応じて自動リトライ
- **フォールバック値**: エラー時は0%を返却（安全側に倒す）
- **ログ記録**: 全てのエラーは構造化ログとして記録

## セキュリティ機能

### データアクセス制御

- ユーザー認証に基づくデータアクセス制御
- エンティティレベルでの権限チェック

### データ整合性チェック

- データ改ざん防止
- 計算結果の妥当性検証

## 使用例

### 基本的な使用方法

```typescript
import { progressCalculationEngine } from './services/progress-calculation-engine';

// タスクの進捗を計算
const taskProgress =
  await progressCalculationEngine.calculateTaskProgress('task-123');
console.log(`タスク進捗: ${taskProgress}%`);

// アクションの進捗を計算
const actionProgress =
  await progressCalculationEngine.calculateActionProgress('action-456');
console.log(`アクション進捗: ${actionProgress}%`);

// 階層的な再計算
const hierarchy =
  await progressCalculationEngine.recalculateFromTask('task-123');
console.log('階層的進捗:', hierarchy);
```

### エラーハンドリング

```typescript
try {
  const progress =
    await progressCalculationEngine.calculateGoalProgress('goal-789');
  console.log(`目標進捗: ${progress}%`);
} catch (error) {
  console.error('進捗計算エラー:', error.message);
  // フォールバック処理
  const fallbackProgress = 0;
}
```

## パフォーマンス考慮事項

### 最適化のポイント

- **キャッシュ活用**: 頻繁にアクセスされるデータはキャッシュを活用
- **バッチ処理**: 複数の進捗計算は並列実行
- **依存関係管理**: 不要なキャッシュクリアを避ける

### 推奨事項

- 大量データ処理時は適切なタイムアウト設定
- エラー状態の適切な処理
- ユーザーフィードバックの提供

## トラブルシューティング

### よくある問題

#### 1. 計算結果が期待値と異なる

- データの整合性を確認
- キャッシュをクリアして再計算
- エラーログを確認

#### 2. パフォーマンスが遅い

- キャッシュヒット率を確認
- 不要な再計算を避ける
- データベースクエリの最適化

#### 3. エラーが頻発する

- 入力データの妥当性を確認
- ネットワーク接続を確認
- サーバーの負荷状況を確認

## 更新履歴

- v1.0.0: 初期リリース
- v1.1.0: キャッシュ機能追加
- v1.2.0: セキュリティ機能強化
- v1.3.0: エラーハンドリング改善
- v2.0.0: 進捗計算ロジックの大幅改善（2025年11月10日）
  - タスク進捗計算の修正：4つの状態（completed, in_progress, not_started, skipped）に対応
  - 実行アクション進捗計算の修正：タスク進捗の平均値による計算に変更
  - 習慣アクション進捗計算の修正：連続日数計算ロジックの実装
  - サブ目標・目標進捗計算の修正：無効な進捗値（0未満、100超過）のフィルタリング強化
  - ProgressValidatorの追加：進捗値検証の一元管理
  - ErrorHandlerの改善：エラー時のフォールバック値を0%に統一
  - 全27個のテストケースが成功
