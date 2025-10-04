/**
 * 進捗表示用の色分けユーティリティ
 * 要件3.1, 3.2, 3.3, 3.4, 3.5, 3.6に対応
 */

export interface ColorScheme {
  background: string;
  border: string;
  text: string;
}

export interface ProgressColorOptions {
  colorBlindFriendly?: boolean;
  highContrast?: boolean;
  darkMode?: boolean;
}

/**
 * 進捗値に応じた色分けスキームを取得する
 * 要件に従った色分けルール：
 * - 0%: 灰色
 * - 1-49%: 薄い赤色
 * - 50-79%: 薄い黄色
 * - 80-99%: 薄い緑色
 * - 100%: 濃い緑色
 */
export const getProgressColorScheme = (
  progress: number,
  options: ProgressColorOptions = {}
): ColorScheme => {
  const { colorBlindFriendly = false, highContrast = false, darkMode = false } = options;

  // カラーブラインドネス対応色
  if (colorBlindFriendly) {
    return getColorBlindFriendlyScheme(progress, highContrast, darkMode);
  }

  // ダークモード対応
  if (darkMode) {
    return getDarkModeScheme(progress, highContrast);
  }

  // デフォルト色（ライトモード）
  return getDefaultScheme(progress, highContrast);
};

/**
 * デフォルト色スキーム（ライトモード）
 */
const getDefaultScheme = (progress: number, highContrast: boolean): ColorScheme => {
  const opacity = highContrast ? 0.8 : 0.6;
  const borderOpacity = highContrast ? 1 : 0.8;

  if (progress === 0) {
    return {
      background: `rgba(156, 163, 175, ${opacity})`, // gray-400
      border: `rgba(107, 114, 128, ${borderOpacity})`, // gray-500
      text: '#374151', // gray-700
    };
  }

  if (progress < 50) {
    return {
      background: `rgba(248, 113, 113, ${opacity})`, // red-400
      border: `rgba(239, 68, 68, ${borderOpacity})`, // red-500
      text: '#7f1d1d', // red-900
    };
  }

  if (progress < 80) {
    return {
      background: `rgba(251, 191, 36, ${opacity})`, // yellow-400
      border: `rgba(245, 158, 11, ${borderOpacity})`, // yellow-500
      text: '#78350f', // yellow-900
    };
  }

  if (progress < 100) {
    return {
      background: `rgba(74, 222, 128, ${opacity})`, // green-400
      border: `rgba(34, 197, 94, ${borderOpacity})`, // green-500
      text: '#14532d', // green-900
    };
  }

  // 100%
  return {
    background: `rgba(34, 197, 94, ${highContrast ? 0.9 : 0.8})`, // green-500
    border: `rgba(21, 128, 61, 1)`, // green-700
    text: '#ffffff',
  };
};

/**
 * ダークモード色スキーム
 */
const getDarkModeScheme = (progress: number, highContrast: boolean): ColorScheme => {
  const opacity = highContrast ? 0.9 : 0.7;
  const borderOpacity = highContrast ? 1 : 0.8;

  if (progress === 0) {
    return {
      background: `rgba(75, 85, 99, ${opacity})`, // gray-600
      border: `rgba(55, 65, 81, ${borderOpacity})`, // gray-700
      text: '#d1d5db', // gray-300
    };
  }

  if (progress < 50) {
    return {
      background: `rgba(220, 38, 38, ${opacity})`, // red-600
      border: `rgba(185, 28, 28, ${borderOpacity})`, // red-700
      text: '#fecaca', // red-200
    };
  }

  if (progress < 80) {
    return {
      background: `rgba(217, 119, 6, ${opacity})`, // yellow-600
      border: `rgba(180, 83, 9, ${borderOpacity})`, // yellow-700
      text: '#fef3c7', // yellow-100
    };
  }

  if (progress < 100) {
    return {
      background: `rgba(22, 163, 74, ${opacity})`, // green-600
      border: `rgba(21, 128, 61, ${borderOpacity})`, // green-700
      text: '#dcfce7', // green-100
    };
  }

  // 100%
  return {
    background: `rgba(21, 128, 61, ${highContrast ? 0.95 : 0.85})`, // green-700
    border: `rgba(20, 83, 45, 1)`, // green-800
    text: '#ffffff',
  };
};

/**
 * カラーブラインドネス対応色スキーム
 */
