import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 4: Hooksカバレッジ目標の達成
 *
 * Phase 1目標: 40%以上
 * Phase 2目標: 60%以上
 * Phase 3目標: 80%以上
 *
 * Validates: Requirements 2.1
 *
 * Note: このテストは、主要なカスタムフックに対して十分なテストが存在することを検証します。
 * 実際のカバレッジ測定は、npm run coverage:all で実行してください。
 */
describe('Property 4: Hooksカバレッジ目標の達成', () => {
  it('should have test files for all major custom hooks', () => {
    // 主要なカスタムフックのリスト
    const majorHooks = [
      'useGoalForm',
      'useAuth',
      'useReflections',
      'useTasks',
      'useTouch',
      'useKeyboardNavigation',
      'useDebounce',
      'useTimeout',
      'useResponsive',
      'useNetworkStatus',
    ];

    const missingTests: string[] = [];
    const foundTests: string[] = [];

    majorHooks.forEach(hookName => {
      // __tests__ディレクトリとhooksディレクトリ直下の両方を検索
      const testFilePath1 = path.join(__dirname, `${hookName}.test.ts`);
      const testFileTsxPath1 = path.join(__dirname, `${hookName}.test.tsx`);
      const testFilePath2 = path.join(__dirname, '..', `${hookName}.test.ts`);
      const testFileTsxPath2 = path.join(__dirname, '..', `${hookName}.test.tsx`);

      if (
        fs.existsSync(testFilePath1) ||
        fs.existsSync(testFileTsxPath1) ||
        fs.existsSync(testFilePath2) ||
        fs.existsSync(testFileTsxPath2)
      ) {
        foundTests.push(hookName);
      } else {
        missingTests.push(hookName);
      }
    });

    console.log(`\nMajor Hooks Test Files:`);
    console.log(`  Found: ${foundTests.length}/${majorHooks.length} test files`);
    if (foundTests.length > 0) {
      console.log(`  ✅ ${foundTests.join(', ')}`);
    }
    if (missingTests.length > 0) {
      console.log(`  ❌ Missing: ${missingTests.join(', ')}`);
    }

    // 少なくとも90%の主要フックにテストファイルがあることを確認
    const testRatio = foundTests.length / majorHooks.length;
    expect(testRatio).toBeGreaterThanOrEqual(0.9);
  });

  it('should have comprehensive tests for critical hooks', () => {
    // クリティカルなフック（最低30テスト以上が必要）
    const criticalHooks = [
      { name: 'useGoalForm', minTests: 30 },
      { name: 'useAuth', minTests: 20 },
      { name: 'useReflections', minTests: 20 },
      { name: 'useTasks', minTests: 20 },
    ];

    const insufficientTests: Array<{ name: string; found: boolean }> = [];
    const sufficientTests: Array<{ name: string }> = [];

    console.log(`\nCritical Hooks Test Coverage:`);

    criticalHooks.forEach(({ name, minTests }) => {
      // __tests__ディレクトリとhooksディレクトリ直下の両方を検索
      const testFilePath1 = path.join(__dirname, `${name}.test.ts`);
      const testFileTsxPath1 = path.join(__dirname, `${name}.test.tsx`);
      const testFilePath2 = path.join(__dirname, '..', `${name}.test.ts`);
      const testFileTsxPath2 = path.join(__dirname, '..', `${name}.test.tsx`);

      const testFile = fs.existsSync(testFilePath1)
        ? testFilePath1
        : fs.existsSync(testFileTsxPath1)
          ? testFileTsxPath1
          : fs.existsSync(testFilePath2)
            ? testFilePath2
            : fs.existsSync(testFileTsxPath2)
              ? testFileTsxPath2
              : null;

      if (testFile) {
        const content = fs.readFileSync(testFile, 'utf-8');
        // it( または test( の出現回数をカウント
        const testCount = (content.match(/\b(it|test)\s*\(/g) || []).length;

        if (testCount >= minTests) {
          sufficientTests.push({ name });
          console.log(`  ✅ ${name}: ${testCount} tests (min: ${minTests})`);
        } else {
          insufficientTests.push({ name, found: true });
          console.log(`  ⚠️  ${name}: ${testCount} tests (min: ${minTests})`);
        }
      } else {
        insufficientTests.push({ name, found: false });
        console.log(`  ❌ ${name}: No test file found`);
      }
    });

    // 全てのクリティカルフックに十分なテストがあることを確認
    expect(insufficientTests).toHaveLength(0);
  });

  it('should have tests for utility hooks', () => {
    // ユーティリティフック
    const utilityHooks = [
      'useDebounce',
      'useTimeout',
      'useTouch',
      'useKeyboardNavigation',
      'useResponsive',
      'useNetworkStatus',
    ];

    const missingTests: string[] = [];
    const foundTests: string[] = [];

    utilityHooks.forEach(hookName => {
      // __tests__ディレクトリとhooksディレクトリ直下の両方を検索
      const testFilePath1 = path.join(__dirname, `${hookName}.test.ts`);
      const testFileTsxPath1 = path.join(__dirname, `${hookName}.test.tsx`);
      const testFilePath2 = path.join(__dirname, '..', `${hookName}.test.ts`);
      const testFileTsxPath2 = path.join(__dirname, '..', `${hookName}.test.tsx`);

      if (
        fs.existsSync(testFilePath1) ||
        fs.existsSync(testFileTsxPath1) ||
        fs.existsSync(testFilePath2) ||
        fs.existsSync(testFileTsxPath2)
      ) {
        foundTests.push(hookName);
      } else {
        missingTests.push(hookName);
      }
    });

    console.log(`\nUtility Hooks Test Files:`);
    console.log(`  Found: ${foundTests.length}/${utilityHooks.length} test files`);
    if (foundTests.length > 0) {
      console.log(`  ✅ ${foundTests.join(', ')}`);
    }
    if (missingTests.length > 0) {
      console.log(`  ❌ Missing: ${missingTests.join(', ')}`);
    }

    // 少なくとも80%のユーティリティフックにテストファイルがあることを確認
    const testRatio = foundTests.length / utilityHooks.length;
    expect(testRatio).toBeGreaterThanOrEqual(0.8);
  });
});
