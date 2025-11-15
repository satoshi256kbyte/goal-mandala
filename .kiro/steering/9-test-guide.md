# テストガイド

## テスト戦略

### テストピラミッド

テストは以下の3層構造で実装します：  

- **E2Eテスト（少数）**: Playwrightによる主要ユーザーフローのテスト
- **統合テスト（中程度）**: API + データベースの結合テスト
- **ユニットテスト（多数）**: Jest + React Testing Libraryによる単体テスト

### テスト方針

- **ユニットテスト**: 80%以上のカバレッジ目標、コア機能に集中
- **統合テスト**: 最小限の重要フローのみ（認証、目標作成、プロフィール設定）
- **E2Eテスト**: 主要なユーザーフローをカバー（認証、目標作成、マンダラ編集）
- **セキュリティテスト**: 認証・認可の検証

**テスト実行時は、必ずバックグラウンドでタイムアウトを設定して実行してください。**
**どちらかが欠けるとループや何らかの入力待ちが発生した時に、無限にテストが動き続けてしまいます。**
**また、テスト実行は、極力テスト実行の進捗をリアルタイム表示する形で実行してください。どこかで止まる場合にリアルタイム表示がある方が特定しやすいです。**

### 重要な用語解説

#### カスタムマッチャー（Custom Matcher）

カスタムマッチャーは、テストフレームワークの標準的なアサーション（`expect`）を拡張して、独自の検証ロジックを追加する機能です。

**目的**:

- テストコードの可読性向上
- 複雑な検証ロジックの再利用
- ドメイン固有の検証を簡潔に記述

**実装例**:

```typescript
// packages/frontend/src/test/utils/matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeValidGoal(received: unknown) {
    const isValid =
      typeof received === 'object' &&
      received !== null &&
      'id' in received &&
      'title' in received &&
      'status' in received &&
      'progress' in received;

    return {
      pass: isValid,
      message: () =>
        isValid
          ? `Expected ${JSON.stringify(received)} not to be a valid goal`
          : `Expected ${JSON.stringify(received)} to be a valid goal`,
    };
  },
});

// 使用例
it('should return valid goal', () => {
  const goal = createGoal();
  expect(goal).toBeValidGoal(); // カスタムマッチャーを使用
});
```

**メリット**:

- `expect(goal.id).toBeDefined()` + `expect(goal.title).toBeDefined()` + ... を1行で記述可能
- ビジネスロジックに沿った検証が可能
- テストコードの保守性が向上

#### テスト分離（isolate）

テスト分離は、各テストを独立した環境で実行する機能です。Vitestでは`isolate`オプションで制御します。

**isolate: true（デフォルト）**:

- 各テストファイルが独立したプロセスで実行される
- テスト間の副作用が完全に分離される
- メモリ使用量が増加し、実行時間が長くなる

**isolate: false（高速モード）**:

- 複数のテストファイルが同じプロセスで実行される
- テスト実行時間が大幅に短縮される（本プロジェクトでは75%短縮）
- グローバル状態の管理に注意が必要

