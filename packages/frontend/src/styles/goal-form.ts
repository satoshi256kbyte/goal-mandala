/**
 * 目標入力フォーム用の共通スタイル定数
 */

/**
 * カラーテーマ定数
 */
export const colors = {
  // プライマリカラー
  primary: {
    DEFAULT: '#3b82f6',
    hover: '#2563eb',
    light: '#dbeafe',
    dark: '#1d4ed8',
  },

  // セカンダリカラー
  secondary: {
    DEFAULT: '#6b7280',
    light: '#f3f4f6',
    dark: '#374151',
  },

  // ステータスカラー
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // テキストカラー
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    muted: '#9ca3af',
    white: '#ffffff',
  },

  // ボーダーカラー
  border: {
    DEFAULT: '#d1d5db',
    focus: '#3b82f6',
    error: '#ef4444',
    light: '#e5e7eb',
  },

  // 背景カラー
  background: {
    DEFAULT: '#ffffff',
    light: '#f9fafb',
    dark: '#f3f4f6',
  },
} as const;

/**
 * スペーシング定数
 */
export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem', // 32px
  '4xl': '2.5rem', // 40px
} as const;

/**
 * フォントサイズ定数
 */
export const fontSize = {
  xs: '0.75rem', // 12px
  sm: '0.875rem', // 14px
  base: '1rem', // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
} as const;

/**
 * ボーダー半径定数
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  full: '9999px',
} as const;

/**
 * シャドウ定数
 */
export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000',
} as const;

/**
 * フォーム要素の共通スタイルクラス
 */
export const formStyles = {
  // 基本的な入力フィールド
  input: {
    base: 'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
    normal: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    disabled: 'bg-gray-50 text-gray-500 cursor-not-allowed',
  },

  // テキストエリア
  textarea: {
    base: 'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 resize-vertical',
    normal: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
  },

  // ラベル
  label: {
    base: 'block text-sm font-medium text-gray-700 mb-1',
    required: 'after:content-["*"] after:text-red-500 after:ml-1',
  },

  // エラーメッセージ
  error: {
    base: 'mt-1 text-sm text-red-600',
  },

  // ヘルプテキスト
  help: {
    base: 'mt-1 text-sm text-gray-500',
  },

  // 文字数カウンター
  counter: {
    base: 'text-sm text-right mt-1',
    normal: 'text-gray-500',
    warning: 'text-yellow-600',
    error: 'text-red-600',
  },

  // ボタン
  button: {
    base: 'inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
    primary: 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500',
    disabled: 'opacity-50 cursor-not-allowed',
  },
} as const;

/**
 * レスポンシブブレークポイント
 */
export const breakpoints = {
  sm: '640px', // スマートフォン
  md: '768px', // タブレット
  lg: '1024px', // デスクトップ
  xl: '1280px', // 大画面デスクトップ
} as const;

/**
 * アニメーション定数
 */
export const animations = {
  transition: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },

  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

/**
 * Z-index定数
 */
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
} as const;

/**
 * フォームレイアウト定数
 */
export const layout = {
  // フォームの最大幅
  maxWidth: {
    form: '600px',
    container: '1200px',
  },

  // フィールド間のスペース
  fieldSpacing: spacing.xl,

  // セクション間のスペース
  sectionSpacing: spacing['3xl'],
} as const;

/**
 * レスポンシブデザイン定数
 */
export const responsive = {
  // ブレークポイント
  breakpoints: {
    mobile: '0px', // 0px - 767px
    tablet: '768px', // 768px - 1023px
    desktop: '1024px', // 1024px以上
  },

  // デスクトップレイアウト
  desktop: {
    // 2カラムレイアウト
    layout: {
      container: 'lg:grid lg:grid-cols-12 lg:gap-8',
      formColumn: 'lg:col-span-8',
      sideColumn: 'lg:col-span-4',
    },

    // フォーム要素のサイズ
    form: {
      maxWidth: 'lg:max-w-2xl',
      fieldSpacing: 'lg:space-y-8',
      padding: 'lg:p-8',
    },

    // ボタンレイアウト
    buttons: {
      container: 'lg:flex lg:flex-row lg:justify-end lg:space-x-4 lg:space-y-0',
      button: 'lg:w-auto lg:min-w-[120px]',
    },

    // テキスト要素
    text: {
      title: 'lg:text-3xl',
      subtitle: 'lg:text-lg',
      label: 'lg:text-base',
      help: 'lg:text-sm',
    },
  },

  // タブレットレイアウト
  tablet: {
    // 1カラムレイアウト
    layout: {
      container: 'md:max-w-4xl md:mx-auto',
      padding: 'md:px-6',
    },

    // フォーム要素のサイズ
    form: {
      maxWidth: 'md:max-w-3xl',
      fieldSpacing: 'md:space-y-6',
      padding: 'md:p-6',
    },

    // ボタンレイアウト
    buttons: {
      container: 'md:flex md:flex-row md:justify-between md:space-x-4 md:space-y-0',
      button: 'md:flex-1 md:max-w-[200px]',
    },

    // テキスト要素
    text: {
      title: 'md:text-2xl',
      subtitle: 'md:text-base',
      label: 'md:text-sm',
      help: 'md:text-sm',
    },
  },

  // モバイルレイアウト
  mobile: {
    // 縦スクロールレイアウト
    layout: {
      container: 'max-w-full px-4',
      padding: 'px-4',
    },

    // フォーム要素のサイズ
    form: {
      maxWidth: 'max-w-full',
      fieldSpacing: 'space-y-4',
      padding: 'p-4',
    },

    // ボタンレイアウト
    buttons: {
      container: 'flex flex-col space-y-3',
      button: 'w-full min-h-[44px]', // タッチ操作に適したサイズ
    },

    // テキスト要素
    text: {
      title: 'text-xl',
      subtitle: 'text-base',
      label: 'text-sm',
      help: 'text-xs',
    },
  },
} as const;
