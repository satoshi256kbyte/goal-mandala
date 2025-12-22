# 設計書

## 概要

このドキュメントは、Vitest 1.0.0から4.0への更新に関する設計を定義します。Vitest 4は、Pool Rewriteによるパフォーマンス改善、V8カバレッジプロバイダーの精度向上、設定のシンプル化などの改善を提供します。

## アーキテクチャ

### 現在の構成（Vitest 1.0.0）

```
packages/frontend/
├── package.json (vitest: ^1.0.0, @vitest/coverage-v8: ^1.0.0)
├── vitest.config.ts (旧設定形式)
├── vite.config.ts
└── src/
    ├── test/
    │   └── setup.ts
    └── **/*.test.{ts,tsx}
```

### 更新後の構成（Vitest 4.0）

```
packages/frontend/
├── package.json (vitest: ^4.0.0, @vitest/coverage-v8: ^4.0.0)
├── vitest.config.ts (新設定形式)
├── vite.config.ts
└── src/
    ├── test/
    │   └── setup.ts
    └── **/*.test.{ts,tsx}
```

## コンポーネントとインターフェース

### 1. パッケージ依存関係

#### 更新対象パッケージ

| パッケージ | 現在のバージョン | 更新後のバージョン |
|-----------|----------------|------------------|
| vitest | ^1.0.0 | ^4.0.16 |
| @vitest/coverage-v8 | ^1.0.0 | ^4.0.16 |

#### 依存関係の互換性

- **vite**: ^5.4.21（互換性あり）
- **@vitejs/plugin-react**: ^4.1.1（互換性あり）
- **jsdom**: ^26.1.0（互換性あり）
- **@testing-library/react**: ^14.1.2（互換性あり）
- **@testing-library/user-event**: ^14.5.1（互換性あり）
- **fast-check**: ^4.3.0（互換性あり）

### 2. 設定ファイル（vitest.config.ts）

#### 破壊的変更の対応

##### 2.1 reporter → reporters

```typescript
// ❌ Vitest 1（旧）
export default defineConfig({
  test: {
    reporter: ['dot'],
  },
});

// ✅ Vitest 4（新）
export default defineConfig({
  test: {
    reporters: ['dot'],
  },
});
```

##### 2.2 Pool設定の移行

```typescript
// ❌ Vitest 1（旧）
export default defineConfig({
  test: {
    maxConcurrency: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        execArgv: ['--expose-gc', '--max-old-space-size=6144'],
      },
    },
  },
});

// ✅ Vitest 4（新）
export default defineConfig({
  test: {
    maxWorkers: 1,
    pool: 'forks',
    execArgv: ['--expose-gc', '--max-old-space-size=6144'],
    isolate: true,
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
  },
});
```

##### 2.3 カバレッジ設定の更新

```typescript
// ❌ Vitest 1（旧）
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['json', 'json-summary', 'text'],
      all: false,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        // ... 多数の除外パターン
      ],
    },
  },
});

// ✅ Vitest 4（新）
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['json', 'json-summary', 'text'],
      // all オプションは削除（デフォルトでカバーされたファイルのみ）
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/test/**',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
      ],
    },
  },
});
```

### 3. テストスクリプト（package.json）

#### 更新不要

Vitest 4は、既存のテストスクリプトと互換性があります。

```json
{
  "scripts": {
    "test": "vitest run --reporter=dot --no-coverage --run --passWithNoTests",
    "test:watch": "vitest watch --no-coverage",
    "test:coverage": "vitest run --coverage --reporter=json --run --passWithNoTests",
    "test:coverage:ci": "vitest run --coverage --reporter=json --run --passWithNoTests"
  }
}
```

注意: `--reporter=dot`は`--reporters=dot`に変更可能ですが、後方互換性のため変更不要です。

## データモデル

### 設定オブジェクト

