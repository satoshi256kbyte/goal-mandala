# 設計書

## 概要

進捗計算エンジンのテスト失敗を修正するための設計書です。現在の実装には以下の問題があります：

1. **タスク進捗計算の不整合**: `TaskStatus.PENDING`以外の状態（`IN_PROGRESS`、`SKIPPED`）の処理が不足
2. **アクション進捗計算の問題**: 習慣アクションの継続日数計算ロジックが不正確
3. **データ検証の不足**: 無効な進捗値（-2未満、100超過）のフィルタリングが不適切
4. **エラーハンドリングの問題**: エラー時のフォールバック値が不明確
5. **モックデータの問題**: テストで使用するモックデータが実際のデータ構造と一致していない

## アーキテクチャ

### コンポーネント構成

```
ProgressCalculationEngine
├── TaskProgressCalculator (タスク進捗計算)
├── ActionProgressCalculator (アクション進捗計算)
│   ├── ExecutionActionCalculator (実行アクション)
│   └── HabitActionCalculator (習慣アクション)
├── SubGoalProgressCalculator (サブ目標進捗計算)
├── GoalProgressCalculator (目標進捗計算)
├── ProgressCache (キャッシュ管理)
├── ProgressValidator (進捗値検証)
└── ErrorHandler (エラーハンドリング)
```

### データフロー

```
Task Status Update
    ↓
calculateTaskProgress()
    ↓
calculateActionProgress()
    ↓
calculateSubGoalProgress()
    ↓
calculateGoalProgress()
    ↓
Update UI / Database
```

## コンポーネント設計

### 1. TaskProgressCalculator

**責務**: タスクの進捗を計算する

**修正内容**:
```typescript
// 修正前
const progress = taskData.status === TaskStatus.COMPLETED ? 100 : 0;

// 修正後
const progress = this.calculateTaskProgressByStatus(taskData.status);

private calculateTaskProgressByStatus(status: TaskStatus): number {
  switch (status) {
    case TaskStatus.COMPLETED:
      return 100;
    case TaskStatus.IN_PROGRESS:
      return 50;
    case TaskStatus.NOT_STARTED:
    case TaskStatus.SKIPPED:
    default:
      return 0;
  }
}
```

**テストケース**:
- 完了タスク → 100%
- 進行中タスク → 50%
- 未着手タスク → 0%
- スキップタスク → 0%

### 2. ActionProgressCalculator

**責務**: アクションの進捗を計算する

#### 2.1 ExecutionActionCalculator

**修正内容**:
```typescript
// 修正前
const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
return Math.round((completedTasks / tasks.length) * 100);

// 修正後
private calculateExecutionActionProgress(tasks: TaskProgress[]): number {
  if (tasks.length === 0) {
    return 0;
  }

  // 各タスクの進捗を合計
  const totalProgress = tasks.reduce((sum, task) => {
    return sum + this.calculateTaskProgressByStatus(task.status);
  }, 0);

  // 平均進捗を計算
  return Math.round(totalProgress / tasks.length);
}
```

**テストケース**:
- 全タスク完了 → 100%
- 半分完了、半分進行中 → 75%
- 全タスク未着手 → 0%

#### 2.2 HabitActionCalculator

**修正内容**:
```typescript
// 修正前
private calculateContinuousDays(tasks: TaskProgress[]): number {
  const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED);
  return completedTasks.length;
}

// 修正後
private calculateContinuousDays(tasks: TaskProgress[]): number {
  if (tasks.length === 0) {
    return 0;
  }

  // 完了日時でソート
  const sortedTasks = [...tasks]
    .filter(task => task.completedAt)
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateA - dateB;
    });

  if (sortedTasks.length === 0) {
    return 0;
  }

  // 連続日数を計算
  let continuousDays = 1;
  let currentDate = new Date(sortedTasks[0].completedAt!);

  for (let i = 1; i < sortedTasks.length; i++) {
    const taskDate = new Date(sortedTasks[i].completedAt!);
    const daysDiff = Math.floor(
      (taskDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      // 連続している
      continuousDays++;
      currentDate = taskDate;
    } else if (daysDiff > 1) {
      // 連続が途切れた場合、最新の連続日数をリセット
      continuousDays = 1;
      currentDate = taskDate;
    }
    // daysDiff === 0 の場合は同じ日なのでカウントしない
  }

  return continuousDays;
}
```

**テストケース**:
- 連続30日完了 → 100%
- 連続24日完了（80%） → 100%
- 連続12日完了（40%） → 50%
- 途中で途切れた場合 → 最新の連続日数で計算

### 3. SubGoalProgressCalculator