const getColorBlindFriendlyScheme = (
  progress: number,
  highContrast: boolean,
  darkMode: boolean
): ColorScheme => {
  const opacity = highContrast ? 0.8 : 0.6;
  const borderOpacity = highContrast ? 1 : 0.8;

  // ダークモード対応
  const baseColors = darkMode
    ? {
        gray: {
          bg: 'rgba(75, 85, 99, opacity)',
          border: 'rgba(55, 65, 81, borderOpacity)',
          text: '#d1d5db',
        },
        blue: {
          bg: 'rgba(37, 99, 235, opacity)',
          border: 'rgba(29, 78, 216, borderOpacity)',
          text: '#dbeafe',
        },
        purple: {
          bg: 'rgba(126, 34, 206, opacity)',
          border: 'rgba(107, 33, 168, borderOpacity)',
          text: '#e9d5ff',
        },
        teal: {
          bg: 'rgba(13, 148, 136, opacity)',
          border: 'rgba(15, 118, 110, borderOpacity)',
          text: '#ccfbf1',
        },
        darkTeal: {
          bg: 'rgba(15, 118, 110, opacity)',
          border: 'rgba(17, 94, 89, borderOpacity)',
          text: '#ffffff',
        },
      }
    : {
        gray: {
          bg: 'rgba(156, 163, 175, opacity)',
          border: 'rgba(107, 114, 128, borderOpacity)',
          text: '#374151',
        },
        blue: {
          bg: 'rgba(96, 165, 250, opacity)',
          border: 'rgba(59, 130, 246, borderOpacity)',
          text: '#1e3a8a',
        },
        purple: {
          bg: 'rgba(168, 85, 247, opacity)',
          border: 'rgba(147, 51, 234, borderOpacity)',
          text: '#581c87',
        },
        teal: {
          bg: 'rgba(45, 212, 191, opacity)',
          border: 'rgba(20, 184, 166, borderOpacity)',
          text: '#134e4a',
        },
        darkTeal: {
          bg: 'rgba(20, 184, 166, opacity)',
          border: 'rgba(13, 148, 136, borderOpacity)',
          text: '#ffffff',
        },
      };

  const replaceOpacity = (colorStr: string, actualOpacity: number) =>
    colorStr
      .replace('opacity', actualOpacity.toString())
      .replace('borderOpacity', borderOpacity.toString());

  if (progress === 0) {
    return {
      background: replaceOpacity(baseColors.gray.bg, opacity),
      border: replaceOpacity(baseColors.gray.border, borderOpacity),
      text: baseColors.gray.text,
    };
  }

  if (progress < 50) {
    return {
      background: replaceOpacity(baseColors.blue.bg, opacity),
      border: replaceOpacity(baseColors.blue.border, borderOpacity),
      text: baseColors.blue.text,
    };
  }

  if (progress < 80) {
    return {
      background: replaceOpacity(baseColors.purple.bg, opacity),
      border: replaceOpacity(baseColors.purple.border, borderOpacity),
      text: baseColors.purple.text,
    };
  }

  if (progress < 100) {
    return {
      background: replaceOpacity(baseColors.teal.bg, opacity),
      border: replaceOpacity(baseColors.teal.border, borderOpacity),
      text: baseColors.teal.text,
    };
  }

  // 100%
  return {
    background: replaceOpacity(baseColors.darkTeal.bg, highContrast ? 0.9 : 0.8),
    border: replaceOpacity(baseColors.darkTeal.border, 1),
    text: baseColors.darkTeal.text,
  };
};

/**
 * 進捗値に応じたCSSクラス名を取得する
 */
export const getProgressClassName = (progress: number): string => {
  if (progress === 0) return 'progress-0';
  if (progress < 50) return 'progress-low';
  if (progress < 80) return 'progress-medium';
  if (progress < 100) return 'progress-high';
  return 'progress-complete';
};

/**
 * 進捗値に応じたアクセシビリティ用のラベルを取得する
 */
export const getProgressAriaLabel = (progress: number): string => {
  if (progress === 0) return '未開始';
  if (progress < 50) return '低進捗';
  if (progress < 80) return '中進捗';
  if (progress < 100) return '高進捗';
  return '完了';
};

/**
 * トランジション効果用のCSS設定
 */
export const PROGRESS_TRANSITION_CONFIG = {
  duration: '300ms',
  easing: 'ease-in-out',
  properties: ['background-color', 'border-color', 'color', 'box-shadow'],
} as const;