```typescript
interface VitestConfig {
  test: {
    // 環境設定
    environment: 'jsdom';
    globals: boolean;
    setupFiles: string[];
    
    // 分離設定
    isolate: boolean;
    
    // タイムアウト設定
    testTimeout: number;
    hookTimeout: number;
    teardownTimeout: number;
    
    // ファイル設定
    include: string[];
    exclude: string[];
    
    // ワーカー設定
    maxWorkers: number;
    pool: 'forks' | 'threads' | 'vmThreads';
    execArgv: string[];
    
    // Pool設定
    poolOptions: {
      forks?: {
        singleFork: boolean;
      };
    };
    
    // レポーター設定
    reporters: string[];
    
    // カバレッジ設定
    coverage: {
      provider: 'v8';
      reporter: string[];
      reportsDirectory: string;
      include?: string[];
      exclude: string[];
      clean: boolean;
    };
    
    // シーケンス設定
    sequence: {
      shuffle: boolean;
    };
    
    // モック設定
    clearMocks: boolean;
    mockReset: boolean;
    restoreMocks: boolean;
  };
}
```

## 正確性プロパティ

*プロパティは、システムが満たすべき特性や動作を形式的に記述したものです。プロパティベーステストでは、これらのプロパティが全ての有効な入力に対して成立することを検証します。*

### プロパティ1: バージョン更新の正確性

*For any* package.jsonファイル、vitestと@vitest/coverage-v8のバージョンが4.0以上であること

**Validates: Requirements 1.1, 1.2**

### プロパティ2: 設定ファイルの型安全性

*For any* vitest.config.tsファイル、TypeScriptの型エラーなく読み込めること

**Validates: Requirements 2.6**

### プロパティ3: テスト実行の成功

*For any* テストファイル、Vitest 4で実行した際に全てのテストが成功すること

**Validates: Requirements 4.1, 4.4**

### プロパティ4: カバレッジ測定の成功

*For any* カバレッジ測定、Vitest 4でカバレッジレポートが正常に生成されること

**Validates: Requirements 5.1**

### プロパティ5: パフォーマンスの維持

*For any* テスト実行、Vitest 4の実行時間がVitest 1と同等以下であること

**Validates: Requirements 4.2**

### プロパティ6: メモリ使用量の維持

*For any* テスト実行、Vitest 4のメモリ使用量がVitest 1と同等以下であること

**Validates: Requirements 4.3**

### プロパティ7: カバレッジ精度の向上

*For any* カバレッジ測定、Vitest 4のカバレッジ精度がVitest 1より向上していること（偽陽性の減少）

**Validates: Requirements 5.3, 5.4**

### プロパティ8: 後方互換性の確保

*For any* 既存のテストコード、Vitest 4で変更なしに実行できること

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

## エラーハンドリング

### 1. バージョン更新エラー

**エラー**: 依存関係の競合

```bash
npm ERR! ERESOLVE unable to resolve dependency tree
```

**対処方法**:
1. `pnpm-lock.yaml`を削除
2. `node_modules`を削除
3. `pnpm install`を再実行

### 2. 設定ファイルエラー

**エラー**: 型エラー

```
Object literal may only specify known properties, but 'reporter' does not exist in type 'InlineConfig'. Did you mean to write 'reporters'?
```

**対処方法**:
1. `reporter`を`reporters`に変更
2. 配列形式を維持

### 3. テスト実行エラー

**エラー**: Pool設定エラー

```
Error: Unknown option 'maxConcurrency'
```

**対処方法**:
1. `maxConcurrency`を`maxWorkers`に変更
2. `poolOptions.forks.execArgv`を`test.execArgv`に移動
3. `poolOptions.forks.isolate`を`test.isolate`に移動

### 4. カバレッジ測定エラー

**エラー**: coverage.allオプションエラー

```
Error: Unknown option 'coverage.all'
```

**対処方法**:
1. `coverage.all`を削除
2. `coverage.include`を明示的に設定

## テスト戦略

### 1. ユニットテスト

#### 1.1 設定ファイルのテスト

```typescript
import { describe, it, expect } from 'vitest';
import { defineConfig } from 'vitest/config';
import vitestConfig from '../vitest.config';

describe('vitest.config.ts', () => {
  it('should have reporters property', () => {
    expect(vitestConfig.test?.reporters).toBeDefined();
    expect(vitestConfig.test?.reporters).toContain('dot');
  });

  it('should have maxWorkers property', () => {
    expect(vitestConfig.test?.maxWorkers).toBe(1);
  });

  it('should have execArgv property', () => {
    expect(vitestConfig.test?.execArgv).toContain('--expose-gc');
    expect(vitestConfig.test?.execArgv).toContain('--max-old-space-size=6144');
  });

  it('should have isolate property', () => {
    expect(vitestConfig.test?.isolate).toBe(true);
  });

  it('should not have coverage.all property', () => {
    expect(vitestConfig.test?.coverage?.all).toBeUndefined();
  });

  it('should have coverage.include property', () => {
    expect(vitestConfig.test?.coverage?.include).toBeDefined();
    expect(vitestConfig.test?.coverage?.include).toContain('src/**/*.{ts,tsx}');
  });
});
```

