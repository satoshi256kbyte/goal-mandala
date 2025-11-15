# テストエラー分析レポート

## 実行日時
2025年11月15日

## テスト実行結果サマリー

```
Test Files:  149 failed | 16 passed (167)
Tests:       1992 failed | 1066 passed | 2 skipped (3095)
Errors:      7 unhandled errors
Duration:    769.71s (約12.8分)
```

## エラー分類

### 1. セットアップ・環境エラー（優先度: 最高）

#### 1.1 requestAnimationFrame未定義エラー
**影響範囲**: アニメーション関連テスト全般
**エラー内容**:
```
ReferenceError: requestAnimationFrame is not defined
```
**発生箇所**:
- `src/utils/animation-performance.ts:165:7`
- `src/components/common/ProgressBar.test.tsx`
- `src/hooks/__tests__/useAchievementAnimation.test.tsx`

**原因**: jsdom環境で`requestAnimationFrame`がグローバルに定義されていない

**修正方針**:
- `src/test/setup.ts`にグローバルモックを追加
- タイマーのクリーンアップ処理を追加

#### 1.2 Worker予期せぬ終了エラー
**影響範囲**: テスト実行全般
**エラー内容**:
```
Error: Worker exited unexpectedly
```

**原因**: メモリ不足またはテスト分離の問題

**修正方針**:
- メモリ設定の最適化（NODE_OPTIONS="--max-old-space-size=4096"）
- テスト分離設定の見直し

### 2. モック・スタブエラー（優先度: 高）

#### 2.1 localStorage認証トークンエラー
**影響範囲**: goals-api関連テスト（多数）
**エラー内容**:
```
GoalsApiError: 認証エラーが発生しました。再度ログインしてください。
Serialized Error: { statusCode: 401, code: 'UNAUTHORIZED' }
```
**発生箇所**:
- `src/services/mandala-list/__tests__/goals-api.test.ts`（複数テスト）

**原因**: `localStorage.getItem('auth_token')`がnullを返している

**修正方針**:
- 各テストの`beforeEach`で`localStorage.setItem('auth_token', 'mock-token')`を設定
- グローバルなlocalStorageモックの改善

#### 2.2 Context Provider未設定エラー
**影響範囲**: Context関連テスト（多数）
**エラー内容**:
```
TypeError: Cannot read properties of null (reading 'mandalas')
TypeError: Cannot read properties of null (reading 'validateField')
TypeError: Cannot read properties of null (reading 'submitForm')
```
**発生箇所**:
- `src/hooks/mandala-list/__tests__/useMandalaList.test.ts`
- `src/hooks/useGoalForm.test.ts`
- `src/contexts/ActionContext.test.tsx`

**原因**: テストでContextProviderがラップされていない、またはモックが不適切

**修正方針**:
- テストユーティリティ関数を作成（`renderWithProviders`）
- 必要なProviderをすべて含むラッパーコンポーネントを作成

### 3. DOM要素クエリエラー（優先度: 中）

#### 3.1 要素が見つからないエラー
**影響範囲**: コンポーネントテスト全般（多数）
**エラー内容**:
```
Unable to find an element by: [data-testid="industry-select"]
Unable to find an accessible element with the role "button" and name `/次へ/i`
Unable to find an accessible element with the role "form"
Unable to find an accessible element with the role "alert"
```
**発生箇所**:
- `src/components/profile/__tests__/ProfileSetupForm.test.tsx`（多数）
- `src/contexts/ActionContext.test.tsx`（多数）

**原因**: 
- コンポーネントが正しくレンダリングされていない（Providerの問題）
- `data-testid`が実装されていない
- 非同期レンダリングの待機が不足

**修正方針**:
- Providerの適切な設定
- `findBy*`を使用して非同期レンダリングを待機
- 必要に応じて`data-testid`を追加

### 4. 非同期処理エラー（優先度: 高）

#### 4.1 タイムアウトエラー
**影響範囲**: 非同期操作テスト
**エラー内容**:
```
Test timed out in 3000ms.
```
**発生箇所**:
- `src/contexts/ActionContext.test.tsx`（loadActions, saveDraft, restoreDraft）

**原因**: 
- 非同期処理が完了していない
- モックが適切に解決されていない

**修正方針**:
- `waitFor`を使用して非同期処理の完了を待機
- モックの`mockResolvedValue`を適切に設定
- タイムアウト値を必要に応じて延長

### 5. テストロジックエラー（優先度: 中）

#### 5.1 期待値の不一致
**影響範囲**: 特定のテストケース
**エラー内容**:
```
expected 'increasing' to be 'stable' // Object.is equality
expected 0 to be greater than 0
expected "spy" to be called at least once
expected { …(9) } to be null
```
**発生箇所**:
- `src/services/__tests__/progress-history-analysis.test.ts`（3件）
- `src/utils/__tests__/animation-utils.test.ts`（4件）

**原因**: 
- テストの期待値が実装と一致していない
- モックの設定が不適切
- テストロジックの誤り

**修正方針**:
- 実装を確認して期待値を修正
- モックの動作を確認
- テストケースの見直し

## エラー修正の優先順位

### フェーズ1: セットアップとグローバルモック（最高優先度）
1. `requestAnimationFrame`のグローバルモック追加
2. `localStorage`のグローバルモック改善
3. タイマーのクリーンアップ処理追加
4. メモリ設定の最適化

**推定影響**: 約500-700件のエラー解消

### フェーズ2: Context Provider設定（高優先度）
1. テストユーティリティ関数`renderWithProviders`の作成
2. 必要なProviderをすべて含むラッパーの作成
3. 既存テストへの適用

**推定影響**: 約800-1000件のエラー解消

### フェーズ3: 非同期処理の修正（高優先度）
1. `waitFor`の適切な使用
2. モックの`mockResolvedValue`設定
3. タイムアウト設定の最適化

**推定影響**: 約200-300件のエラー解消

### フェーズ4: 個別テストケースの修正（中優先度）
1. DOM要素クエリの修正
2. 期待値の修正
3. テストロジックの見直し

**推定影響**: 約100-200件のエラー解消

## 次のステップ

1. **タスク13.2**: テストセットアップの修正（フェーズ1）
2. **タスク13.3**: モック・スタブの修正（フェーズ2）
3. **タスク13.4**: 非同期処理の修正（フェーズ3）
4. **タスク13.5-13.6**: 個別修正（フェーズ4）

## 推定工数

- フェーズ1: 0.5人日
- フェーズ2: 1.0人日
- フェーズ3: 0.5人日
- フェーズ4: 1.0人日
- **合計**: 約3人日

## 備考

- 現在のテスト実行時間（約12.8分）は目標（5分以内）を大幅に超過
- メモリ不足エラーが発生しているため、テスト設定の最適化が必要
- エラー解消後、テスト実行時間の再測定が必要
