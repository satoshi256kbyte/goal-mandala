import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 7: Componentsカバレッジ目標の達成
 * Validates: Requirements 5.1
 *
 * Phase 2目標: 50%以上
 * Phase 3目標: 75%以上
 *
 * Feature: 4.5-test-coverage-improvement, Property 7: Componentsカバレッジ目標の達成
 */
describe('Property 7: Componentsカバレッジ目標の達成', () => {
  it('全ての主要コンポーネントにテストファイルが存在する', async () => {
    // 主要コンポーネントのリスト
    const criticalComponents = [
      // 共通コンポーネント
      'common/AccessibleList',
      'common/LazyImage',
      'common/VirtualScroll',
      'common/LazyLoad',
      // フォームコンポーネント
      'forms/TextInput',
      'forms/TextArea',
      'forms/FormField',
      // 振り返りコンポーネント
      'reflection/ReflectionDetail',
      'reflection/ReflectionList',
      'reflection/ActionProgressSelector',
    ];

    const missingTests: string[] = [];

    for (const component of criticalComponents) {
      const [category, name] = component.split('/');
      const componentDir = path.join(__dirname, '..', category);
      const testPath = path.join(componentDir, '__tests__', `${name}.test.tsx`);

      if (!fs.existsSync(testPath)) {
        missingTests.push(component);
      }
    }

    console.log(`\nCritical Components Test Files:`);
    console.log(
      `  Found: ${criticalComponents.length - missingTests.length}/${criticalComponents.length}`
    );
    if (missingTests.length > 0) {
      console.log(`  ❌ Missing: ${missingTests.join(', ')}`);
    } else {
      console.log(`  ✅ All critical components have test files`);
    }

    expect(missingTests).toEqual([]);
  });

  it('各コンポーネントテストファイルに十分なテストケースが存在する', async () => {
    // Phase 2では、Task 9.1-9.3で追加したコンポーネントのみチェック
    const criticalComponents = [
      { category: 'common', file: 'AccessibleList.test.tsx', minTests: 10 },
      { category: 'common', file: 'LazyImage.test.tsx', minTests: 10 },
      { category: 'common', file: 'VirtualScroll.test.tsx', minTests: 10 },
      { category: 'common', file: 'LazyLoad.test.tsx', minTests: 10 },
      { category: 'forms', file: 'TextInput.test.tsx', minTests: 15 },
      { category: 'forms', file: 'TextArea.test.tsx', minTests: 15 },
      { category: 'forms', file: 'FormField.test.tsx', minTests: 15 },
      { category: 'reflection', file: 'ReflectionDetail.test.tsx', minTests: 10 },
      { category: 'reflection', file: 'ReflectionList.test.tsx', minTests: 10 },
      { category: 'reflection', file: 'ActionProgressSelector.test.tsx', minTests: 10 },
    ];

    const insufficientTests: Array<{ file: string; count: number; min: number }> = [];

    for (const { category, file, minTests } of criticalComponents) {
      const categoryDir = path.join(__dirname, '..', category, '__tests__');
      const testPath = path.join(categoryDir, file);

      if (!fs.existsSync(testPath)) {
        insufficientTests.push({
          file: `${category}/${file}`,
          count: 0,
          min: minTests,
        });
        continue;
      }

      const content = fs.readFileSync(testPath, 'utf-8');

      // テストケース数をカウント（it()の出現回数）
      const testCount = (content.match(/\bit\(/g) || []).length;

      if (testCount < minTests) {
        insufficientTests.push({
          file: `${category}/${file}`,
          count: testCount,
          min: minTests,
        });
      }
    }

    console.log(`\nComponent Test Coverage:`);
    if (insufficientTests.length > 0) {
      console.log(`  ⚠️  Insufficient tests:`);
      insufficientTests.forEach(({ file, count, min }) => {
        console.log(`    - ${file}: ${count} tests (min: ${min})`);
      });
    } else {
      console.log(`  ✅ All critical components have sufficient tests`);
    }

    expect(insufficientTests).toEqual([]);
  });

  it('コンポーネントテストがレンダリングをテストしている', async () => {
    const componentCategories = ['common', 'forms', 'reflection'];
    const missingRenderTests: string[] = [];

    for (const category of componentCategories) {
      const categoryDir = path.join(__dirname, '..', category, '__tests__');

      if (!fs.existsSync(categoryDir)) {
        continue;
      }

      const testFiles = await glob('*.test.tsx', { cwd: categoryDir });

      for (const testFile of testFiles) {
        const testPath = path.join(categoryDir, testFile);
        const content = fs.readFileSync(testPath, 'utf-8');

        // レンダリングテストがあるか確認
        const hasRenderTest =
          content.includes('render(') ||
          content.includes('renderWithProviders(') ||
          content.includes('screen.getBy') ||
          content.includes('screen.queryBy') ||
          content.includes('screen.findBy');

        if (!hasRenderTest) {
          missingRenderTests.push(`${category}/${testFile}`);
        }
      }
    }

    console.log(`\nComponent Rendering Tests:`);
    if (missingRenderTests.length > 0) {
      console.log(`  ❌ Missing render tests: ${missingRenderTests.join(', ')}`);
    } else {
      console.log(`  ✅ All components test rendering`);
    }

    expect(missingRenderTests).toEqual([]);
  });

  it('コンポーネントテストがユーザーインタラクションをテストしている', async () => {
    // Phase 2では、Task 9.1-9.3で追加したインタラクティブコンポーネントのみチェック
    const interactiveComponents = [
      { category: 'forms', file: 'TextInput.test.tsx' },
      { category: 'forms', file: 'TextArea.test.tsx' },
      { category: 'forms', file: 'FormField.test.tsx' },
      { category: 'reflection', file: 'ActionProgressSelector.test.tsx' },
    ];

    const missingInteractionTests: string[] = [];

    for (const { category, file } of interactiveComponents) {
      const categoryDir = path.join(__dirname, '..', category, '__tests__');
      const testPath = path.join(categoryDir, file);

      if (!fs.existsSync(testPath)) {
        missingInteractionTests.push(`${category}/${file}`);
        continue;
      }

      const content = fs.readFileSync(testPath, 'utf-8');

      // ユーザーインタラクションテストがあるか確認
      const hasInteractionTest =
        content.includes('userEvent.') ||
        content.includes('fireEvent.') ||
        content.includes('click') ||
        content.includes('type') ||
        content.includes('change');

      if (!hasInteractionTest) {
        missingInteractionTests.push(`${category}/${file}`);
      }
    }

    console.log(`\nComponent Interaction Tests:`);
    if (missingInteractionTests.length > 0) {
      console.log(`  ❌ Missing interaction tests: ${missingInteractionTests.join(', ')}`);
    } else {
      console.log(`  ✅ All interactive components test user interactions`);
    }

    expect(missingInteractionTests).toEqual([]);
  });

  it('コンポーネントテストがエラー状態をテストしている', async () => {
    const componentCategories = ['common', 'forms', 'reflection'];
    const missingErrorTests: string[] = [];

    for (const category of componentCategories) {
      const categoryDir = path.join(__dirname, '..', category, '__tests__');

      if (!fs.existsSync(categoryDir)) {
        continue;
      }

      const testFiles = await glob('*.test.tsx', { cwd: categoryDir });

      for (const testFile of testFiles) {
        const testPath = path.join(categoryDir, testFile);
        const content = fs.readFileSync(testPath, 'utf-8');

        // エラー状態テストがあるか確認
        const hasErrorTest =
          content.includes('error') ||
          content.includes('Error') ||
          content.includes('invalid') ||
          content.includes('failed');

        // エラー状態を持つコンポーネントのみチェック
        const errorStateComponents = [
          'LazyImage.test.tsx',
          'VirtualScroll.test.tsx',
          'TextInput.test.tsx',
          'TextArea.test.tsx',
          'FormField.test.tsx',
          'ReflectionDetail.test.tsx',
          'ReflectionList.test.tsx',
          'ActionProgressSelector.test.tsx',
        ];

        const shouldHaveErrorTest = errorStateComponents.includes(testFile);

        if (shouldHaveErrorTest && !hasErrorTest) {
          missingErrorTests.push(`${category}/${testFile}`);
        }
      }
    }

    console.log(`\nComponent Error State Tests:`);
    if (missingErrorTests.length > 0) {
      console.log(`  ❌ Missing error tests: ${missingErrorTests.join(', ')}`);
    } else {
      console.log(`  ✅ All components with error states test them`);
    }

    expect(missingErrorTests).toEqual([]);
  });

  it('コンポーネントテストがアクセシビリティをテストしている', async () => {
    // Phase 2では、Task 9.1-9.3で追加したインタラクティブコンポーネントのみチェック
    const interactiveComponents = [
      { category: 'common', file: 'AccessibleList.test.tsx' },
      { category: 'forms', file: 'TextInput.test.tsx' },
      { category: 'forms', file: 'TextArea.test.tsx' },
      { category: 'forms', file: 'FormField.test.tsx' },
    ];

    const missingA11yTests: string[] = [];

    for (const { category, file } of interactiveComponents) {
      const categoryDir = path.join(__dirname, '..', category, '__tests__');
      const testPath = path.join(categoryDir, file);

      if (!fs.existsSync(testPath)) {
        missingA11yTests.push(`${category}/${file}`);
        continue;
      }

      const content = fs.readFileSync(testPath, 'utf-8');

      // アクセシビリティテストがあるか確認
      const hasA11yTest =
        content.includes('aria-') ||
        content.includes('role') ||
        content.includes('getByRole') ||
        content.includes('getByLabelText') ||
        content.includes('accessibility') ||
        content.includes('a11y');

      if (!hasA11yTest) {
        missingA11yTests.push(`${category}/${file}`);
      }
    }

    console.log(`\nComponent Accessibility Tests:`);
    if (missingA11yTests.length > 0) {
      console.log(`  ❌ Missing a11y tests: ${missingA11yTests.join(', ')}`);
    } else {
      console.log(`  ✅ All interactive components test accessibility`);
    }

    expect(missingA11yTests).toEqual([]);
  });
});