#### 1.2 バージョンのテスト

```typescript
import { describe, it, expect } from 'vitest';
import packageJson from '../package.json';

describe('package.json versions', () => {
  it('should have vitest version 4.0 or higher', () => {
    const vitestVersion = packageJson.devDependencies.vitest;
    expect(vitestVersion).toMatch(/^\^4\./);
  });

  it('should have @vitest/coverage-v8 version 4.0 or higher', () => {
    const coverageVersion = packageJson.devDependencies['@vitest/coverage-v8'];
    expect(coverageVersion).toMatch(/^\^4\./);
  });
});
```

### 2. プロパティベーステスト

#### 2.1 テスト実行の成功プロパティ

```typescript
import { describe, it } from 'vitest';
import { fc } from 'fast-check';
import { execSync } from 'child_process';

describe('Property: Test execution success', () => {
  it('Property 3: All tests should pass with Vitest 4', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('test', 'test:watch', 'test:coverage'),
        (scriptName) => {
          // テストスクリプトを実行
          const result = execSync(`pnpm run ${scriptName}`, {
            encoding: 'utf-8',
            stdio: 'pipe',
          });
          
          // 全てのテストが成功することを確認
          expect(result).toContain('passed');
          expect(result).not.toContain('failed');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### 2.2 パフォーマンス維持プロパティ

```typescript
import { describe, it, expect } from 'vitest';
import { fc } from 'fast-check';
import { execSync } from 'child_process';

describe('Property: Performance maintenance', () => {
  it('Property 5: Test execution time should be equal or less than Vitest 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (runCount) => {
          const startTime = Date.now();
          
          for (let i = 0; i < runCount; i++) {
            execSync('pnpm test', { stdio: 'pipe' });
          }
          
          const endTime = Date.now();
          const averageTime = (endTime - startTime) / runCount;
          
          // 平均実行時間が120秒以内であることを確認
          expect(averageTime).toBeLessThanOrEqual(120000);
        }
      ),
      { numRuns: 10 }
    );
  });
});
```

### 3. 統合テスト

#### 3.1 CI/CD統合テスト

```bash
# GitHub Actionsでのテスト実行
pnpm test
pnpm test:coverage
pnpm run lint
pnpm run type-check
pnpm run build
```

#### 3.2 カバレッジ測定テスト

```bash
# カバレッジレポート生成
pnpm test:coverage:ci

# カバレッジレポート確認
cat coverage/coverage-summary.json
```

### 4. パフォーマンステスト

#### 4.1 テスト実行時間の測定

```bash
# Vitest 1の実行時間を測定
time pnpm test

# Vitest 4の実行時間を測定
time pnpm test

# 比較
```

#### 4.2 メモリ使用量の測定

```bash
# Vitest 1のメモリ使用量を測定
/usr/bin/time -v pnpm test

# Vitest 4のメモリ使用量を測定
/usr/bin/time -v pnpm test

# 比較
```

### 5. 後方互換性テスト

#### 5.1 既存テストコードの実行

```bash
# 全てのテストを実行
pnpm test

# 統合テストを実行
pnpm test:integration

# カバレッジを測定
pnpm test:coverage
```

#### 5.2 テストユーティリティの動作確認

```typescript
import { describe, it, expect } from 'vitest';
import { renderWithProviders, renderHookWithProviders } from './test-utils';

