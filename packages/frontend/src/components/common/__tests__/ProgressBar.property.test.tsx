import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar Property-Based Tests', () => {
  /**
   * Feature: task-management, Property 19: 進捗バーの色分け
   * Validates: Requirements 14.4
   *
   * For any 進捗値、進捗バーの色は、
   * 0-33%の場合は赤、34-66%の場合は黄、67-100%の場合は緑である
   */
  describe('Property 19: 進捗バーの色分け', () => {
    it('should use red color for 0-33% progress', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 33 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(<ProgressBar value={progress} label="Test" />);

          // Verify: 赤色のクラスが適用されている
          const progressBar = container.querySelector('[role="progressbar"]');
          expect(progressBar).toBeInTheDocument();

          // 進捗バーの背景色を確認（Tailwind CSSのクラス）
          const progressFill = container.querySelector('.bg-red-500');
          expect(progressFill).toBeInTheDocument();
        }),
        { numRuns: 50 }
      );
    });

    it('should use yellow color for 34-66% progress', () => {
      fc.assert(
        fc.property(fc.integer({ min: 34, max: 66 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(<ProgressBar value={progress} label="Test" />);

          // Verify: 黄色のクラスが適用されている
          const progressBar = container.querySelector('[role="progressbar"]');
          expect(progressBar).toBeInTheDocument();

          // 進捗バーの背景色を確認（Tailwind CSSのクラス）
          const progressFill = container.querySelector('.bg-yellow-500');
          expect(progressFill).toBeInTheDocument();
        }),
        { numRuns: 50 }
      );
    });

    it('should use green color for 67-100% progress', () => {
      fc.assert(
        fc.property(fc.integer({ min: 67, max: 100 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(<ProgressBar value={progress} label="Test" />);

          // Verify: 緑色のクラスが適用されている
          const progressBar = container.querySelector('[role="progressbar"]');
          expect(progressBar).toBeInTheDocument();

          // 進捗バーの背景色を確認（Tailwind CSSのクラス）
          const progressFill = container.querySelector('.bg-green-500');
          expect(progressFill).toBeInTheDocument();
        }),
        { numRuns: 50 }
      );
    });

    it('should always display progress value between 0 and 100', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(<ProgressBar value={progress} label="Test" />);

          // Verify: 進捗値が表示されている
          const progressBar = container.querySelector('[role="progressbar"]');
          expect(progressBar).toBeInTheDocument();
          expect(progressBar).toHaveAttribute('aria-valuenow', progress.toString());
          expect(progressBar).toHaveAttribute('aria-valuemin', '0');
          expect(progressBar).toHaveAttribute('aria-valuemax', '100');
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 境界値テスト
   */
  describe('Boundary value tests', () => {
    it('should handle 0% progress correctly', () => {
      const { container } = render(<ProgressBar value={0} label="Test" />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');

      // 0%は赤色
      const progressFill = container.querySelector('.bg-red-500');
      expect(progressFill).toBeInTheDocument();
    });

    it('should handle 100% progress correctly', () => {
      const { container } = render(<ProgressBar value={100} label="Test" />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');

      // 100%は緑色
      const progressFill = container.querySelector('.bg-green-500');
      expect(progressFill).toBeInTheDocument();
    });

    it('should handle boundary between red and yellow (33-34)', () => {
      const { container: container33 } = render(<ProgressBar value={33} label="Test" />);
      const progressFill33 = container33.querySelector('.bg-red-500');
      expect(progressFill33).toBeInTheDocument();

      const { container: container34 } = render(<ProgressBar value={34} label="Test" />);
      const progressFill34 = container34.querySelector('.bg-yellow-500');
      expect(progressFill34).toBeInTheDocument();
    });

    it('should handle boundary between yellow and green (66-67)', () => {
      const { container: container66 } = render(<ProgressBar value={66} label="Test" />);
      const progressFill66 = container66.querySelector('.bg-yellow-500');
      expect(progressFill66).toBeInTheDocument();

      const { container: container67 } = render(<ProgressBar value={67} label="Test" />);
      const progressFill67 = container67.querySelector('.bg-green-500');
      expect(progressFill67).toBeInTheDocument();
    });
  });

  /**
   * アクセシビリティテスト
   */
  describe('Accessibility tests', () => {
    it('should have proper ARIA attributes for any progress value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (progress, label) => {
            // Execute: 進捗バーをレンダリング
            const { container } = render(<ProgressBar value={progress} label={label} />);

            // Verify: ARIA属性が正しく設定されている
            const progressBar = container.querySelector('[role="progressbar"]');
            expect(progressBar).toBeInTheDocument();
            expect(progressBar).toHaveAttribute('role', 'progressbar');
            expect(progressBar).toHaveAttribute('aria-valuenow', progress.toString());
            expect(progressBar).toHaveAttribute('aria-valuemin', '0');
            expect(progressBar).toHaveAttribute('aria-valuemax', '100');
            expect(progressBar).toHaveAttribute('aria-label', expect.stringContaining(label));
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