**設定例**:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    isolate: false, // テスト分離を無効化（高速化）
  },
});
```

**isolate: false を使用する場合の注意点**:

1. **グローバル状態のクリーンアップが必須**

   ```typescript
   afterEach(() => {
     cleanup();
     vi.clearAllMocks();
     localStorage.clear();
     sessionStorage.clear();
   });
   ```

2. **テストの独立性を保つ**
   - 各テストで必要なデータを準備
   - 他のテストに依存しない設計
   - 実行順序に依存しない

3. **副作用の管理**
   - グローバル変数の変更に注意
   - DOMの状態をクリア
   - タイマーやイベントリスナーの解除

**本プロジェクトでの選択**:

- 開発中の高速フィードバックを優先し、`isolate: false`を採用
- 適切なクリーンアップ処理により、テストの独立性を確保
- CI/CD環境でも同じ設定を使用し、一貫性を保つ

### テスト作成のベストプラクティス

#### テストの独立性を保つ

- 各テストは独立して実行可能にする
- テストデータは各テストで準備する
- グローバル状態（localStorage等）は各テスト後にクリアする

#### 適切な待機処理

- 非同期処理には`waitFor`または`findBy*`を使用
- タイムアウトは3000ms程度に設定
- `act()`警告が出た場合は適切にラップする

#### DOM要素クエリの優先順位

1. `getByRole` - アクセシビリティを考慮した最優先の方法
2. `getByLabelText` - フォーム要素に適している
3. `getByTestId` - 上記で特定できない場合の最終手段

#### 4. モックの適切な管理

- モックの型定義を実際のAPIと一致させる
- 各テスト前に`vi.clearAllMocks()`でリセット
- モックファクトリーを作成して再利用する

#### 5. テストの構造

```typescript
describe('Component', () => {
  beforeEach(() => {
    // セットアップ
  });

  afterEach(() => {
    // クリーンアップ
  });

  describe('rendering', () => {
    it('should render correctly', () => {});
  });

  describe('user interactions', () => {
    it('should handle click', async () => {});
  });

  describe('error handling', () => {
    it('should display error message', async () => {});
  });
});
```

#### 6. テストの命名規則

- `should + 動詞 + 期待される結果` の形式を使用
- 具体的で分かりやすい名前をつける
- 例: `should display error message when form is invalid`

#### 7. アサーションの順序（AAA パターン）

```typescript
it('should update goal', async () => {
  // Arrange（準備）
  const mockGoal = generateMockGoal();
  render(<GoalForm goal={mockGoal} />);

  // Act（実行）
  const titleInput = screen.getByLabelText('タイトル');
  fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
  
  // Assert（検証）
  await waitFor(() => {
    expect(mockUpdateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated Title' })
    );
  });
});
```

### テスト作成時の注意事項

#### 避けるべきパターン

##### 実装の詳細をテストしない

```typescript
// Bad - 内部状態をテスト
expect(component.state.isLoading).toBe(true);

// Good - ユーザーが見る結果をテスト
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

##### 複数の関心事を1つのテストに含めない

```typescript
// Bad
it('should handle form submission and navigation', async () => {
  // フォーム送信のテスト
  // ナビゲーションのテスト
});

// Good
it('should submit form successfully', async () => {});
it('should navigate after successful submission', async () => {});
```

##### 過度なモックを避ける

```typescript
// Bad - すべてをモック
vi.mock('@/components/Button');
vi.mock('@/components/Input');
vi.mock('@/components/Form');

// Good - 必要最小限のモック
vi.mock('@/api/goals');
```

#### 推奨パターン

1. **テストユーティリティの活用**

```typescript
// renderWithProviders を使用
import { renderWithProviders } from '@/test/utils/render';

it('should render with context', () => {
  renderWithProviders(<Component />, {
    initialRoute: '/goals',
    authToken: 'mock-token',
  });
});
```

##### テストデータジェネレーターの使用

```typescript
import { generateMockGoal } from '@/test/utils/generators';

it('should display goal', () => {
  const goal = generateMockGoal({ title: 'Custom Title' });
  render(<GoalCard goal={goal} />);
});
```

##### カスタムマッチャーの活用

```typescript
expect(goal).toBeValidGoal();
expect(response).toMatchApiSchema();
```

### トラブルシューティング

#### よくある問題と解決方法

1. **テストがタイムアウトする**
   - タイムアウトを延長: `it('test', async () => {}, 10000)`
   - `waitFor`のタイムアウトを延長: `{ timeout: 5000 }`

2. **act()警告が出る**
   - `act()`でラップする
   - `waitFor`を使用する

3. **メモリリークが発生する**
   - `afterEach`でクリーンアップを追加
   - タイマーをクリアする

詳細なトラブルシューティングガイドは、`.kiro/specs/2.4.9-test-architecture-overhaul/test-fix-guide.md`を参照してください。

## ユニットテスト

### バックエンドテスト（Jest）

#### テスト設定

Jest設定でTypeScript環境とカバレッジ要件を定義します。  

