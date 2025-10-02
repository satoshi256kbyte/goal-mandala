import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * 視覚的アクセシビリティの設定
 */
export interface VisualAccessibilitySettings {
  /** フォントサイズ */
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  /** 高コントラストモード */
  highContrast: boolean;
  /** 色覚対応モード */
  colorBlindSafe: boolean;
  /** 動きを減らす */
  reduceMotion: boolean;
  /** フォーカス表示の強化 */
  enhancedFocus: boolean;
  /** ダークモード */
  darkMode: boolean;
}

/**
 * 視覚的アクセシビリティのコンテキスト
 */
export interface VisualAccessibilityContextValue {
  settings: VisualAccessibilitySettings;
  updateSettings: (newSettings: Partial<VisualAccessibilitySettings>) => void;
  resetSettings: () => void;
  applySystemPreferences: () => void;
}

/**
 * デフォルト設定
 */
const DEFAULT_SETTINGS: VisualAccessibilitySettings = {
  fontSize: 'medium',
  highContrast: false,
  colorBlindSafe: false,
  reduceMotion: false,
  enhancedFocus: false,
  darkMode: false,
};

/**
 * ローカルストレージのキー
 */
const STORAGE_KEY = 'visual-accessibility-settings';

// コンテキスト作成
const VisualAccessibilityContext = createContext<VisualAccessibilityContextValue | null>(null);

/**
 * 視覚的アクセシビリティプロバイダーのプロパティ
 */
export interface VisualAccessibilityProviderProps {
  children: React.ReactNode;
  /** 初期設定 */
  initialSettings?: Partial<VisualAccessibilitySettings>;
}

/**
 * 視覚的アクセシビリティプロバイダーコンポーネント
 *
 * 要件8の受入基準に対応:
 * - フォーカス表示の実装
 * - 高コントラスト対応の実装
 * - 色覚対応の実装
 * - フォントサイズ拡大対応の実装
 */
export const VisualAccessibilityProvider: React.FC<VisualAccessibilityProviderProps> = ({
  children,
  initialSettings = {},
}) => {
  const [settings, setSettings] = useState<VisualAccessibilitySettings>(() => {
    // ローカルストレージから設定を読み込み
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsedSettings, ...initialSettings };
      }
    } catch (error) {
      console.warn('Failed to load visual accessibility settings:', error);
    }

    return { ...DEFAULT_SETTINGS, ...initialSettings };
  });

  /**
   * 設定を更新
   */
  const updateSettings = useCallback((newSettings: Partial<VisualAccessibilitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };

      // ローカルストレージに保存
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save visual accessibility settings:', error);
      }

      return updated;
    });
  }, []);

  /**
   * 設定をリセット
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear visual accessibility settings:', error);
    }
  }, []);

  /**
   * システム設定を適用
   */
  const applySystemPreferences = useCallback(() => {
    const systemSettings: Partial<VisualAccessibilitySettings> = {};

    // 高コントラストモードの検出
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      systemSettings.highContrast = true;
    }

    // 動きを減らす設定の検出
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      systemSettings.reduceMotion = true;
    }

    // ダークモードの検出
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      systemSettings.darkMode = true;
    }

    updateSettings(systemSettings);
  }, [updateSettings]);

  /**
   * CSSクラスを適用
   */
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // フォントサイズクラスを適用
    body.classList.remove(
      'font-size-small',
      'font-size-medium',
      'font-size-large',
      'font-size-extra-large'
    );
    body.classList.add(`font-size-${settings.fontSize}`);

    // 高コントラストモード
    if (settings.highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }

    // 色覚対応モード
    if (settings.colorBlindSafe) {
      body.classList.add('colorblind-safe');
    } else {
      body.classList.remove('colorblind-safe');
    }

    // 動きを減らす
    if (settings.reduceMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--transition-duration', '0.01ms');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    // フォーカス表示の強化
    if (settings.enhancedFocus) {
      body.classList.add('enhanced-focus-mode');
    } else {
      body.classList.remove('enhanced-focus-mode');
    }

    // ダークモード
    if (settings.darkMode) {
      body.classList.add('dark');
    } else {
      body.classList.remove('dark');
    }

    // CSS カスタムプロパティを設定
    root.style.setProperty('--font-size-multiplier', getFontSizeMultiplier(settings.fontSize));
    root.style.setProperty('--contrast-multiplier', settings.highContrast ? '1.5' : '1');
  }, [settings]);

  /**
   * システム設定の変更を監視
   */
  useEffect(() => {
    const mediaQueries = [
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-color-scheme: dark)'),
    ];

    const handleChange = () => {
      // システム設定が変更された場合の処理
      // 自動適用はしないが、ユーザーに通知することも可能
    };

    mediaQueries.forEach(mq => {
      mq.addEventListener('change', handleChange);
    });

    return () => {
      mediaQueries.forEach(mq => {
        mq.removeEventListener('change', handleChange);
      });
    };
  }, []);

  const contextValue: VisualAccessibilityContextValue = {
    settings,
    updateSettings,
    resetSettings,
    applySystemPreferences,
  };

  return (
    <VisualAccessibilityContext.Provider value={contextValue}>
      {children}
    </VisualAccessibilityContext.Provider>
  );
};

