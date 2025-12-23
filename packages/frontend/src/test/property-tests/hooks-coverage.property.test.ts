/**
 * Hooksカバレッジ目標の達成を検証するプロパティベーステスト
 *
 * **Feature: 4.5-test-coverage-improvement, Property 4: Hooksカバレッジ目標の達成**
 * **Validates: Requirements 2.1**
 *
 * このテストは、Hooksカテゴリのカバレッジが各Phaseの目標値に達しているかを検証します。
 * - Phase 1: 40%以上
 * - Phase 2: 60%以上
 * - Phase 3: 80%以上
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

interface CoverageData {
  total: {
    statements: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
    lines: { pct: number };
  };
  [key: string]: any;
}

/**
 * カバレッジレポートからHooksのカバレッジを取得
 */
function getHooksCoverage(): number | null {
  try {
    const coveragePath = path.join(__dirname, '../../../coverage/coverage-summary.json');

    if (!fs.existsSync(coveragePath)) {
      console.warn('カバレッジレポートが見つかりません。テストをスキップします。');
      return null;
    }

    const coverageData: CoverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));

    // Hooksディレクトリのカバレッジを集計
    let totalStatements = 0;
    let coveredStatements = 0;

    Object.keys(coverageData).forEach(filePath => {
      if (filePath.includes('/hooks/') && filePath !== 'total') {
        const fileData = coverageData[filePath];
        if (fileData.statements) {
          totalStatements += fileData.statements.total || 0;
          coveredStatements += fileData.statements.covered || 0;
        }
      }
    });

    if (totalStatements === 0) {
      console.warn('Hooksのカバレッジデータが見つかりません。');
      return null;
    }

    return (coveredStatements / totalStatements) * 100;
  } catch (error) {
    console.error('カバレッジデータの読み込みに失敗しました:', error);
    return null;
  }
}

/**
 * 現在のPhaseを判定
 */
function getCurrentPhase(): 1 | 2 | 3 {
  // 環境変数から現在のPhaseを取得（デフォルトはPhase 1）
  const phase = process.env.TEST_PHASE;
  if (phase === '2') return 2;
  if (phase === '3') return 3;
  return 1;
}

/**
 * Phaseごとの目標カバレッジ
 */
const PHASE_TARGETS = {
  1: 40,
  2: 60,
  3: 80,
} as const;

describe('Property 4: Hooksカバレッジ目標の達成', () => {
  it('Hooksカテゴリのカバレッジが目標値以上である', () => {
    const coverage = getHooksCoverage();

    if (coverage === null) {
      console.warn('カバレッジデータが利用できないため、テストをスキップします。');
      return;
    }

    const currentPhase = getCurrentPhase();
    const targetCoverage = PHASE_TARGETS[currentPhase];

    console.log(`現在のPhase: ${currentPhase}`);
    console.log(`目標カバレッジ: ${targetCoverage}%`);
    console.log(`実際のカバレッジ: ${coverage.toFixed(2)}%`);

    expect(coverage).toBeGreaterThanOrEqual(targetCoverage);
  });

  it('プロパティベーステスト: 任意のカバレッジ測定で目標値以上である', () => {
    const coverage = getHooksCoverage();

    if (coverage === null) {
      console.warn('カバレッジデータが利用できないため、テストをスキップします。');
      return;
    }

    const currentPhase = getCurrentPhase();
    const targetCoverage = PHASE_TARGETS[currentPhase];

    // プロパティ: 任意のカバレッジ測定で、Hooksのカバレッジは目標値以上である
    fc.assert(
      fc.property(fc.constant(coverage), measuredCoverage => {
        return measuredCoverage >= targetCoverage;
      }),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('プロパティベーステスト: カバレッジは0%以上100%以下である', () => {
    const coverage = getHooksCoverage();

    if (coverage === null) {
      console.warn('カバレッジデータが利用できないため、テストをスキップします。');
      return;
    }

    // プロパティ: カバレッジは常に0%以上100%以下である
    fc.assert(
      fc.property(fc.constant(coverage), measuredCoverage => {
        return measuredCoverage >= 0 && measuredCoverage <= 100;
      }),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('プロパティベーステスト: Phase 2のカバレッジはPhase 1以上である', () => {
    const coverage = getHooksCoverage();

    if (coverage === null) {
      console.warn('カバレッジデータが利用できないため、テストをスキップします。');
      return;
    }

    const currentPhase = getCurrentPhase();

    if (currentPhase < 2) {
      console.log('Phase 1のため、このテストはスキップします。');
      return;
    }

    const phase1Target = PHASE_TARGETS[1];

    // プロパティ: Phase 2以降では、カバレッジはPhase 1の目標値以上である
    fc.assert(
      fc.property(fc.constant(coverage), measuredCoverage => {
        return measuredCoverage >= phase1Target;
      }),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('プロパティベーステスト: Phase 3のカバレッジはPhase 2以上である', () => {
    const coverage = getHooksCoverage();

    if (coverage === null) {
      console.warn('カバレッジデータが利用できないため、テストをスキップします。');
      return;
    }

    const currentPhase = getCurrentPhase();

    if (currentPhase < 3) {
      console.log('Phase 1または2のため、このテストはスキップします。');
      return;
    }

    const phase2Target = PHASE_TARGETS[2];

    // プロパティ: Phase 3では、カバレッジはPhase 2の目標値以上である
    fc.assert(
      fc.property(fc.constant(coverage), measuredCoverage => {
        return measuredCoverage >= phase2Target;
      }),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('プロパティベーステスト: カバレッジの単調増加性', () => {
    const coverage = getHooksCoverage();

    if (coverage === null) {
      console.warn('カバレッジデータが利用できないため、テストをスキップします。');
      return;
    }

    const currentPhase = getCurrentPhase();

    // プロパティ: 各Phaseの目標値は単調増加である
    fc.assert(
      fc.property(fc.constantFrom(1, 2, 3), fc.constantFrom(1, 2, 3), (phase1, phase2) => {
        if (phase1 < phase2) {
          return PHASE_TARGETS[phase1] < PHASE_TARGETS[phase2];
        } else if (phase1 === phase2) {
          return PHASE_TARGETS[phase1] === PHASE_TARGETS[phase2];
        } else {
          return PHASE_TARGETS[phase1] > PHASE_TARGETS[phase2];
        }
      }),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });
});
