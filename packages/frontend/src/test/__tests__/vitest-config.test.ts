import { describe, it, expect } from 'vitest';
import vitestConfig from '../../../vitest.config';

/**
 * Property 2: 設定ファイルの型安全性
 * Validates: Requirements 2.6
 *
 * このテストは、vitest.config.tsがVitest 4の新しい設定形式に準拠していることを検証します。
 */
describe('vitest.config.ts - Vitest 4 Configuration', () => {
  describe('Property 2: 設定ファイルの型安全性', () => {
    it('should have reporters property (not reporter)', () => {
      expect(vitestConfig.test?.reporters).toBeDefined();
      expect(vitestConfig.test?.reporters).toBeInstanceOf(Array);
      expect(vitestConfig.test?.reporters).toContain('dot');

      // 旧プロパティが存在しないことを確認
      expect((vitestConfig.test as any)?.reporter).toBeUndefined();
    });

    it('should have maxWorkers property (not maxConcurrency)', () => {
      expect(vitestConfig.test?.maxWorkers).toBeDefined();
      expect(vitestConfig.test?.maxWorkers).toBe(1);

      // 旧プロパティが存在しないことを確認
      expect((vitestConfig.test as any)?.maxConcurrency).toBeUndefined();
    });

    it('should have execArgv property at top-level (not in poolOptions)', () => {
      expect(vitestConfig.test?.execArgv).toBeDefined();
      expect(vitestConfig.test?.execArgv).toBeInstanceOf(Array);
      expect(vitestConfig.test?.execArgv).toContain('--expose-gc');
      expect(vitestConfig.test?.execArgv).toContain('--max-old-space-size=6144');

      // poolOptions.forks.execArgvが存在しないことを確認
      expect((vitestConfig.test as any)?.poolOptions?.forks?.execArgv).toBeUndefined();
    });

    it('should have isolate property at top-level (not in poolOptions)', () => {
      expect(vitestConfig.test?.isolate).toBeDefined();
      expect(vitestConfig.test?.isolate).toBe(true);

      // poolOptions.forks.isolateが存在しないことを確認
      expect((vitestConfig.test as any)?.poolOptions?.forks?.isolate).toBeUndefined();
    });

    it('should not have coverage.all property', () => {
      expect((vitestConfig.test?.coverage as any)?.all).toBeUndefined();
    });

    it('should have coverage.include property', () => {
      expect(vitestConfig.test?.coverage?.include).toBeDefined();
      expect(vitestConfig.test?.coverage?.include).toBeInstanceOf(Array);
      expect(vitestConfig.test?.coverage?.include).toContain('src/**/*.{ts,tsx}');
    });

    it('should have singleFork property at top-level', () => {
      expect((vitestConfig.test as any)?.singleFork).toBeDefined();
      expect((vitestConfig.test as any)?.singleFork).toBe(false);
    });

    it('should have pool property set to forks', () => {
      expect(vitestConfig.test?.pool).toBe('forks');
    });

    it('should have coverage provider set to v8', () => {
      expect(vitestConfig.test?.coverage?.provider).toBe('v8');
    });

    it('should have coverage reporter configured', () => {
      expect(vitestConfig.test?.coverage?.reporter).toBeDefined();
      expect(vitestConfig.test?.coverage?.reporter).toBeInstanceOf(Array);
      expect(vitestConfig.test?.coverage?.reporter).toContain('json');
      expect(vitestConfig.test?.coverage?.reporter).toContain('json-summary');
      expect(vitestConfig.test?.coverage?.reporter).toContain('text');
    });
  });
});
