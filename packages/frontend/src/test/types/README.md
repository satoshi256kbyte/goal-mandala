# テスト用型定義

このディレクトリには、テストで使用するモックオブジェクトの型定義が含まれています。

## 目的

- `as any` の使用を最小限に抑え、型安全性を向上させる
- テストコードの可読性と保守性を向上させる
- モックオブジェクトの一貫性を保つ

## ファイル

### mock-types.ts

テストで使用する主要なモック型定義とヘルパー関数を提供します。

#### 提供される型

- `MockAuthUser`: AWS Amplify AuthUser型のモック
- `MockAuthSession`: AWS Amplify FetchAuthSessionResult型のモック
- `MockNavigator`: Navigator型のモック（オンライン状態テスト用）
- `MockStorage`: LocalStorage型のモック

#### ヘルパー関数

- `createMockAuthUser()`: モックAuthUserを作成
- `createMockAuthSession()`: モックAuthSessionを作成
- `createMockNavigator()`: モックNavigatorを作成

## 使用例

### 認証関連のテスト

```typescript
import { createMockAuthUser, createMockAuthSession } from '../test/types/mock-types';

// デフォルト値を使用
vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser());
vi.mocked(fetchAuthSession).mockResolvedValue(createMockAuthSession());

// カスタム値を使用
vi.mocked(getCurrentUser).mockResolvedValue(
  createMockAuthUser({ username: 'custom@example.com' })
);
```

### Navigator関連のテスト

```typescript
import { createMockNavigator } from '../test/types/mock-types';

// オンライン状態
global.navigator = createMockNavigator() as Navigator;

// オフライン状態
global.navigator = createMockNavigator({ onLine: false }) as Navigator;
```

## 型安全性のベストプラクティス

### 推奨される使用方法

1. **ヘルパー関数を使用する**: `createMock*()` 関数を使用してモックを作成
2. **型キャストを最小限にする**: 必要な場合のみ `as` キャストを使用
3. **部分的なオーバーライド**: デフォルト値を使用し、必要な部分のみオーバーライド

### 避けるべきパターン

```typescript
// ❌ 避けるべき: as any の多用
const mockUser = { username: 'test' } as any;

// ✅ 推奨: 型安全なヘルパー関数
const mockUser = createMockAuthUser({ username: 'test' });
```

## 意図的な型エラーのテスト

無効な入力をテストする場合、`as any` の使用は許容されます：

```typescript
// 無効な型をテストする場合は as any を使用
const result = validator.validateProgressValue('50' as any, 'task', 'task-123');
expect(result.isValid).toBe(false);
```

## プライベートメソッドへのアクセス

統合テストでプライベートメソッドにアクセスする場合、`as any` の使用は許容されます：

```typescript
// プライベートメソッドのモック
const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
```

## 今後の改善

- より多くのモック型定義を追加
- テストユーティリティ関数の拡充
- 型定義の自動生成ツールの検討
