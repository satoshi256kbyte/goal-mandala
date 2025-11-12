#!/usr/bin/env node
/**
 * カバレッジ分析スクリプト
 *
 * 現在のテストカバレッジ状況を分析し、
 * 未カバー箇所と優先度の高い改善箇所を特定します。
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * ソースファイルを検索
 */
async function findSourceFiles() {
  const srcDir = path.join(__dirname, '../src');

  const patterns = [`${srcDir}/**/*.ts`, `${srcDir}/**/*.tsx`];

  const excludePatterns = [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/test/**',
    '**/__tests__/**',
    '**/*.d.ts',
    '**/vite-env.d.ts',
    '**/main.tsx',
  ];

  const files = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      ignore: excludePatterns,
    });
    files.push(...matches);
  }

  return files;
}

/**
 * テストファイルを検索
 */
async function findTestFiles() {
  const srcDir = path.join(__dirname, '../src');

  const patterns = [
    `${srcDir}/**/*.test.ts`,
    `${srcDir}/**/*.test.tsx`,
    `${srcDir}/**/*.spec.ts`,
    `${srcDir}/**/*.spec.tsx`,
  ];

  const files = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern);
    files.push(...matches);
  }

  return files;
}

/**
 * ファイルの優先度を判定
 */
function determineFilePriority(filePath) {
  const relativePath = path.relative(path.join(__dirname, '../src'), filePath);

  // 高優先度: 進捗計算エンジン、認証、API通信
  if (relativePath.includes('services/progress')) {
    return { priority: 'high', reason: '進捗計算エンジン（重要機能）' };
  }
  if (relativePath.includes('contexts/AuthContext') || relativePath.includes('services/auth')) {
    return { priority: 'high', reason: '認証機能（重要機能）' };
  }
  if (relativePath.includes('services/api') || relativePath.includes('services/goals')) {
    return { priority: 'high', reason: 'API通信機能（重要機能）' };
  }
  if (relativePath.includes('utils/error')) {
    return { priority: 'high', reason: 'エラーハンドリング（重要機能）' };
  }

  // 中優先度: カスタムフック、ユーティリティ
  if (relativePath.includes('hooks/')) {
    return { priority: 'medium', reason: 'カスタムフック' };
  }
  if (relativePath.includes('utils/')) {
    return { priority: 'medium', reason: 'ユーティリティ関数' };
  }

  // 低優先度: コンポーネント、ページ
  if (relativePath.includes('components/') || relativePath.includes('pages/')) {
    return { priority: 'low', reason: 'UIコンポーネント' };
  }

  return { priority: 'low', reason: 'その他' };
}

/**
 * ファイルにテストが存在するかチェック
 */
function hasTestFile(sourceFile, testFiles) {
  const baseName = path.basename(sourceFile, path.extname(sourceFile));
  const dirName = path.dirname(sourceFile);

  // 同じディレクトリまたは__tests__ディレクトリにテストファイルがあるかチェック
  const possibleTestPaths = [
    path.join(dirName, `${baseName}.test.ts`),
    path.join(dirName, `${baseName}.test.tsx`),
    path.join(dirName, '__tests__', `${baseName}.test.ts`),
    path.join(dirName, '__tests__', `${baseName}.test.tsx`),
  ];

  return testFiles.some(testFile =>
    possibleTestPaths.some(testPath => testFile.includes(testPath))
  );
}

/**
 * カバレッジ分析を実行
 */
async function analyzeCoverage() {
  console.log('📊 カバレッジ分析を開始します...\n');

  const sourceFiles = await findSourceFiles();
  const testFiles = await findTestFiles();

  console.log(`✅ ソースファイル: ${sourceFiles.length}件`);
  console.log(`✅ テストファイル: ${testFiles.length}件\n`);

  const uncoveredFiles = [];
  const priorityFiles = [];

  // 各ソースファイルをチェック
  for (const sourceFile of sourceFiles) {
    const hasTest = hasTestFile(sourceFile, testFiles);
    const { priority, reason } = determineFilePriority(sourceFile);

    if (!hasTest) {
      const fileCoverage = {
        path: path.relative(path.join(__dirname, '..'), sourceFile),
        coverage: {
          lines: { total: 0, covered: 0, percentage: 0 },
          functions: { total: 0, covered: 0, percentage: 0 },
          branches: { total: 0, covered: 0, percentage: 0 },
          statements: { total: 0, covered: 0, percentage: 0 },
        },
        priority,
        reason,
      };

      uncoveredFiles.push(fileCoverage);

      if (priority === 'high') {
        priorityFiles.push(fileCoverage);
      }
    }
  }

  // 推奨事項を生成
  const recommendations = [];

  if (priorityFiles.length > 0) {
    recommendations.push(
      `🔴 高優先度: ${priorityFiles.length}件の重要機能にテストが不足しています`
    );
  }

  const mediumPriorityFiles = uncoveredFiles.filter(f => f.priority === 'medium');
  if (mediumPriorityFiles.length > 0) {
    recommendations.push(
      `🟡 中優先度: ${mediumPriorityFiles.length}件のファイルにテストが不足しています`
    );
  }

  const lowPriorityFiles = uncoveredFiles.filter(f => f.priority === 'low');
  if (lowPriorityFiles.length > 0) {
    recommendations.push(
      `🟢 低優先度: ${lowPriorityFiles.length}件のファイルにテストが不足しています`
    );
  }

  // 全体のカバレッジを推定
  const testedFilesCount = sourceFiles.length - uncoveredFiles.length;
  const overallPercentage = (testedFilesCount / sourceFiles.length) * 100;

  return {
    overall: {
      lines: {
        total: sourceFiles.length,
        covered: testedFilesCount,
        percentage: overallPercentage,
      },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 },
    },
    uncoveredFiles,
    lowCoverageFiles: [],
    priorityFiles,
    recommendations,
  };
}

/**
 * レポートを出力
 */
function printReport(result) {
  console.log('='.repeat(80));
  console.log('📊 カバレッジ分析レポート');
  console.log('='.repeat(80));
  console.log();

  console.log('## 全体サマリー');
  console.log(`- ファイルカバレッジ: ${result.overall.lines.percentage.toFixed(2)}%`);
  console.log(
    `- テスト済みファイル: ${result.overall.lines.covered}/${result.overall.lines.total}`
  );
  console.log(`- 未テストファイル: ${result.uncoveredFiles.length}`);
  console.log();

  console.log('## 推奨事項');
  result.recommendations.forEach(rec => console.log(`  ${rec}`));
  console.log();

  if (result.priorityFiles.length > 0) {
    console.log('## 🔴 高優先度: テストが必要なファイル');
    console.log();
    result.priorityFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.path}`);
      console.log(`   理由: ${file.reason}`);
    });
    console.log();
  }

  const mediumFiles = result.uncoveredFiles.filter(f => f.priority === 'medium');
  if (mediumFiles.length > 0 && mediumFiles.length <= 20) {
    console.log('## 🟡 中優先度: テストが必要なファイル');
    console.log();
    mediumFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.path}`);
      console.log(`   理由: ${file.reason}`);
    });
    console.log();
  }

  console.log('='.repeat(80));
}

/**
 * レポートをファイルに保存
 */
function saveReport(result) {
  const reportPath = path.join(__dirname, '../coverage-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`\n✅ レポートを保存しました: ${reportPath}`);
}

// メイン処理
async function main() {
  try {
    const result = await analyzeCoverage();
    printReport(result);
    saveReport(result);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
