import { ProgressValidator } from './progress-validator';

describe('ProgressValidator', () => {
  let validator: ProgressValidator;

  beforeEach(() => {
    validator = new ProgressValidator();
  });

  describe('isValidProgress', () => {
    describe('有効な進捗値', () => {
      it('0%は有効な進捗値として認識される', () => {
        expect(validator.isValidProgress(0)).toBe(true);
      });

      it('50%は有効な進捗値として認識される', () => {
        expect(validator.isValidProgress(50)).toBe(true);
      });

      it('100%は有効な進捗値として認識される', () => {
        expect(validator.isValidProgress(100)).toBe(true);
      });

      it('小数点を含む有効な進捗値（25.5%）は有効として認識される', () => {
        expect(validator.isValidProgress(25.5)).toBe(true);
      });

      it('小数点を含む有効な進捗値（99.9%）は有効として認識される', () => {
        expect(validator.isValidProgress(99.9)).toBe(true);
      });
    });

    describe('無効な進捗値', () => {
      it('-1%は無効な進捗値として認識される', () => {
        expect(validator.isValidProgress(-1)).toBe(false);
      });

      it('101%は無効な進捗値として認識される', () => {
        expect(validator.isValidProgress(101)).toBe(false);
      });

      it('NaNは無効な進捗値として認識される', () => {
        expect(validator.isValidProgress(NaN)).toBe(false);
      });

      it('-100%は無効な進捗値として認識される', () => {
        expect(validator.isValidProgress(-100)).toBe(false);
      });

      it('200%は無効な進捗値として認識される', () => {
        expect(validator.isValidProgress(200)).toBe(false);
      });

      it('Infinityは無効な進捗値として認識される', () => {
        expect(validator.isValidProgress(Infinity)).toBe(false);
      });

      it('-Infinityは無効な進捗値として認識される', () => {
        expect(validator.isValidProgress(-Infinity)).toBe(false);
      });
    });
  });

  describe('normalizeProgress', () => {
    describe('境界値の正規化', () => {
      it('0%はそのまま0%として正規化される', () => {
        expect(validator.normalizeProgress(0)).toBe(0);
      });

      it('100%はそのまま100%として正規化される', () => {
        expect(validator.normalizeProgress(100)).toBe(100);
      });

      it('50%はそのまま50%として正規化される', () => {
        expect(validator.normalizeProgress(50)).toBe(50);
      });
    });

    describe('範囲外の値の正規化', () => {
      it('-1%は0%に正規化される', () => {
        expect(validator.normalizeProgress(-1)).toBe(0);
      });

      it('101%は100%に正規化される', () => {
        expect(validator.normalizeProgress(101)).toBe(100);
      });

      it('-100%は0%に正規化される', () => {
        expect(validator.normalizeProgress(-100)).toBe(0);
      });

      it('200%は100%に正規化される', () => {
        expect(validator.normalizeProgress(200)).toBe(100);
      });

      it('NaNは0%に正規化される', () => {
        expect(validator.normalizeProgress(NaN)).toBe(0);
      });

      it('Infinityは100%に正規化される', () => {
        expect(validator.normalizeProgress(Infinity)).toBe(100);
      });

      it('-Infinityは0%に正規化される', () => {
        expect(validator.normalizeProgress(-Infinity)).toBe(0);
      });
    });

    describe('小数点の丸め', () => {
      it('25.4%は25%に四捨五入される', () => {
        expect(validator.normalizeProgress(25.4)).toBe(25);
      });

      it('25.5%は26%に四捨五入される', () => {
        expect(validator.normalizeProgress(25.5)).toBe(26);
      });

      it('25.6%は26%に四捨五入される', () => {
        expect(validator.normalizeProgress(25.6)).toBe(26);
      });

      it('99.4%は99%に四捨五入される', () => {
        expect(validator.normalizeProgress(99.4)).toBe(99);
      });

      it('99.5%は100%に四捨五入される', () => {
        expect(validator.normalizeProgress(99.5)).toBe(100);
      });

      it('0.4%は0%に四捨五入される', () => {
        expect(validator.normalizeProgress(0.4)).toBe(0);
      });

      it('0.5%は1%に四捨五入される', () => {
        expect(validator.normalizeProgress(0.5)).toBe(1);
      });
    });
  });

  describe('filterValidProgresses', () => {
    it('全て有効な進捗値の配列はそのまま返される', () => {
      const progresses = [0, 25, 50, 75, 100];
      expect(validator.filterValidProgresses(progresses)).toEqual([0, 25, 50, 75, 100]);
    });

    it('無効な進捗値（-1）が除外される', () => {
      const progresses = [0, -1, 50, 100];
      expect(validator.filterValidProgresses(progresses)).toEqual([0, 50, 100]);
    });

    it('無効な進捗値（101）が除外される', () => {
      const progresses = [0, 50, 101, 100];
      expect(validator.filterValidProgresses(progresses)).toEqual([0, 50, 100]);
    });

    it('無効な進捗値（NaN）が除外される', () => {
      const progresses = [0, NaN, 50, 100];
      expect(validator.filterValidProgresses(progresses)).toEqual([0, 50, 100]);
    });

    it('複数の無効な進捗値が除外される', () => {
      const progresses = [-10, 0, NaN, 50, 101, 100, 200];
      expect(validator.filterValidProgresses(progresses)).toEqual([0, 50, 100]);
    });

    it('全て無効な進捗値の配列は空配列を返す', () => {
      const progresses = [-1, -10, 101, 200, NaN];
      expect(validator.filterValidProgresses(progresses)).toEqual([]);
    });

    it('空配列は空配列を返す', () => {
      const progresses: number[] = [];
      expect(validator.filterValidProgresses(progresses)).toEqual([]);
    });

    it('小数点を含む有効な進捗値は保持される', () => {
      const progresses = [25.5, 50.7, 75.3];
      expect(validator.filterValidProgresses(progresses)).toEqual([25.5, 50.7, 75.3]);
    });

    it('Infinityと-Infinityが除外される', () => {
      const progresses = [0, Infinity, 50, -Infinity, 100];
      expect(validator.filterValidProgresses(progresses)).toEqual([0, 50, 100]);
    });
  });

  describe('calculateAverage', () => {
    describe('有効な進捗値のみの平均計算', () => {
      it('全て同じ値（50%）の平均は50%', () => {
        const progresses = [50, 50, 50, 50];
        expect(validator.calculateAverage(progresses)).toBe(50);
      });

      it('[0, 100]の平均は50%', () => {
        const progresses = [0, 100];
        expect(validator.calculateAverage(progresses)).toBe(50);
      });

      it('[0, 50, 100]の平均は50%', () => {
        const progresses = [0, 50, 100];
        expect(validator.calculateAverage(progresses)).toBe(50);
      });

      it('[25, 50, 75]の平均は50%', () => {
        const progresses = [25, 50, 75];
        expect(validator.calculateAverage(progresses)).toBe(50);
      });

      it('[60, 80, 40]の平均は60%', () => {
        const progresses = [60, 80, 40];
        expect(validator.calculateAverage(progresses)).toBe(60);
      });

      it('8つの進捗値の平均を正しく計算する', () => {
        const progresses = [10, 20, 30, 40, 50, 60, 70, 80];
        // 合計: 360, 平均: 45
        expect(validator.calculateAverage(progresses)).toBe(45);
      });
    });

    describe('無効な進捗値を含む平均計算', () => {
      it('無効な進捗値（-1）を除外して平均を計算する', () => {
        const progresses = [0, -1, 50, 100];
        // 有効な値: [0, 50, 100], 平均: 50
        expect(validator.calculateAverage(progresses)).toBe(50);
      });

      it('無効な進捗値（101）を除外して平均を計算する', () => {
        const progresses = [0, 50, 101, 100];
        // 有効な値: [0, 50, 100], 平均: 50
        expect(validator.calculateAverage(progresses)).toBe(50);
      });

      it('無効な進捗値（NaN）を除外して平均を計算する', () => {
        const progresses = [0, NaN, 50, 100];
        // 有効な値: [0, 50, 100], 平均: 50
        expect(validator.calculateAverage(progresses)).toBe(50);
      });

      it('複数の無効な進捗値を除外して平均を計算する', () => {
        const progresses = [-10, 0, NaN, 50, 101, 100, 200];
        // 有効な値: [0, 50, 100], 平均: 50
        expect(validator.calculateAverage(progresses)).toBe(50);
      });
    });

    describe('エッジケース', () => {
      it('全て無効な進捗値の場合は0%を返す', () => {
        const progresses = [-1, -10, 101, 200, NaN];
        expect(validator.calculateAverage(progresses)).toBe(0);
      });

      it('空配列の場合は0%を返す', () => {
        const progresses: number[] = [];
        expect(validator.calculateAverage(progresses)).toBe(0);
      });

      it('1つの有効な進捗値（75%）の平均は75%', () => {
        const progresses = [75];
        expect(validator.calculateAverage(progresses)).toBe(75);
      });

      it('1つの有効な進捗値（0%）の平均は0%', () => {
        const progresses = [0];
        expect(validator.calculateAverage(progresses)).toBe(0);
      });

      it('1つの有効な進捗値（100%）の平均は100%', () => {
        const progresses = [100];
        expect(validator.calculateAverage(progresses)).toBe(100);
      });
    });

    describe('小数点の丸め', () => {
      it('[33, 33, 33]の平均は33%（33.333...を四捨五入）', () => {
        const progresses = [33, 33, 33];
        expect(validator.calculateAverage(progresses)).toBe(33);
      });

      it('[33, 34, 33]の平均は33%（33.333...を四捨五入）', () => {
        const progresses = [33, 34, 33];
        expect(validator.calculateAverage(progresses)).toBe(33);
      });

      it('[34, 34, 34]の平均は34%（33.666...を四捨五入）', () => {
        const progresses = [34, 34, 34];
        expect(validator.calculateAverage(progresses)).toBe(34);
      });

      it('[25.5, 50.5, 75.5]の平均は51%（50.5を四捨五入）', () => {
        const progresses = [25.5, 50.5, 75.5];
        // 合計: 151.5, 平均: 50.5
        expect(validator.calculateAverage(progresses)).toBe(51);
      });

      it('[25.4, 50.4, 75.4]の平均は50%（50.4を四捨五入）', () => {
        const progresses = [25.4, 50.4, 75.4];
        // 合計: 151.2, 平均: 50.4
        expect(validator.calculateAverage(progresses)).toBe(50);
      });
    });

    describe('実際のユースケース', () => {
      it('8つのアクション進捗の平均を計算する（マンダラチャートのサブ目標）', () => {
        const actionProgresses = [100, 75, 50, 25, 0, 100, 50, 100];
        // 合計: 500, 平均: 62.5
        expect(validator.calculateAverage(actionProgresses)).toBe(63);
      });

      it('8つのサブ目標進捗の平均を計算する（マンダラチャートの目標）', () => {
        const subGoalProgresses = [80, 60, 40, 20, 100, 90, 70, 50];
        // 合計: 510, 平均: 63.75
        expect(validator.calculateAverage(subGoalProgresses)).toBe(64);
      });

      it('一部のアクションが無効な進捗値を持つ場合', () => {
        const actionProgresses = [100, -2, 50, NaN, 0, 101, 50, 100];
        // 有効な値: [100, 50, 0, 50, 100], 平均: 60
        expect(validator.calculateAverage(actionProgresses)).toBe(60);
      });
    });
  });
});