**修正内容**:
```typescript
// 修正前
const validProgresses = actionProgresses.filter(
  progress => !isNaN(progress) && progress >= -2 && progress <= 100
);

// 修正後
const validProgresses = actionProgresses.filter(
  progress => !isNaN(progress) && progress >= 0 && progress <= 100
);

// 無効な進捗値がある場合は警告ログを出力
const invalidProgresses = actionProgresses.filter(
  progress => isNaN(progress) || progress < 0 || progress > 100
);

if (invalidProgresses.length > 0) {
  console.warn(
    `Invalid progress values detected for subgoal ${subGoalId}:`,
    invalidProgresses
  );
}
```

**テストケース**:
- 8つのアクション全て有効 → 平均値
- 一部のアクションが無効 → 有効なアクションのみで平均
- 全てのアクションが無効 → エラー

### 4. GoalProgressCalculator

**修正内容**: SubGoalProgressCalculatorと同様の修正を適用

### 5. ProgressValidator

**新規追加**: 進捗値の検証を一元管理

```typescript
export class ProgressValidator {
  /**
   * 進捗値が有効かどうかを検証する
   */
  isValidProgress(progress: number): boolean {
    return !isNaN(progress) && progress >= 0 && progress <= 100;
  }

  /**
   * 進捗値を正規化する（範囲外の値を修正）
   */
  normalizeProgress(progress: number): number {
    if (isNaN(progress)) {
      return 0;
    }
    if (progress < 0) {
      return 0;
    }
    if (progress > 100) {
      return 100;
    }
    return Math.round(progress);
  }

  /**
   * 進捗値の配列から有効な値のみをフィルタリング
   */
  filterValidProgresses(progresses: number[]): number[] {
    return progresses.filter(p => this.isValidProgress(p));
  }

  /**
   * 平均進捗を計算する
   */
  calculateAverage(progresses: number[]): number {
    const validProgresses = this.filterValidProgresses(progresses);
    
    if (validProgresses.length === 0) {
      return 0;
    }

    const sum = validProgresses.reduce((acc, p) => acc + p, 0);
    return Math.round(sum / validProgresses.length);
  }
}
```

### 6. ErrorHandler

**修正内容**: エラー時のフォールバック値を明確化

```typescript
// 修正前
return handlingResult.value as T;

// 修正後
private getDefaultProgressValue(entityType?: string): number {
  // エラー時は0%を返す（安全側に倒す）
  return 0;
}

async executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  entityId?: string,
  entityType?: 'task' | 'action' | 'subgoal' | 'goal'
): Promise<T> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Calculation timeout'));
      }, 30000);
    });

    const result = await Promise.race([operation(), timeoutPromise]);
    return result;
  } catch (error) {
    console.error(
      `Error calculating progress for ${entityType} ${entityId}:`,
      error
    );

    // エラー時は0%を返す
    return this.getDefaultProgressValue(entityType) as T;
  }
}
```

## データモデル

### TaskProgress

```typescript
interface TaskProgress {
  id: string;
  progress: number; // 0-100
  status: TaskStatus;
  completedAt?: Date;
}

enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}
```

### ActionProgress

```typescript
interface ActionProgress {
  id: string;
  progress: number; // 0-100
  type: ActionType;
  tasks: TaskProgress[];
  targetDays?: number; // 習慣アクションの場合のみ
}

enum ActionType {
  EXECUTION = 'execution',
  HABIT = 'habit'
}
```

### SubGoalProgress

```typescript
interface SubGoalProgress {
  id: string;
  progress: number; // 0-100
  actions: ActionProgress[];
}
```

### GoalProgress

```typescript
interface GoalProgress {
  id: string;
  progress: number; // 0-100
  subGoals: SubGoalProgress[];
}
```

## エラーハンドリング戦略

### エラーの分類

1. **データ取得エラー**: API通信エラー、データ不存在
   - 対応: エラーログ記録 + 0%を返す

2. **データ検証エラー**: 無効なデータ構造、型不一致
   - 対応: エラーログ記録 + 0%を返す

3. **計算エラー**: NaN、無限大、範囲外の値
   - 対応: 警告ログ記録 + 正規化して続行

4. **タイムアウトエラー**: 30秒以内に計算完了しない
   - 対応: エラーログ記録 + 0%を返す

5. **循環依存エラー**: データ構造の循環参照
   - 対応: エラーログ記録 + 例外をスロー

### エラーログフォーマット

```typescript
{
  timestamp: Date,
  level: 'error' | 'warn',
  entityType: 'task' | 'action' | 'subgoal' | 'goal',
  entityId: string,
  operation: 'calculateProgress' | 'fetchData' | 'validateData',
  error: {
    message: string,
    code?: string,
    stack?: string
  },
  fallbackValue: number
}
```

