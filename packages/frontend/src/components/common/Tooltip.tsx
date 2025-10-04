import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export interface TooltipProps {
  /** ツールチップの内容 */
  content: string | React.ReactNode;
  /** ツールチップを表示する子要素 */
  children: React.ReactNode;
  /** ツールチップの位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** 表示遅延（ミリ秒） */
  delay?: number;
  /** モバイルでのタッチ対応 */
  touchEnabled?: boolean;
  /** カスタムクラス */
  className?: string;
  /** 無効化フラグ */
  disabled?: boolean;
  /** ツールチップのテーマ */
  theme?: 'dark' | 'light' | 'custom';
  /** カスタムスタイル設定 */
  customStyle?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    padding?: string;
    borderRadius?: string;
    maxWidth?: string;
  };
  /** アニメーション設定 */
  animation?: {
    duration?: number;
    easing?: string;
    scale?: boolean;
    fade?: boolean;
  };
  /** タッチ操作の詳細設定 */
  touchConfig?: {
    /** タッチ開始から表示までの遅延 */
    touchDelay?: number;
    /** タッチ終了から非表示までの遅延 */
    hideDelay?: number;
    /** 長押し時間（ミリ秒） */
    longPressThreshold?: number;
    /** タッチ範囲の拡張（px） */
    touchAreaExpansion?: number;
  };
  /** 進捗情報専用の設定 */
  progressInfo?: {
    /** 現在の進捗値 */
    currentValue: number;
    /** 前回の進捗値 */
    previousValue?: number;
    /** 目標値 */
    targetValue?: number;
    /** 詳細情報 */
    details?: {
      completedTasks?: number;
      totalTasks?: number;
      lastUpdated?: Date;
      estimatedCompletion?: Date;
    };
  };
}