describe('Test utilities compatibility', () => {
  it('should render components with providers', () => {
    const { getByText } = renderWithProviders(<div>Test</div>);
    expect(getByText('Test')).toBeInTheDocument();
  });

  it('should render hooks with providers', () => {
    const { result } = renderHookWithProviders(() => useState(0));
    expect(result.current[0]).toBe(0);
  });
});
```

## 実装フェーズ

### Phase 1: 準備（5分）

1. 現在のVitest 1の状態を記録
   - テスト実行時間
   - メモリ使用量
   - カバレッジ結果

2. バックアップの作成
   - `package.json`
   - `vitest.config.ts`
   - `pnpm-lock.yaml`

### Phase 2: バージョン更新（10分）

1. `package.json`の更新
   - `vitest`: ^4.0.16
   - `@vitest/coverage-v8`: ^4.0.16

2. 依存関係のインストール
   ```bash
   pnpm install
   ```

3. バージョン確認
   ```bash
   pnpm list vitest
   pnpm list @vitest/coverage-v8
   ```

### Phase 3: 設定ファイル更新（15分）

1. `vitest.config.ts`の更新
   - `reporter` → `reporters`
   - `maxConcurrency` → `maxWorkers`
   - `poolOptions.forks.execArgv` → `test.execArgv`
   - `poolOptions.forks.isolate` → `test.isolate`
   - `coverage.all`の削除
   - `coverage.include`の追加

2. 型チェック
   ```bash
   pnpm run type-check
   ```

### Phase 4: テスト実行（20分）

1. 全テストの実行
   ```bash
   pnpm test
   ```

2. カバレッジ測定
   ```bash
   pnpm test:coverage:ci
   ```

3. 統合テストの実行
   ```bash
   pnpm test:integration
   ```

### Phase 5: パフォーマンス検証（15分）

1. テスト実行時間の測定
   ```bash
   time pnpm test
   ```

2. メモリ使用量の測定
   ```bash
   /usr/bin/time -v pnpm test
   ```

3. カバレッジ測定時間の測定
   ```bash
   time pnpm test:coverage:ci
   ```

### Phase 6: CI/CD検証（10分）

1. GitHub Actionsでのテスト実行
   - プルリクエストを作成
   - CI/CDパイプラインの実行を確認

2. 結果の確認
   - 全テストの成功
   - カバレッジレポートの生成
   - ビルドの成功

### Phase 7: ドキュメント更新（15分）

1. ステアリングファイルの作成
   - `.kiro/steering/17-vitest-4-upgrade-guide.md`

2. WBSの更新
   - `.kiro/steering/4-wbs.md`

3. 完了レポートの作成
   - `temp/vitest-4-upgrade-report.md`

## 期待される成果

### 1. パフォーマンス改善

- **テスト実行時間**: 同等以下（Pool Rewriteによる改善）
- **メモリ使用量**: 同等以下
- **カバレッジ測定時間**: 同等以下（AST解析による改善）

### 2. カバレッジ精度向上

- **偽陽性の減少**: AST解析ベースのカバレッジ測定
- **正確なカバレッジ**: v8-to-istanbulからAST解析への移行

### 3. 設定のシンプル化

- **Pool設定**: より直感的な設定
- **カバレッジ設定**: より明確な設定

### 4. 後方互換性

- **既存テストコード**: 変更なしで動作
- **テストユーティリティ**: 変更なしで動作
- **モック機能**: 変更なしで動作

## リスクと対策

### リスク1: 依存関係の競合

**リスク**: 他のパッケージとの依存関係の競合

**対策**:
1. `pnpm-lock.yaml`を削除して再インストール
2. 依存関係の互換性を確認
3. 必要に応じて他のパッケージも更新

### リスク2: テスト失敗

**リスク**: Vitest 4でテストが失敗する

**対策**:
1. 失敗したテストを特定
2. Vitest 4の破壊的変更を確認
3. テストコードを修正（最小限）

### リスク3: パフォーマンス低下

**リスク**: Vitest 4でパフォーマンスが低下する

**対策**:
1. パフォーマンス測定を実施
2. 設定を最適化
3. 必要に応じてVitest 1にロールバック

### リスク4: CI/CD失敗

**リスク**: GitHub ActionsでVitest 4が動作しない

**対策**:
1. ローカルで十分にテスト
2. CI/CDログを確認
3. 設定を調整

## 参考資料

- [Vitest 4.0 Announcement](https://voidzero.dev/posts/announcing-vitest-4)
- [Vitest Migration Guide](https://vitest.dev/guide/migration.html)
- [Vitest GitHub Releases](https://github.com/vitest-dev/vitest/releases)
- [Vitest Documentation](https://vitest.dev/)
