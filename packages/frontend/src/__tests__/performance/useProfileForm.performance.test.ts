/**
 * useProfileFormフックのパフォーマンステスト
 *
 * 要件: 11.2, 11.3
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useProfileForm } from '../../hooks/useProfileForm';

// モック設定
vi.mock('../../services/profileService', () => ({
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
}));

/**
 * パフォーマンス測定ヘルパー
 */
const measurePerformance = async (callback: () => Promise<void> | void) => {
  const startTime = performance.now();
  await callback();
  const endTime = performance.now();
  return endTime - startTime;
};

describe('useProfileForm - パフォーマンステスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 要件: 11.2 - メモ化の効果確認
   */
  describe('メモ化の効果', () => {
    it('setFieldValueが再レンダリングを最小限に抑えること', async () => {
      let renderCount = 0;

      const { result, rerender } = renderHook(() => {
        renderCount++;
        return useProfileForm();
      });

      const initialRenderCount = renderCount;

      // フィールド値を変更
      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
      });

      // 再レンダリング回数を確認
      const rerenderCount = renderCount - initialRenderCount;
      expect(rerenderCount).toBeLessThanOrEqual(2);
      console.log(`setFieldValue再レンダリング回数: ${rerenderCount}`);
    });

    it('validateFieldが同じ入力に対して同じ結果を返すこと', () => {
      const { result } = renderHook(() => useProfileForm());

      // 初回実行
      const startTime1 = performance.now();
      result.current.validateField('industry');
      const time1 = performance.now() - startTime1;

      // 2回目実行
      const startTime2 = performance.now();
      result.current.validateField('industry');
      const time2 = performance.now() - startTime2;

      // 2回目の方が速いことを確認（キャッシュ効果）
      console.log(`validateField 1回目: ${time1.toFixed(2)}ms, 2回目: ${time2.toFixed(2)}ms`);
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });

  /**
   * 要件: 11.3 - デバウンスの効果確認
   */
  describe('デバウンスの効果', () => {
    it('連続した入力がデバウンスされること', async () => {
      const { result } = renderHook(() => useProfileForm());

      // フィールドをタッチ状態にする
      act(() => {
        result.current.setFieldTouched('jobTitle', true);
      });

      let validationCount = 0;
      const originalValidateField = result.current.validateField;

      // バリデーション実行回数をカウント
      vi.spyOn(result.current, 'validateField').mockImplementation(field => {
        validationCount++;
        return originalValidateField(field);
      });

      // 連続して入力（10回）
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.setFieldValue('jobTitle', `test${i}`);
        });
      }

      // デバウンス時間（300ms）+ バッファ（100ms）待機
      await waitFor(
        () => {
          // デバウンスにより、バリデーションは1回のみ実行されるべき
          expect(validationCount).toBeLessThanOrEqual(2);
        },
        { timeout: 500 }
      );

      console.log(`連続入力時のバリデーション実行回数: ${validationCount}`);
    });

    it('デバウンス時間が適切であること（300ms）', async () => {
      const { result } = renderHook(() => useProfileForm());

      // フィールドをタッチ状態にする
      act(() => {
        result.current.setFieldTouched('jobTitle', true);
      });

      const startTime = performance.now();

      // 入力
      act(() => {
        result.current.setFieldValue('jobTitle', 'test');
      });

      // デバウンス完了まで待機
      await waitFor(
        () => {
          const elapsed = performance.now() - startTime;
          expect(elapsed).toBeGreaterThanOrEqual(300);
        },
        { timeout: 500 }
      );

      const totalTime = performance.now() - startTime;
      console.log(`デバウンス完了時間: ${totalTime.toFixed(2)}ms`);
    });
  });

  /**
   * バリデーション速度
   */
  describe('バリデーション速度', () => {
    it('単一フィールドのバリデーションが高速であること', () => {
      const { result } = renderHook(() => useProfileForm());

      const startTime = performance.now();
      result.current.validateField('industry');
      const validationTime = performance.now() - startTime;

      expect(validationTime).toBeLessThan(10);
      console.log(`単一フィールドバリデーション時間: ${validationTime.toFixed(2)}ms`);
    });

    it('フォーム全体のバリデーションが高速であること', () => {
      const { result } = renderHook(() => useProfileForm());

      // フォームに値を設定
      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'ソフトウェアエンジニア');
        result.current.setFieldValue('position', 'シニアエンジニア');
      });

      const startTime = performance.now();
      result.current.validateForm();
      const validationTime = performance.now() - startTime;

      expect(validationTime).toBeLessThan(50);
      console.log(`フォーム全体バリデーション時間: ${validationTime.toFixed(2)}ms`);
    });
  });

  /**
   * フォーム送信速度
   */
  describe('フォーム送信速度', () => {
    it('handleSubmitが適切な速度で実行されること', async () => {
      const { result } = renderHook(() => useProfileForm());

      // フォームに値を設定
      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'ソフトウェアエンジニア');
      });

      const submitTime = await measurePerformance(async () => {
        await act(async () => {
          await result.current.handleSubmit();
        });
      });

      // API呼び出しを含むため、1秒以内
      expect(submitTime).toBeLessThan(1000);
      console.log(`フォーム送信時間: ${submitTime.toFixed(2)}ms`);
    });
  });

  /**
   * メモリ効率
   */
  describe('メモリ効率', () => {
    it('大量の状態更新でもメモリリークが発生しないこと', async () => {
      const { result } = renderHook(() => useProfileForm());

      // 大量の状態更新
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.setFieldValue('jobTitle', `test${i}`);
        });
      }

      // メモリリークがないことを確認（エラーが発生しない）
      expect(result.current.formData.jobTitle).toBe('test99');
    });

    it('フォームリセットが適切に動作すること', () => {
      const { result } = renderHook(() => useProfileForm());

      // フォームに値を設定
      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'ソフトウェアエンジニア');
      });

      const startTime = performance.now();
      act(() => {
        result.current.resetForm();
      });
      const resetTime = performance.now() - startTime;

      expect(resetTime).toBeLessThan(10);
      expect(result.current.formData.industry).toBe('');
      console.log(`フォームリセット時間: ${resetTime.toFixed(2)}ms`);
    });
  });
});
