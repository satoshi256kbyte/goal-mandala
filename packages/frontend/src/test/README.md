# テストユーティリティガイド

## 概要

このディレクトリには、テストを効率的に書くためのユーティリティとヘルパー関数が含まれています。

## ファイル構成

- `setup.ts`: グローバルなテストセットアップ（自動的に読み込まれる）
- `test-utils.tsx`: テスト用のヘルパー関数とモックデータ

## 使用方法

### 基本的なコンポーネントテスト

```typescript
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('正しくレンダリングされる', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### モックデータの使用

```typescript
import { mockData } from '@/test/test-utils';

it('目標データを表示する', () => {
  const goal = mockData.goal;
  renderWithProviders(<GoalCard goal={goal} />);
  expect(screen.getByText(goal.title)).toBeInTheDocument();
});
```

### localStorage操作

```typescript
import { storage } from '@/test/test-utils';

beforeEach(() => {
  // 認証トークンを設定
  storage.setAuthToken('custom-token');
});

afterEach(() => {
  // ストレージをクリア
  storage.clearAll();
});
```

### 非同期処理の待機

```typescript
import { wait, waitFor, screen } from '@/test/test-utils';

// パターン1: waitForを使用（推奨）
it('非同期データを表示する', async () => {
  renderWithProviders(<AsyncComponent />);

  // 要素が表示されるまで待機
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});

// パターン2: findBy*を使用（より簡潔）
it('非同期データを表示する', async () => {
  renderWithProviders(<AsyncComponent />);

  // findBy*は自動的に待機する
  const element = await screen.findByText('Loaded');
  expect(element).toBeInTheDocument();
});

// パターン3: waitヘルパーを使用
it('複雑な非同期処理', async () => {
  renderWithProviders(<ComplexComponent />);

  // 次のティックまで待機
  await wait.nextTick();

  // 条件が真になるまで待機
  await wait.forCondition(() => screen.queryByText('Ready') !== null);

  // 指定時間待機
  await wait.ms(100);
});
```

### カスタムQueryClientの使用

```typescript
import { renderWithProviders, createTestQueryClient } from '@/test/test-utils';

it('カスタムQueryClientを使用する', () => {
  const queryClient = createTestQueryClient();

  renderWithProviders(<MyComponent />, { queryClient });
});
```

## グローバルモック

`setup.ts`で以下のグローバルモックが自動的に設定されます：

- `ResizeObserver`
- `IntersectionObserver`
- `requestAnimationFrame` / `cancelAnimationFrame`
- `matchMedia`
- `fetch`
- `localStorage` / `sessionStorage`

## 自動クリーンアップ

各テスト後に以下が自動的にクリーンアップされます：

- React コンポーネント（`cleanup()`）
- すべてのタイマー（`vi.clearAllTimers()`）
- すべてのanimationFrame
- localStorage / sessionStorage
- すべてのモック（`vi.clearAllMocks()`）

## ベストプラクティス

### 1. renderWithProvidersを使用する

```typescript
// ❌ 悪い例
render(<MyComponent />);

// ✅ 良い例
renderWithProviders(<MyComponent />);
```

### 2. 非同期処理を適切に待機する

```typescript
// ❌ 悪い例
it('データを表示する', () => {
  renderWithProviders(<AsyncComponent />);
  expect(screen.getByText('Data')).toBeInTheDocument(); // エラー！
});

// ✅ 良い例
it('データを表示する', async () => {
  renderWithProviders(<AsyncComponent />);
  const element = await screen.findByText('Data');
  expect(element).toBeInTheDocument();
});
```

### 3. モックデータを再利用する

```typescript
// ❌ 悪い例
const goal = {
  id: '1',
  title: 'Test',
  // ... 多くのプロパティ
};

// ✅ 良い例
import { mockData } from '@/test/test-utils';
const goal = mockData.goal;
```

### 4. localStorageを適切に管理する

```typescript
// ❌ 悪い例
localStorage.setItem('auth_token', 'token');

// ✅ 良い例
import { storage } from '@/test/test-utils';
storage.setAuthToken('token');
```

## トラブルシューティング

### 要素が見つからない

```typescript
// getBy* は要素が存在しない場合エラーをスロー
expect(screen.getByText('Text')).toBeInTheDocument();

// queryBy* は要素が存在しない場合nullを返す
expect(screen.queryByText('Text')).not.toBeInTheDocument();

// findBy* は非同期で要素を待機
const element = await screen.findByText('Text');
```

### タイムアウトエラー

```typescript
// タイムアウトを延長
await waitFor(
  () => {
    expect(screen.getByText('Text')).toBeInTheDocument();
  },
  { timeout: 5000 }
);
```

### モックが機能しない

```typescript
// beforeEachでモックをクリア
beforeEach(() => {
  vi.clearAllMocks();
});

// モックの設定を確認
const mockFn = vi.fn();
mockFn.mockResolvedValue('value');
```

## 参考リンク

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest](https://vitest.dev/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
