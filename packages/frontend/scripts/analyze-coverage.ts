#!/usr/bin/env ts-node
/**
 * カバレッジ分析スクリプト
 *
 * このスクリプトは、テストカバレッジレポートを分析し、
 * 未カバー箇所をリストアップして優先度を特定します。
 */

import * as fs from 'fs';
import * as path from 'path';

interface CoverageSummary {
  total: {
    lines: { total: number; covered: number; skipped: number; pct: number };
    statements: { total: number; covered: number; skipped: number; pct: number };
    functions: { total: number; covered: number; skipped: number; pct: number };
    branches: { total: number; covered: number; skipped: number; pct: number };
  };
  [key: string]: any;
}

interface UncoveredFile {
  file: string;
  lines: number;
  statements: number;
  functions: number;
  branches: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

/**
 * ファイルのカテゴリを判定
 */
function categorizeFile(filePath: string): string {
  if (filePath.includes('/services/progress/')) return '進捗計算エンジン';
  if (filePath.includes('/services/auth')) return '認証機能';
  if (filePath.includes('/services/api')) return 'API通信機能';
  if (filePath.includes('/services/') && filePath.includes('error')) return 'エラーハンドリング';
  if (filePath.includes('/components/')) return 'コンポーネント';
  if (filePath.includes('/hooks/')) return 'カスタムフック';
  if (filePath.includes('/utils/')) return 'ユーティリティ';
  if (filePath.includes('/pages/')) return 'ページ';
  return 'その他';
}

/**
 * 優先度を判定
 */
function determinePriority(category: string, coverage: number): 'high' | 'medium' | 'low' {
  // 重要機能は高優先度
  if (['進捗計算エンジン', '認証機能', 'API通信機能', 'エラーハンドリング'].includes(category)) {
    return coverage < 100 ? 'high' : 'medium';
  }

  // カバレッジが低いものは優先度を上げる
  if (coverage < 50) return 'high';
  if (coverage < 80) return 'medium';
  return 'low';
}

/**
 * カバレッジレポートを分析
 */
function analyzeCoverage(): void {
  const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    console.error('❌ カバレッジレポートが見つかりません');
    console.error('   まず `npm run test:coverage` を実行してください');
    process.exit(1);
  }

  const coverageData: CoverageSummary = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));

  console.log('📊 カバレッジ分析レポート\n');
  console.log('='.repeat(80));

  // 全体のカバレッジを表示
  const total = coverageData.total;
  console.log('\n📈 全体のカバレッジ:');
  console.log(
    `  Lines:      ${total.lines.pct.toFixed(2)}% (${total.lines.covered}/${total.lines.total})`
  );
  console.log(
    `  Statements: ${total.statements.pct.toFixed(2)}% (${total.statements.covered}/${total.statements.total})`
  );
  console.log(
    `  Functions:  ${total.functions.pct.toFixed(2)}% (${total.functions.covered}/${total.functions.total})`
  );
  console.log(
    `  Branches:   ${total.branches.pct.toFixed(2)}% (${total.branches.covered}/${total.branches.total})`
  );

  // 目標達成状況
  const targetCoverage = 80;
  const isTargetMet = total.lines.pct >= targetCoverage;
  console.log(`\n🎯 目標カバレッジ (${targetCoverage}%): ${isTargetMet ? '✅ 達成' : '❌ 未達成'}`);

  if (!isTargetMet) {
    const gap = targetCoverage - total.lines.pct;
    console.log(`   不足: ${gap.toFixed(2)}%`);
  }

  // 未カバー箇所を収集
  const uncoveredFiles: UncoveredFile[] = [];

  for (const [filePath, data] of Object.entries(coverageData)) {
    if (filePath === 'total') continue;

    const fileData = data as any;
    const lineCoverage = fileData.lines?.pct || 0;

    if (lineCoverage < 100) {
      const category = categorizeFile(filePath);
      const priority = determinePriority(category, lineCoverage);

      uncoveredFiles.push({
        file: filePath.replace(/^.*\/src\//, 'src/'),
        lines: lineCoverage,
        statements: fileData.statements?.pct || 0,
        functions: fileData.functions?.pct || 0,
        branches: fileData.branches?.pct || 0,
        priority,
        category,
      });
    }
  }

  // 優先度別にソート
  uncoveredFiles.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.lines - b.lines;
  });

  // カテゴリ別に集計
  const byCategory = uncoveredFiles.reduce(
    (acc, file) => {
      if (!acc[file.category]) {
        acc[file.category] = [];
      }
      acc[file.category].push(file);
      return acc;
    },
    {} as Record<string, UncoveredFile[]>
  );

  console.log('\n📋 カテゴリ別未カバー箇所:');
  console.log('='.repeat(80));

  for (const [category, files] of Object.entries(byCategory)) {
    const avgCoverage = files.reduce((sum, f) => sum + f.lines, 0) / files.length;
    console.log(
      `\n${category} (${files.length}ファイル, 平均カバレッジ: ${avgCoverage.toFixed(2)}%)`
    );

    // 高優先度のファイルのみ表示
    const highPriorityFiles = files.filter(f => f.priority === 'high').slice(0, 5);
    if (highPriorityFiles.length > 0) {
      console.log('  高優先度:');
      highPriorityFiles.forEach(file => {
        console.log(`    - ${file.file}`);
        console.log(
          `      Lines: ${file.lines.toFixed(2)}%, Functions: ${file.functions.toFixed(2)}%, Branches: ${file.branches.toFixed(2)}%`
        );
      });
    }
  }

  // 優先度別サマリー
  console.log('\n🎯 優先度別サマリー:');
  console.log('='.repeat(80));

  const highPriority = uncoveredFiles.filter(f => f.priority === 'high');
  const mediumPriority = uncoveredFiles.filter(f => f.priority === 'medium');
  const lowPriority = uncoveredFiles.filter(f => f.priority === 'low');

  console.log(`\n高優先度: ${highPriority.length}ファイル`);
  console.log(`中優先度: ${mediumPriority.length}ファイル`);
  console.log(`低優先度: ${lowPriority.length}ファイル`);

  // 推奨アクション
  console.log('\n💡 推奨アクション:');
  console.log('='.repeat(80));

  if (highPriority.length > 0) {
    console.log('\n1. 高優先度ファイルのテスト追加:');
    highPriority.slice(0, 10).forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.file} (${file.category})`);
    });
  }

  if (!isTargetMet) {
    console.log('\n2. 目標カバレッジ達成のために:');
    console.log(`   - あと ${gap.toFixed(2)}% のカバレッジ向上が必要です`);
    console.log(`   - 高優先度ファイルから順にテストを追加してください`);
  }

  // レポートをファイルに保存
  const reportPath = path.join(__dirname, '../coverage-analysis-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        overall: {
          lines: total.lines.pct,
          statements: total.statements.pct,
          functions: total.functions.pct,
          branches: total.branches.pct,
          targetMet: isTargetMet,
        },
        byCategory,
        byPriority: {
          high: highPriority,
          medium: mediumPriority,
          low: lowPriority,
        },
      },
      null,
      2
    )
  );

  console.log(`\n📄 詳細レポートを保存しました: ${reportPath}`);
  console.log('\n' + '='.repeat(80));
}

// スクリプト実行
analyzeCoverage();