#### 設定内容

- TypeScript対応
- カバレッジ閾値80%
- テストファイルパターン
- セットアップファイル

#### AIサービステスト

- サブ目標生成機能（8個生成の検証）
- アクション生成機能
- タスク生成機能
- エラーハンドリング
- APIレスポンスの形式検証

#### データベースサービステスト

- CRUD操作の正常動作
- 外部キー制約の検証
- バリデーションエラーの処理
- トランザクション処理

### フロントエンドテスト（React Testing Library）

#### テスト実行戦略

フロントエンドでは、開発フローに応じて最適なテストコマンドを使い分けます：

**テストコマンド一覧**:

```bash
# 基本テスト（高速・カバレッジなし、デフォルト）
pnpm --filter @goal-mandala/frontend test

# ユニットテストのみ実行
pnpm --filter @goal-mandala/frontend test:unit

# 統合テストのみ実行
pnpm --filter @goal-mandala/frontend test:integration

# カバレッジ付きテスト（CI/CD用）
pnpm --filter @goal-mandala/frontend test:coverage

# E2Eテスト
pnpm --filter @goal-mandala/frontend test:e2e

# 開発用ウォッチモード
pnpm --filter @goal-mandala/frontend test:watch
```

**パフォーマンス目標**:

| テストタイプ | 目標時間 | 用途 |
|------------|---------|------|
| test | 60秒以内 | 開発中の高速フィードバック |
| test:unit | 60秒以内 | コミット前の品質確認 |
| test:integration | 30秒以内 | 統合テスト実行 |
| test:e2e | 120秒以内 | E2Eテスト実行 |
| test:coverage | JSON形式のみ | カバレッジレポート生成 |

**開発フローでの使い分け**:

1. **開発中（頻繁な実行）**: `test` または `test:watch`
   - カバレッジ計算なし
   - テスト分離なし
   - 高速フィードバック

2. **コミット前（品質確認）**: `test:unit`
   - ユニットテストのみ
   - カバレッジ計算なし
   - 統合テスト除外

3. **PR作成前（完全チェック）**: `test:coverage`
   - 全テスト実行
   - カバレッジレポート生成（JSON形式のみ）
   - 品質ゲート確認

#### コンポーネントテスト

React コンポーネントのテストでは以下を検証します：  

#### テスト内容

- コンポーネントの正常レンダリング
- プロパティの正しい表示
- ユーザーインタラクション
- 状態変更の検証

#### カスタムフックテスト

- フックの初期状態
- 状態更新の動作
- 副作用の実行
- エラーハンドリング

## 統合テスト

### APIテスト

- エンドポイントの正常動作
- 認証・認可の検証
- リクエスト・レスポンスの形式
- エラーレスポンスの検証

### データベーステスト

- マンダラ構造の完全作成
- カスケード削除の動作
- 制約違反の検証
- パフォーマンスの確認

## E2Eテスト（Playwright）

**最小限の重要フローのみテスト**:

- Chromiumのみ対応（Firefox、Safariは除外）
- CI では1並列実行
- スクリーンショット・トレースは失敗時のみ
- タイムアウト: 30秒
- リトライ設定: CI では2回

### 認証フローテスト

- ログイン成功パターン
- サインアップフロー

### マンダラ作成フローテスト

- 目標入力からマンダラ完成まで
- AI処理の待機
- サブ目標・アクションの編集

### マンダラ編集フローテスト

- マンダラチャートの編集
- 進捗の反映

## テスト実行

### ローカル開発でのテスト実行

**高速フィードバックループ**:

```text
開発中 → test (60秒以内)
  ↓
コミット前 → test:unit (60秒以内)
  ↓
PR作成 → test:coverage + test:integration (90秒以内)
  ↓
マージ前 → test:e2e (120秒以内)
```

**テスト実行のベストプラクティス**:

1. **開発中は基本テストを頻繁に実行**
   - `test` で即座にフィードバック
   - カバレッジ計算をスキップして高速化
   - テスト分離なしで高速実行

