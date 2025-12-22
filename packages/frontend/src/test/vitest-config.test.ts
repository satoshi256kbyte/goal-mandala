import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Property 2: 設定ファイルの型安全性
 * Validates: Requirements 2.6
 *
 * このテストは、vitest.config.tsがVitest 4の新しい設定形式に準拠していることを検証します。
 */
describe('vitest.config.ts - Vitest 4 Configuration', () => {
  // 設定ファイルの内容を文字列として読み込む
  const configPath = join(process.cwd(), 'vitest.config.ts');
  const configContent = readFileSync(configPath, 'utf-8');

  describe('Property 2: 設定ファイルの型安全性', () => {
    it('should have reporters property (not reporter)', () => {
      // reporters: ['dot'] が存在することを確認
      expect(configContent).toContain("reporters: ['dot']");

      // test.reporter (旧プロパティ) が存在しないことを確認
      // 注: coverage.reporter は別のプロパティなので許可される
      expect(configContent).not.toContain('// レポーター設定\n    reporter:');
    });

    it('should have maxWorkers property (not maxConcurrency)', () => {
      // maxWorkers: 1 が存在することを確認
      expect(configContent).toContain('maxWorkers: 1');

      // 旧プロパティ maxConcurrency が存在しないことを確認
      expect(configContent).not.toContain('maxConcurrency');
    });

    it('should have execArgv property at top-level (not in poolOptions)', () => {
      // execArgv が test 直下に存在することを確認
      expect(configContent).toMatch(/execArgv:\s*\[.*--expose-gc.*--max-old-space-size=6144.*\]/s);

      // poolOptions.forks.execArgv が存在しないことを確認
      expect(configContent).not.toMatch(/poolOptions:\s*{[\s\S]*forks:\s*{[\s\S]*execArgv:/);
    });

    it('should have isolate property at top-level (not in poolOptions)', () => {
      // isolate: true が test 直下に存在することを確認
      expect(configContent).toContain('isolate: true');

      // poolOptions.forks.isolate が存在しないことを確認（execArgvと同様のチェック）
      const poolOptionsMatch = configContent.match(/poolOptions:\s*{[\s\S]*?}/);
      if (poolOptionsMatch) {
        expect(poolOptionsMatch[0]).not.toContain('isolate');
      }
    });

    it('should not have coverage.all property', () => {
      // coverage.all が存在しないことを確認
      expect(configContent).not.toMatch(/coverage:\s*{[\s\S]*all:/);
    });

    it('should have coverage.include property', () => {
      // coverage.include が存在することを確認
      expect(configContent).toMatch(
        /coverage:\s*{[\s\S]*include:\s*\[.*src\/\*\*\/\*\.{ts,tsx}.*\]/s
      );
    });

    it('should have singleFork property at top-level', () => {
      // singleFork: false が test 直下に存在することを確認
      expect(configContent).toContain('singleFork: false');
    });

    it('should have pool property set to forks', () => {
      // pool: 'forks' が存在することを確認
      expect(configContent).toContain("pool: 'forks'");
    });

    it('should have coverage provider set to v8', () => {
      // coverage.provider: 'v8' が存在することを確認
      expect(configContent).toMatch(/coverage:\s*{[\s\S]*provider:\s*'v8'/s);
    });

    it('should have coverage reporter configured', () => {
      // coverage.reporter が存在し、json, json-summary, text を含むことを確認
      expect(configContent).toMatch(
        /coverage:\s*{[\s\S]*reporter:\s*\[.*'json'.*'json-summary'.*'text'.*\]/s
      );
    });

    it('should not have deprecated poolOptions.forks.execArgv', () => {
      // poolOptions 内に execArgv が存在しないことを確認
      const poolOptionsMatch = configContent.match(/poolOptions:\s*{[\s\S]*?}/);
      if (poolOptionsMatch) {
        expect(poolOptionsMatch[0]).not.toContain('execArgv');
      }
    });

    it('should not have deprecated poolOptions.forks.isolate', () => {
      // poolOptions 内に isolate が存在しないことを確認
      const poolOptionsMatch = configContent.match(/poolOptions:\s*{[\s\S]*?}/);
      if (poolOptionsMatch) {
        expect(poolOptionsMatch[0]).not.toContain('isolate');
      }
    });
  });
});