/**
 * 視覚的アクセシビリティコンテキストを使用するフック
 */
export const useVisualAccessibility = (): VisualAccessibilityContextValue => {
  const context = useContext(VisualAccessibilityContext);
  if (!context) {
    throw new Error('useVisualAccessibility must be used within a VisualAccessibilityProvider');
  }
  return context;
};

/**
 * フォントサイズの倍率を取得
 */
function getFontSizeMultiplier(fontSize: VisualAccessibilitySettings['fontSize']): string {
  switch (fontSize) {
    case 'small':
      return '0.875';
    case 'medium':
      return '1';
    case 'large':
      return '1.125';
    case 'extra-large':
      return '1.25';
    default:
      return '1';
  }
}

/**
 * 色覚対応の色を取得するヘルパー関数
 */
export const getColorBlindSafeColors = () => ({
  success: {
    bg: 'bg-success-safe',
    border: 'border-success-safe',
    text: 'text-success-safe',
    pattern: 'border-pattern-success',
    status: 'status-success',
  },
  error: {
    bg: 'bg-error-safe',
    border: 'border-error-safe',
    text: 'text-error-safe',
    pattern: 'border-pattern-error',
    status: 'status-error',
  },
  warning: {
    bg: 'bg-warning-safe',
    border: 'border-warning-safe',
    text: 'text-warning-safe',
    pattern: 'border-pattern-warning',
    status: 'status-warning',
  },
  info: {
    bg: 'bg-info-safe',
    border: 'border-info-safe',
    text: 'text-info-safe',
    pattern: 'border-pattern-info',
    status: 'status-info',
  },
});

/**
 * アクセシビリティ設定に基づいてクラス名を生成するヘルパー関数
 */
export const useAccessibilityClasses = () => {
  const { settings } = useVisualAccessibility();

  return useCallback(
    (
      baseClasses: string,
      options?: {
        interactive?: boolean;
        focusable?: boolean;
        status?: 'success' | 'error' | 'warning' | 'info';
      }
    ) => {
      let classes = baseClasses;

      if (options?.interactive) {
        classes += ' interactive-element';
      }

      if (options?.focusable) {
        classes += ' focusable-element';
        if (settings.enhancedFocus) {
          classes += ' enhanced-focus';
        }
      }

      if (options?.status && settings.colorBlindSafe) {
        const colors = getColorBlindSafeColors();
        const statusColors = colors[options.status];
        classes += ` ${statusColors.pattern} ${statusColors.status}`;
      }

      if (settings.highContrast) {
        classes += ' high-contrast-text';
      }

      return classes;
    },
    [settings]
  );
};

/**
 * 視覚的アクセシビリティ設定パネルコンポーネント
 */
export const VisualAccessibilityPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings, applySystemPreferences } =
    useVisualAccessibility();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">視覚的アクセシビリティ設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="設定パネルを閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* フォントサイズ */}
          <div>
            <label
              htmlFor="font-size-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              フォントサイズ
            </label>
            <select
              id="font-size-select"
              value={settings.fontSize}
              onChange={e => updateSettings({ fontSize: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
              <option value="extra-large">特大</option>
            </select>
          </div>

          {/* チェックボックス設定 */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={e => updateSettings({ highContrast: e.target.checked })}
                className="mr-2"
              />
              高コントラストモード
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.colorBlindSafe}
                onChange={e => updateSettings({ colorBlindSafe: e.target.checked })}
                className="mr-2"
              />
              色覚対応モード
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={e => updateSettings({ reduceMotion: e.target.checked })}
                className="mr-2"
              />
              動きを減らす
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enhancedFocus}
                onChange={e => updateSettings({ enhancedFocus: e.target.checked })}
                className="mr-2"
              />
              フォーカス表示を強化
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={e => updateSettings({ darkMode: e.target.checked })}
                className="mr-2"
              />
              ダークモード
            </label>
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={applySystemPreferences}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              システム設定を適用
            </button>
            <button
              onClick={resetSettings}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              リセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
