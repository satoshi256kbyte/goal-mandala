import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';
import { AnimationSettingsProvider } from '../../../contexts/AnimationSettingsContext';

describe('ProgressBar Property-Based Tests', () => {
  /**
   * Feature: task-management, Property 19: 進捗バーの色分け
   * Validates: Requirements 14.4
   *
   * For any 進捗値、進捗バーの色は、
   * 0%の場合はグレー、1-49%の場合は赤、50-79%の場合はオレンジ、80-100%の場合は緑である
   */
  describe('Property 19: 進捗バーの色分け', () => {
    it('should use gray color for 0% progress', () => {
      // Execute: 進捗バーをレンダリング
      const { container } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={0} label="Test" />
        </AnimationSettingsProvider>
      );

      // Verify: グレー色のクラスが適用されている
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();

      // 進捗バーの背景色を確認（Tailwind CSSのクラス）
      const progressFill = container.querySelector('.bg-gray-400');
      expect(progressFill).toBeInTheDocument();
    });

    it('should use red color for 1-49% progress', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 49 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(
            <AnimationSettingsProvider>
              <ProgressBar value={progress} label="Test" />
            </AnimationSettingsProvider>
          );

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

    it('should use orange color for 50-79% progress', () => {
      fc.assert(
        fc.property(fc.integer({ min: 50, max: 79 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(
            <AnimationSettingsProvider>
              <ProgressBar value={progress} label="Test" />
            </AnimationSettingsProvider>
          );

          // Verify: オレンジ色のクラスが適用されている
          const progressBar = container.querySelector('[role="progressbar"]');
          expect(progressBar).toBeInTheDocument();

          // 進捗バーの背景色を確認（Tailwind CSSのクラス）
          const progressFill = container.querySelector('.bg-orange-500');
          expect(progressFill).toBeInTheDocument();
        }),
        { numRuns: 50 }
      );
    });

    it('should use green color for 80-100% progress', () => {
      fc.assert(
        fc.property(fc.integer({ min: 80, max: 100 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(
            <AnimationSettingsProvider>
              <ProgressBar value={progress} label="Test" />
            </AnimationSettingsProvider>
          );

          // Verify: 緑色のクラスが適用されている
          const progressBar = container.querySelector('[role="progressbar"]');
          expect(progressBar).toBeInTheDocument();

          // 進捗バーの背景色を確認（Tailwind CSSのクラス）
          const progressFill = container.querySelector('.bg-green-600');
          expect(progressFill).toBeInTheDocument();
        }),
        { numRuns: 50 }
      );
    });

    it('should always display progress value between 0 and 100', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(
            <AnimationSettingsProvider>
              <ProgressBar value={progress} label="Test" />
            </AnimationSettingsProvider>
          );

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
      const { container } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={0} label="Test" />
        </AnimationSettingsProvider>
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');

      // 0%はグレー色
      const progressFill = container.querySelector('.bg-gray-400');
      expect(progressFill).toBeInTheDocument();
    });

    it('should handle 100% progress correctly', () => {
      const { container } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={100} label="Test" />
        </AnimationSettingsProvider>
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');

      // 100%は緑色
      const progressFill = container.querySelector('.bg-green-600');
      expect(progressFill).toBeInTheDocument();
    });

    it('should handle boundary between red and orange (49-50)', () => {
      const { container: container49 } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={49} label="Test" />
        </AnimationSettingsProvider>
      );
      const progressFill49 = container49.querySelector('.bg-red-500');
      expect(progressFill49).toBeInTheDocument();

      const { container: container50 } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={50} label="Test" />
        </AnimationSettingsProvider>
      );
      const progressFill50 = container50.querySelector('.bg-orange-500');
      expect(progressFill50).toBeInTheDocument();
    });

    it('should handle boundary between orange and green (79-80)', () => {
      const { container: container79 } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={79} label="Test" />
        </AnimationSettingsProvider>
      );
      const progressFill79 = container79.querySelector('.bg-orange-500');
      expect(progressFill79).toBeInTheDocument();

      const { container: container80 } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={80} label="Test" />
        </AnimationSettingsProvider>
      );
      const progressFill80 = container80.querySelector('.bg-green-600');
      expect(progressFill80).toBeInTheDocument();
    });
  });

  /**
   * アクセシビリティテスト
   */
  describe('Accessibility tests', () => {
    it('should have proper ARIA attributes for any progress value', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), progress => {
          // Execute: 進捗バーをレンダリング
          const { container } = render(
            <AnimationSettingsProvider>
              <ProgressBar value={progress} />
            </AnimationSettingsProvider>
          );

          // Verify: ARIA属性が正しく設定されている
          const progressBar = container.querySelector('[role="progressbar"]');
          expect(progressBar).toBeInTheDocument();
          expect(progressBar).toHaveAttribute('role', 'progressbar');
          expect(progressBar).toHaveAttribute('aria-valuenow', progress.toString());
          expect(progressBar).toHaveAttribute('aria-valuemin', '0');
          expect(progressBar).toHaveAttribute('aria-valuemax', '100');

          // aria-labelは「進捗 X%」の形式であることを確認
          const ariaLabel = progressBar?.getAttribute('aria-label');
          expect(ariaLabel).toMatch(/^進捗 \d+%$/);
        }),
        { numRuns: 50 }
      );
    });
  });
});
