/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // レスポンシブブレークポイント
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        // カスタムブレークポイント
        mobile: { max: '767px' },
        tablet: { min: '768px', max: '1023px' },
        desktop: { min: '1024px' },
        // 縦向き・横向き
        portrait: { raw: '(orientation: portrait)' },
        landscape: { raw: '(orientation: landscape)' },
        // タッチデバイス
        touch: { raw: '(pointer: coarse)' },
        'no-touch': { raw: '(pointer: fine)' },
      },
      // スペーシング
      spacing: {
        18: '4.5rem',
        88: '22rem',
        128: '32rem',
      },
      // フォントサイズ
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      // タッチターゲットサイズ
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      // アニメーション
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      // グリッドテンプレート
      gridTemplateColumns: {
        mandala: 'repeat(9, minmax(0, 1fr))',
        'mobile-mandala': 'repeat(3, minmax(0, 1fr))',
      },
      // Z-index
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        100: '100',
      },
    },
  },
  plugins: [
    // フォーム要素のスタイリング
    require('@tailwindcss/forms'),
    // カスタムユーティリティ
    function ({ addUtilities, theme }) {
      const newUtilities = {
        // タッチターゲット
        '.touch-target': {
          minHeight: theme('minHeight.touch'),
          minWidth: theme('minWidth.touch'),
        },
        // セーフエリア対応
        '.safe-top': {
          paddingTop: 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.safe-left': {
          paddingLeft: 'env(safe-area-inset-left)',
        },
        '.safe-right': {
          paddingRight: 'env(safe-area-inset-right)',
        },
        // スクロール最適化
        '.scroll-smooth': {
          scrollBehavior: 'smooth',
        },
        '.scroll-touch': {
          '-webkit-overflow-scrolling': 'touch',
        },
        // フォーカス表示
        '.focus-ring': {
          '&:focus': {
            outline: '2px solid transparent',
            outlineOffset: '2px',
            boxShadow: '0 0 0 2px #3b82f6',
          },
        },
        // ホバー効果（タッチデバイスでは無効）
        '.hover-lift': {
          '@media (hover: hover)': {
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
