import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { ProgressBar } from '../ProgressBar';

/**
 * Feature: task-management, Property 19: 進捗バーの色分け
 * Validates: Requirements 14.4
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('Property 19: 進捗バーの色分け', () => {
  it.skip('should use correct color coding for progress levels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (progress, label) => {
          cleanup(); // 前のレンダリングをクリーンアップ
          render(<ProgressBar progress={progress} label={label} />);

          const progressBar = screen.getByRole('progressbar');

          // 進捗値に基づく色分けの検証
          if (progress >= 0 && progress <= 33) {
            expect(progressBar).toHaveClass('bg-red-500');
          } else if (progress >= 34 && progress <= 66) {
            expect(progressBar).toHaveClass('bg-yellow-500');
          } else if (progress >= 67 && progress <= 100) {
            expect(progressBar).toHaveClass('bg-green-500');
          }

          // パーセンテージ表示の検証
          expect(screen.getByText(`${progress}%`)).toBeInTheDocument();

          // ラベル表示の検証（空白のみの場合はスキップ）
          if (label.trim().length > 0) {
            // 正規化されたテキストで検索
            const normalizedLabel = label.trim();
            expect(screen.getByText(normalizedLabel)).toBeInTheDocument();
          }

          // アクセシビリティ属性の検証
          expect(progressBar).toHaveAttribute('aria-valuenow', progress.toString());
          expect(progressBar).toHaveAttribute('aria-valuemin', '0');
          expect(progressBar).toHaveAttribute('aria-valuemax', '100');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle boundary values correctly', () => {
    const boundaryValues = [0, 33, 34, 66, 67, 100];

    boundaryValues.forEach(progress => {
      cleanup(); // 前のレンダリングをクリーンアップ
      render(<ProgressBar progress={progress} label={`Progress ${progress}`} />);

      const progressBar = screen.getByRole('progressbar');

      if (progress <= 33) {
        expect(progressBar).toHaveClass('bg-red-500');
      } else if (progress <= 66) {
        expect(progressBar).toHaveClass('bg-yellow-500');
      } else {
        expect(progressBar).toHaveClass('bg-green-500');
      }
    });
  });
});
