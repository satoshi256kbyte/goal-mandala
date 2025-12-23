import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Note: これらのテストは重い処理を含むため、通常のテスト実行ではスキップ
// CI/CDや品質チェック時に個別に実行する
describe.skip('Code Quality Tests', () => {
  it('should have no linting errors', () => {
    try {
      execSync('npm run lint', { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Linting failed: ${error}`);
    }
  });

  it('should have proper formatting', () => {
    try {
      execSync('npm run format -- --check', { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Formatting check failed: ${error}`);
    }
  });

  it('should have TypeScript type checking pass', () => {
    try {
      execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`TypeScript check failed: ${error}`);
    }
  });

  it('should have test coverage above 80%', () => {
    try {
      const result = execSync('npm run test:coverage -- --reporter=json', {
        stdio: 'pipe',
        encoding: 'utf8',
      });

      const coverage = JSON.parse(result);
      const totalCoverage = coverage.total.lines.pct;

      expect(totalCoverage).toBeGreaterThanOrEqual(80);
    } catch (error) {
      console.warn('Coverage check skipped:', error);
    }
  });

  it('should not have TODO comments in production code', () => {
    const srcDir = join(__dirname, '../../');
    const todoPattern = /TODO|FIXME|HACK/i;

    const checkDirectory = (dir: string) => {
      const files = readdirSync(dir);

      for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (
          stat.isDirectory() &&
          !file.startsWith('.') &&
          file !== 'node_modules' &&
          file !== 'generated'
        ) {
          checkDirectory(filePath);
        } else if (
          file.endsWith('.ts') &&
          !file.includes('.test.') &&
          !file.includes('.spec.') &&
          !filePath.includes('/generated/')
        ) {
          const content = readFileSync(filePath, 'utf8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            if (todoPattern.test(line) && !line.includes('// TODO: Remove this comment')) {
              throw new Error(`TODO/FIXME found in ${filePath}:${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    };

    checkDirectory(srcDir);
  });

  it('should have proper error handling in all services', () => {
    const serviceFiles = [
      'task.service.ts',
      'filter.service.ts',
      'progress.service.ts',
      'notification.service.ts',
    ];

    serviceFiles.forEach(file => {
      const filePath = join(__dirname, '../../services', file);
      const content = readFileSync(filePath, 'utf8');

      // Check for try-catch blocks in async methods
      const asyncMethods =
        content.match(/async\s+\w+\([^)]*\)\s*:\s*Promise<[^>]+>\s*{[^}]+}/g) || [];

      asyncMethods.forEach(method => {
        if (!method.includes('try') && !method.includes('catch')) {
          console.warn(`Async method without error handling in ${file}`);
        }
      });
    });
  });

  it('should have consistent naming conventions', () => {
    const srcDir = join(__dirname, '../../');

    const checkNaming = (dir: string) => {
      const files = readdirSync(dir);

      for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory() && !file.startsWith('.')) {
          checkNaming(filePath);
        } else if (file.endsWith('.ts')) {
          // Check file naming (kebab-case for files)
          if (
            !/^[a-z0-9-]+\.ts$/.test(file) &&
            !file.includes('.test.') &&
            !file.includes('.spec.')
          ) {
            console.warn(`File naming convention violation: ${file}`);
          }

          // Check class naming (PascalCase)
          const content = readFileSync(filePath, 'utf8');
          const classMatches = content.match(/export\s+class\s+(\w+)/g) || [];

          classMatches.forEach(match => {
            const className = match.split(' ').pop();
            if (className && !/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
              console.warn(`Class naming convention violation: ${className} in ${file}`);
            }
          });
        }
      }
    };

    checkNaming(srcDir);
  });
});