/**
 * ツールチップコンポーネント
 *
 * ホバー時やタッチ時に詳細情報を表示するコンポーネント。
 * アクセシビリティとモバイル対応を考慮した実装。
 * 進捗情報の表示に特化した機能も提供。
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  touchEnabled = true,
  className,
  disabled = false,
  theme = 'dark',
  customStyle,
  animation = { duration: 200, easing: 'ease-out', scale: true, fade: true },
  touchConfig = {
    touchDelay: 0,
    hideDelay: 2000,
    longPressThreshold: 500,
    touchAreaExpansion: 10,
  },
  progressInfo,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const touchStartTimeRef = useRef<number>(0);

  // タッチデバイスの検出
  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    setIsTouchDevice(hasTouch);
  }, []);

  const showTooltip = () => {
    if (disabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        timeoutRef.current = null;
      }, delay);
    } else {
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const handleTouchStart = () => {
    if (!touchEnabled || disabled) return;

    touchStartTimeRef.current = Date.now();
    setIsLongPress(false);

    // 長押し検出
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPress(true);
      if (touchConfig.touchDelay && touchConfig.touchDelay > 0) {
        setTimeout(showTooltip, touchConfig.touchDelay);
      } else {
        showTooltip();
      }
    }, touchConfig.longPressThreshold || 500);
  };

  const handleTouchEnd = () => {
    if (!touchEnabled || disabled) return;

    const touchDuration = Date.now() - touchStartTimeRef.current;

    // 長押しタイマーをクリア
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    // 短いタップの場合は即座に表示
    if (touchDuration < (touchConfig.longPressThreshold || 500) && !isLongPress) {
      if (touchConfig.touchDelay && touchConfig.touchDelay > 0) {
        setTimeout(showTooltip, touchConfig.touchDelay);
      } else {
        showTooltip();
      }
    }

    // 非表示タイマーを設定
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      hideTooltip();
      hideTimeoutRef.current = null;
    }, touchConfig.hideDelay || 2000);
  };

  const handleTouchMove = () => {
    // タッチ移動時は長押しをキャンセル
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // 進捗情報のレンダリング
  const renderProgressInfo = () => {
    // If content is already a React node (like from ProgressTooltip), use it as-is
    if (React.isValidElement(content)) return content;

    if (!progressInfo) return content;

    const { currentValue, previousValue, targetValue, details } = progressInfo;
    const change = previousValue !== undefined ? currentValue - previousValue : 0;
    const changeText =
      change > 0 ? `+${change.toFixed(1)}%` : change < 0 ? `${change.toFixed(1)}%` : '変更なし';
    const changeColor =
      change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold">進捗状況</span>
          <span className="text-lg font-bold">{currentValue.toFixed(1)}%</span>
        </div>

        {previousValue !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span>前回から</span>
            <span className={changeColor}>{changeText}</span>
          </div>
        )}

        {targetValue !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span>目標まで</span>
            <span>{(targetValue - currentValue).toFixed(1)}%</span>
          </div>
        )}

        {details && (
          <div className="border-t border-gray-600 pt-2 space-y-1 text-sm">
            {details.completedTasks !== undefined && details.totalTasks !== undefined && (
              <div className="flex justify-between">
                <span>完了タスク</span>
                <span>
                  {details.completedTasks}/{details.totalTasks}
                </span>
              </div>
            )}

            {details.lastUpdated && (
              <div className="flex justify-between">
                <span>最終更新</span>
                <span>{details.lastUpdated.toLocaleDateString('ja-JP')}</span>
              </div>
            )}

            {details.estimatedCompletion && (
              <div className="flex justify-between">
                <span>完了予定</span>
                <span>{details.estimatedCompletion.toLocaleDateString('ja-JP')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // テーマに応じたスタイルを取得
  const getThemeStyles = () => {
    if (theme === 'custom' && customStyle) {
      return {
        backgroundColor: customStyle.backgroundColor || '#374151',
        color: customStyle.textColor || '#ffffff',
        borderColor: customStyle.borderColor,
        fontSize: customStyle.fontSize,
        padding: customStyle.padding,
        borderRadius: customStyle.borderRadius,
        maxWidth: customStyle.maxWidth,
      };
    }

    const themes = {
      dark: {
        backgroundColor: '#374151',
        color: '#ffffff',
        borderColor: '#4b5563',
      },
      light: {
        backgroundColor: '#ffffff',
        color: '#374151',
        borderColor: '#d1d5db',
      },
    };

    return themes[theme] || themes.dark;
  };

  const themeStyles = getThemeStyles();

  // アニメーションクラスを取得
  const getAnimationClasses = () => {
    const classes = [];

    if (animation.fade) {
      classes.push('animate-in', 'fade-in-0');
    }

    if (animation.scale) {
      classes.push('zoom-in-95');
    }

    classes.push(`duration-${animation.duration || 200}`);

    return classes.join(' ');
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  // 位置に応じたクラスを取得
  const getPositionClasses = (pos: string): string => {
    switch (pos) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  // 矢印の位置クラスを取得
  const getArrowClasses = (pos: string): string => {
    const arrowColor =
      theme === 'light'
        ? 'border-white'
        : theme === 'custom' && customStyle?.backgroundColor
          ? `border-[${customStyle.backgroundColor}]`
          : 'border-gray-800';

    switch (pos) {
      case 'top':
        return `top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-4 ${arrowColor.replace('border-', 'border-t-')}`;
      case 'bottom':
        return `bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-4 ${arrowColor.replace('border-', 'border-b-')}`;
      case 'left':
        return `left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-4 ${arrowColor.replace('border-', 'border-l-')}`;
      case 'right':
        return `right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-4 ${arrowColor.replace('border-', 'border-r-')}`;
      default:
        return `top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-4 ${arrowColor.replace('border-', 'border-t-')}`;
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onTouchStart={touchEnabled ? handleTouchStart : undefined}
        onTouchEnd={touchEnabled ? handleTouchEnd : undefined}
        onTouchMove={touchEnabled ? handleTouchMove : undefined}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="cursor-help"
        tabIndex={0}
        role="button"
        aria-describedby={isVisible ? 'tooltip' : undefined}
        style={{
          // タッチ範囲を拡張
          padding:
            touchEnabled && isTouchDevice ? `${touchConfig.touchAreaExpansion || 10}px` : undefined,
          margin:
            touchEnabled && isTouchDevice
              ? `-${touchConfig.touchAreaExpansion || 10}px`
              : undefined,
        }}
      >
        {children}
      </div>

      {isVisible && !disabled && (
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 text-sm rounded shadow-lg',
            'max-w-xs break-words',
            theme === 'light' ? 'border border-gray-200' : '',
            getAnimationClasses(),
            getPositionClasses(position),
            className
          )}
          style={{
            backgroundColor: themeStyles.backgroundColor,
            color: themeStyles.color,
            borderColor: themeStyles.borderColor,
            fontSize: themeStyles.fontSize,
            padding: themeStyles.padding,
            borderRadius: themeStyles.borderRadius,
            maxWidth: themeStyles.maxWidth,
            ...themeStyles,
          }}
        >
          {renderProgressInfo()}
          {/* 矢印 */}
          <div className={cn('absolute w-0 h-0', getArrowClasses(position))} />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
