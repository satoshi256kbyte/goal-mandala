import { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSSクラス名を条件付きで結合するユーティリティ関数
 * clsxとtailwind-mergeを組み合わせて、重複するクラスを適切にマージする
 *
 * @param inputs - クラス名の配列または条件付きクラス名
 * @returns マージされたクラス名文字列
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