## パフォーマンス最適化

### キャッシュ戦略

**現状維持**: 既存のキャッシュ機構は適切に動作しているため、修正不要

**キャッシュキー**:
- タスク: `task:{taskId}`
- アクション: `action:{actionId}`
- サブ目標: `subgoal:{subGoalId}`
- 目標: `goal:{goalId}`

**キャッシュ有効期限**: 5分

**キャッシュ無効化**:
- タスク更新時: 関連するアクション、サブ目標、目標のキャッシュをクリア
- 手動再計算時: 全関連キャッシュをクリア

### 計算時間の目標

- タスク進捗計算: < 100ms
- アクション進捗計算: < 500ms
- サブ目標進捗計算: < 1秒
- 目標進捗計算: < 2秒

## テスト戦略

### ユニットテスト

**修正対象テスト**:
1. `calculateTaskProgress` - 4つの状態全てをテスト
2. `calculateActionProgress` - 実行/習慣アクションの両方をテスト
3. `calculateSubGoalProgress` - 無効な進捗値のフィルタリングをテスト
4. `calculateGoalProgress` - 無効な進捗値のフィルタリングをテスト
5. エラーハンドリング - フォールバック値が0%であることをテスト

**新規追加テスト**:
1. `ProgressValidator` - 全メソッドのテスト
2. 習慣アクションの連続日数計算 - 複数パターンのテスト
3. 境界値テスト - 0%, 50%, 100%の正確性

### 統合テスト

**テストシナリオ**:
1. タスク完了 → アクション進捗更新 → サブ目標進捗更新 → 目標進捗更新
2. 複数タスク同時完了 → 正しい進捗計算
3. キャッシュの動作確認 → 2回目の計算が高速

### パフォーマンステスト

**テストケース**:
1. 1000個のタスクを持つアクション → 500ms以内
2. 8個のサブ目標を持つ目標 → 2秒以内
3. 深い階層の再計算 → 2秒以内

## セキュリティ考慮事項

**現状維持**: 既存のセキュリティチェック機構は適切に動作しているため、修正不要

- データアクセス権限チェック
- データ整合性チェック
- 改ざん検出

## 実装順序

1. **ProgressValidator の実装** (1時間)
   - 進捗値検証ロジックの実装
   - ユニットテストの作成

2. **TaskProgressCalculator の修正** (1時間)
   - 4つの状態に対応した進捗計算
   - ユニットテストの修正

3. **ExecutionActionCalculator の修正** (1時間)
   - タスク進捗の合計による計算
   - ユニットテストの修正

4. **HabitActionCalculator の修正** (2時間)
   - 連続日数計算ロジックの実装
   - ユニットテストの修正

5. **SubGoalProgressCalculator の修正** (1時間)
   - 無効な進捗値のフィルタリング
   - ユニットテストの修正

6. **GoalProgressCalculator の修正** (1時間)
   - 無効な進捗値のフィルタリング
   - ユニットテストの修正

7. **ErrorHandler の修正** (1時間)
   - フォールバック値の明確化
   - エラーログの改善

8. **統合テスト** (2時間)
   - 全階層の進捗計算テスト
   - パフォーマンステスト

9. **最終検証** (2時間)
   - 全27テストケースの実行
   - コードレビュー
   - ドキュメント更新

**合計推定時間**: 12時間（1.5人日）

## 成功基準

1. **全テスト成功**: 27個のテストケース全てが成功する
2. **パフォーマンス**: 要件6で定義された時間制約を満たす
3. **コードカバレッジ**: 80%以上を維持
4. **エラーハンドリング**: 全てのエラーケースで適切なフォールバック値を返す
5. **データ整合性**: 無効な進捗値が上位階層に伝播しない

## リスクと対策

### リスク1: 習慣アクションの連続日数計算が複雑

**対策**: 
- 段階的に実装（まず単純なカウント、次に連続性チェック）
- 十分なテストケースを用意

### リスク2: 既存のキャッシュ機構への影響

**対策**:
- キャッシュキーの変更は最小限に
- キャッシュ無効化ロジックの動作確認

### リスク3: パフォーマンス劣化

**対策**:
- 各修正後にパフォーマンステストを実行
- ボトルネックが見つかった場合は最適化

## 今後の改善案

1. **リアルタイム進捗更新**: WebSocketを使用した即時反映
2. **進捗予測機能**: 過去のデータから完了予測日を算出
3. **進捗アラート**: 進捗が遅れている場合の通知
4. **進捗レポート**: 週次・月次の進捗サマリー生成
