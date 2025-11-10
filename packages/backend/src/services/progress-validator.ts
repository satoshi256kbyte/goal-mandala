/**
 * ProgressValidator
 *
 * 進捗値の検証を一元管理するクラス
 * 進捗値は0から100の範囲で表される達成度
 */
export class ProgressValidator {
  /**
   * 進捗値が有効かどうかを検証する
   *
   * @param progress - 検証する進捗値
   * @returns 進捗値が有効な場合はtrue、そうでない場合はfalse
   *
   * 有効な進捗値の条件:
   * - NaNでないこと
   * - 0以上であること
   * - 100以下であること
   */
  isValidProgress(progress: number): boolean {
    return !isNaN(progress) && progress >= 0 && progress <= 100;
  }

  /**
   * 進捗値を正規化する（範囲外の値を修正）
   *
   * @param progress - 正規化する進捗値
   * @returns 正規化された進捗値（0-100の範囲、整数）
   *
   * 正規化ルール:
   * - NaNの場合は0を返す
   * - 0未満の場合は0を返す
   * - 100超過の場合は100を返す
   * - 有効な範囲の場合は四捨五入して整数を返す
   */
  normalizeProgress(progress: number): number {
    if (isNaN(progress)) {
      return 0;
    }
    if (progress < 0) {
      return 0;
    }
    if (progress > 100) {
      return 100;
    }
    return Math.round(progress);
  }

  /**
   * 進捗値の配列から有効な値のみをフィルタリング
   *
   * @param progresses - 進捗値の配列
   * @returns 有効な進捗値のみを含む配列
   *
   * 無効な進捗値（NaN、0未満、100超過）は除外される
   */
  filterValidProgresses(progresses: number[]): number[] {
    return progresses.filter(p => this.isValidProgress(p));
  }

  /**
   * 平均進捗を計算する
   *
   * @param progresses - 進捗値の配列
   * @returns 平均進捗値（0-100の範囲、整数）
   *
   * 計算ルール:
   * - 無効な進捗値は自動的に除外される
   * - 有効な進捗値が1つもない場合は0を返す
   * - 有効な進捗値の合計を個数で割り、四捨五入して整数を返す
   */
  calculateAverage(progresses: number[]): number {
    const validProgresses = this.filterValidProgresses(progresses);

    if (validProgresses.length === 0) {
      return 0;
    }

    const sum = validProgresses.reduce((acc, p) => acc + p, 0);
    return Math.round(sum / validProgresses.length);
  }
}
