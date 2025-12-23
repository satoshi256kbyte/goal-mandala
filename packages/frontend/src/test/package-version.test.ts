import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Property 1: バージョン更新の正確性
 * Validates: Requirements 1.1, 1.2
 *
 * このテストは、package.jsonのvitestと@vitest/coverage-v8のバージョンが4.0以上であることを検証します。
 */
describe('package.json - Vitest 4 Version', () => {
  // package.jsonの内容を読み込む
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);

  describe('Property 1: バージョン更新の正確性', () => {
    it('should have vitest version 4.0 or higher', () => {
      const vitestVersion = packageJson.devDependencies?.vitest;

      expect(vitestVersion).toBeDefined();
      expect(vitestVersion).toMatch(/^\^4\./);

      // バージョン番号を抽出して確認
      const versionMatch = vitestVersion.match(/\^?(\d+)\./);
      if (versionMatch) {
        const majorVersion = parseInt(versionMatch[1], 10);
        expect(majorVersion).toBeGreaterThanOrEqual(4);
      }
    });

    it('should have @vitest/coverage-v8 version 4.0 or higher', () => {
      const coverageVersion = packageJson.devDependencies?.['@vitest/coverage-v8'];

      expect(coverageVersion).toBeDefined();
      expect(coverageVersion).toMatch(/^\^4\./);

      // バージョン番号を抽出して確認
      const versionMatch = coverageVersion.match(/\^?(\d+)\./);
      if (versionMatch) {
        const majorVersion = parseInt(versionMatch[1], 10);
        expect(majorVersion).toBeGreaterThanOrEqual(4);
      }
    });

    it('should have matching major versions for vitest and @vitest/coverage-v8', () => {
      const vitestVersion = packageJson.devDependencies?.vitest;
      const coverageVersion = packageJson.devDependencies?.['@vitest/coverage-v8'];

      // メジャーバージョンを抽出
      const vitestMajor = vitestVersion?.match(/\^?(\d+)\./)?.[1];
      const coverageMajor = coverageVersion?.match(/\^?(\d+)\./)?.[1];

      expect(vitestMajor).toBe(coverageMajor);
    });
  });
});