2. **コミット前にユニットテストを確認**
   - `test:unit` で品質を担保
   - 統合テストは除外して実行時間を短縮

3. **PR作成前に完全チェック**
   - `test:coverage` でカバレッジ確認（JSON形式のみ）
   - `test:integration` で統合テスト実行

4. **タイムアウト設定を活用**
   - 無限ループやハングを防止
   - CI/CD環境でも安全に実行

### CI/CDでのテスト実行

- プルリクエスト時のユニットテスト
- マージ時のE2Eテスト
- カバレッジレポートの生成
- テスト結果の通知

**CI/CD最適化**:

- 並列実行数の最適化（maxConcurrency: 4, maxForks: 2）
- タイムアウト設定の適切な調整（testTimeout: 3000ms）
- レポート形式の最適化（dot reporter）
- テスト分離の無効化（isolate: false）
- カバレッジはデフォルトで無効化
- キャッシュ戦略の活用

## テストデータ管理

### フィクスチャ

#### データ種類

- ユーザーデータ
- 目標データ
- サブ目標データ
- アクションデータ
- タスクデータ

### テストデータベース

#### 管理内容

- テストユーザーの作成
- テストデータの投入
- テスト後のクリーンアップ
- データの分離

## 品質ゲート

### カバレッジ要件

以下のカバレッジ要件を設定します：  

- **ユニットテスト**: 80%以上
- **統合テスト**: 主要APIエンドポイント100%
- **E2Eテスト**: 主要ユーザーフロー100%

### パフォーマンス要件

以下のパフォーマンス要件を設定します：  

- **API応答時間**: 95%ile < 2秒
- **ページロード時間**: < 3秒
- **AI生成時間**: < 30秒

### テスト実行パフォーマンス要件

フロントエンドテストの実行時間目標：

| テストタイプ | 目標時間 | 現在の実装 |
|------------|---------|-----------|
| test | 60秒以内 | カバレッジなし、分離なし |
| test:unit | 60秒以内 | ユニットテストのみ |
| test:integration | 30秒以内 | 統合テストのみ（最小限） |
| test:e2e | 120秒以内 | E2Eテスト（重要フローのみ） |
| test:coverage | JSON形式のみ | カバレッジレポート生成 |

**最適化手法**:

1. **カバレッジ計算の制御**
   - デフォルトでカバレッジ計算を無効化
   - 必要な時のみ `test:coverage` で実行
   - カバレッジレポートはJSON形式のみ（HTML・テキスト形式は生成しない）

2. **並列実行の最適化**
   - maxConcurrency: 4（メモリ効率優先）
   - maxForks: 2（安定性重視）
   - CPU数に応じた並列実行

3. **テスト分離の制御**
   - デフォルトで分離を無効化（isolate: false）
   - 高速実行を優先

4. **タイムアウト設定の最適化**
   - testTimeout: 3000ms（短縮）
   - hookTimeout: 2000ms（短縮）
   - teardownTimeout: 1000ms（短縮）

5. **統合テストの分離**
   - ユニットテストと統合テストを分離
   - 必要に応じて個別実行可能

6. **テストファイルの整理**
   - 1コンポーネント = 1テストファイル
   - 重複テストの削除
   - コア機能に集中

### 品質チェック

以下の品質チェックを実行します：  

- **ユニットテスト実行**: pnpm test:unit
- **統合テスト実行**: pnpm test:integration
- **E2Eテスト実行**: pnpm test:e2e
- **静的解析**: pnpm lint
- **型チェック**: pnpm type-check
- **カバレッジ確認**: pnpm test:coverage（JSON形式のみ）

## テスト環境管理

### 環境分離

テスト環境は以下のように分離します：  

- **ユニットテスト**: インメモリデータベース
- **統合テスト**: 専用テストデータベース
- **E2Eテスト**: ステージング環境

### データクリーンアップ

テスト実行後は以下のクリーンアップを実行します：  

- テストデータの削除
- データベース状態のリセット
- キャッシュのクリア
- 一時ファイルの削除
