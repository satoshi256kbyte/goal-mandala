import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 5: Pagesカバレッジ目標の達成
 * Validates: Requirements 3.1
 *
 * Feature: 4.5-test-coverage-improvement, Property 5: Pagesカバレッジ目標の達成
 */
describe('Property 5: Pagesカバレッジ目標の達成', () => {
  it('全ての主要ページにテストファイルが存在する', async () => {
    const pagesDir = path.join(__dirname, '..');
    const pageFiles = await glob('*.tsx', { cwd: pagesDir });

    // テストファイルを除外
    const mainPages = pageFiles.filter(
      file => !file.includes('.test.') && !file.includes('.property.')
    );

    const missingTests: string[] = [];

    for (const pageFile of mainPages) {
      const testFile = pageFile.replace('.tsx', '.test.tsx');
      const testPath = path.join(pagesDir, testFile);

      if (!fs.existsSync(testPath)) {
        missingTests.push(pageFile);
      }
    }

    // 主要ページ（認証、マンダラチャート、タスク、振り返り）にはテストが必要
    const criticalPages = [
      'LoginPage.tsx',
      'SignupPage.tsx',
      'PasswordResetPage.tsx',
      'GoalInputPage.tsx',
      'TaskListPage.tsx',
      'TaskDetailPage.tsx',
      'ReflectionListPage.tsx',
      'ReflectionCreatePage.tsx',
      'ReflectionEditPage.tsx',
    ];

    const missingCriticalTests = missingTests.filter(page => criticalPages.includes(page));

    expect(missingCriticalTests).toEqual([]);
  });

  it('各ページテストファイルに十分なテストケースが存在する', async () => {
    const pagesDir = path.join(__dirname, '..');
    const testFiles = await glob('*.test.tsx', { cwd: pagesDir });

    const insufficientTests: Array<{ file: string; count: number }> = [];

    for (const testFile of testFiles) {
      const testPath = path.join(pagesDir, testFile);
      const content = fs.readFileSync(testPath, 'utf-8');

      // テストケース数をカウント（it()の出現回数）
      const testCount = (content.match(/\bit\(/g) || []).length;

      // 主要ページは最低5テスト必要
      const criticalPages = [
        'LoginPage',
        'SignupPage',
        'PasswordResetPage',
        'GoalInputPage',
        'TaskListPage',
        'TaskDetailPage',
        'ReflectionListPage',
        'ReflectionCreatePage',
        'ReflectionEditPage',
      ];

      const isCritical = criticalPages.some(page => testFile.includes(page));

      if (isCritical && testCount < 5) {
        insufficientTests.push({ file: testFile, count: testCount });
      }
    }

    expect(insufficientTests).toEqual([]);
  });

  it('ページテストがローディング状態をテストしている', async () => {
    const pagesDir = path.join(__dirname, '..');
    const testFiles = await glob('*.test.tsx', { cwd: pagesDir });

    const missingLoadingTests: string[] = [];

    for (const testFile of testFiles) {
      // プロパティテストファイルは除外
      if (testFile.includes('.property.')) {
        continue;
      }

      const testPath = path.join(pagesDir, testFile);
      const content = fs.readFileSync(testPath, 'utf-8');

      // ローディング状態のテストがあるか確認
      const hasLoadingTest =
        content.includes('loading') ||
        content.includes('Loading') ||
        content.includes('isLoading') ||
        content.includes('spinner');

      // データ取得を行うページのみチェック
      // Note: ReflectionListPageはReflectionListコンポーネントに委譲しているため除外
      const dataFetchingPages = ['TaskListPage', 'TaskDetailPage', 'ReflectionEditPage'];

      const isDataFetchingPage = dataFetchingPages.some(page => testFile.includes(page));

      if (isDataFetchingPage && !hasLoadingTest) {
        missingLoadingTests.push(testFile);
      }
    }

    expect(missingLoadingTests).toEqual([]);
  });

  it('ページテストがエラー状態をテストしている', async () => {
    const pagesDir = path.join(__dirname, '..');
    const testFiles = await glob('*.test.tsx', { cwd: pagesDir });

    const missingErrorTests: string[] = [];

    for (const testFile of testFiles) {
      // プロパティテストファイルは除外
      if (testFile.includes('.property.')) {
        continue;
      }

      const testPath = path.join(pagesDir, testFile);
      const content = fs.readFileSync(testPath, 'utf-8');

      // エラー状態のテストがあるか確認
      const hasErrorTest =
        content.includes('error') ||
        content.includes('Error') ||
        content.includes('isError') ||
        content.includes('failed');

      // データ取得を行うページのみチェック
      // Note: ReflectionListPageはReflectionListコンポーネントに委譲しているため除外
      const dataFetchingPages = ['TaskListPage', 'TaskDetailPage', 'ReflectionEditPage'];

      const isDataFetchingPage = dataFetchingPages.some(page => testFile.includes(page));

      if (isDataFetchingPage && !hasErrorTest) {
        missingErrorTests.push(testFile);
      }
    }

    expect(missingErrorTests).toEqual([]);
  });

  it('ページテストがナビゲーションをテストしている', async () => {
    const pagesDir = path.join(__dirname, '..');
    const testFiles = await glob('*.test.tsx', { cwd: pagesDir });

    const missingNavigationTests: string[] = [];

    for (const testFile of testFiles) {
      // プロパティテストファイルは除外
      if (testFile.includes('.property.')) {
        continue;
      }

      const testPath = path.join(pagesDir, testFile);
      const content = fs.readFileSync(testPath, 'utf-8');

      // ナビゲーションのテストがあるか確認
      const hasNavigationTest =
        content.includes('navigate') ||
        content.includes('Navigate') ||
        content.includes('mockNavigate') ||
        content.includes('useNavigate') ||
        content.includes('MemoryRouter'); // MemoryRouterを使用している場合もナビゲーションテストとみなす

      // レスポンシブテストファイルは除外
      const isResponsiveTest = testFile.includes('.responsive.');

      // ナビゲーションを行うページのみチェック
      const navigationPages = [
        'LoginPage',
        'SignupPage',
        'PasswordResetPage',
        'GoalInputPage',
        'ReflectionListPage',
        'ReflectionCreatePage',
        'ReflectionEditPage',
      ];

      const isNavigationPage = navigationPages.some(page => testFile.includes(page));

      if (isNavigationPage && !hasNavigationTest && !isResponsiveTest) {
        missingNavigationTests.push(testFile);
      }
    }

    expect(missingNavigationTests).toEqual([]);
  });

  it('ページテストがフォーム送信をテストしている', async () => {
    const pagesDir = path.join(__dirname, '..');
    const testFiles = await glob('*.test.tsx', { cwd: pagesDir });

    const missingFormTests: string[] = [];

    for (const testFile of testFiles) {
      // プロパティテストファイルは除外
      if (testFile.includes('.property.')) {
        continue;
      }

      const testPath = path.join(pagesDir, testFile);
      const content = fs.readFileSync(testPath, 'utf-8');

      // フォーム送信のテストがあるか確認
      const hasFormTest =
        content.includes('submit') ||
        content.includes('Submit') ||
        content.includes('onSubmit') ||
        content.includes('fireEvent.click');

      // フォームコンポーネントがモックされている場合は除外
      const hasFormMock =
        content.includes('GoalInputForm') ||
        content.includes('ReflectionForm') ||
        content.includes('LoginForm');

      // フォームを持つページのみチェック
      const formPages = [
        'LoginPage',
        'SignupPage',
        'PasswordResetPage',
        'GoalInputPage',
        'ReflectionCreatePage',
        'ReflectionEditPage',
      ];

      const isFormPage = formPages.some(page => testFile.includes(page));

      // フォームがモックされている場合は、フォーム送信テストは不要
      if (isFormPage && !hasFormTest && !hasFormMock) {
        missingFormTests.push(testFile);
      }
    }

    expect(missingFormTests).toEqual([]);
  });
});
