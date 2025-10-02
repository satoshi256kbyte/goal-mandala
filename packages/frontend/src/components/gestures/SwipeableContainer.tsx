import React, { useRef, useState, useCallback } from 'react';
import { useTouch, SwipeEvent } from '../../hooks/useTouch';

interface SwipeableContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
  disabled?: boolean;
  threshold?: number;
  velocityThreshold?: number;
}

/**
 * スワイプジェスチャーに対応したコンテナコンポーネント
 */
export function SwipeableContainer({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  className = '',
  disabled = false,
  threshold = 50,
  velocityThreshold = 0.3,
}: SwipeableContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  const handleSwipe = useCallback(
    (event: SwipeEvent) => {
      if (disabled) return;

      switch (event.direction) {
        case 'left':
          onSwipeLeft?.();
          break;
        case 'right':
          onSwipeRight?.();
          break;
        case 'up':
          onSwipeUp?.();
          break;
        case 'down':
          onSwipeDown?.();
          break;
      }

      setIsSwipeActive(false);
    },
    [disabled, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  const touchHandlers = useTouch(handleSwipe, {
    swipeThreshold: threshold,
    velocityThreshold,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!disabled) {
        setIsSwipeActive(true);
        touchHandlers.onTouchStart(e.nativeEvent);
      }
    },
    [disabled, touchHandlers]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!disabled) {
        touchHandlers.onTouchMove(e.nativeEvent);
      }
    },
    [disabled, touchHandlers]
  );

  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent) => {
      if (!disabled) {
        touchHandlers.onTouchEnd();
        setIsSwipeActive(false);
      }
    },
    [disabled, touchHandlers]
  );

  return (
    <div
      ref={containerRef}
      className={`
        ${className}
        ${isSwipeActive ? 'select-none' : ''}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </div>
  );
}

/**
 * タブ切り替え用のスワイプコンテナ
 */
interface SwipeableTabsProps {
  children: React.ReactNode[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
  animationDuration?: number;
}

export function SwipeableTabs({
  children,
  activeIndex,
  onIndexChange,
  className = '',
  animationDuration = 300,
}: SwipeableTabsProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSwipeLeft = useCallback(() => {
    if (isTransitioning) return;

    const nextIndex = Math.min(activeIndex + 1, children.length - 1);
    if (nextIndex !== activeIndex) {
      setIsTransitioning(true);
      onIndexChange(nextIndex);
      setTimeout(() => setIsTransitioning(false), animationDuration);
    }
  }, [activeIndex, children.length, onIndexChange, isTransitioning, animationDuration]);

  const handleSwipeRight = useCallback(() => {
    if (isTransitioning) return;

    const prevIndex = Math.max(activeIndex - 1, 0);
    if (prevIndex !== activeIndex) {
      setIsTransitioning(true);
      onIndexChange(prevIndex);
      setTimeout(() => setIsTransitioning(false), animationDuration);
    }
  }, [activeIndex, onIndexChange, isTransitioning, animationDuration]);

  return (
    <SwipeableContainer
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      className={`overflow-hidden ${className}`}
      disabled={isTransitioning}
    >
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(-${activeIndex * 100}%)`,
          width: `${children.length * 100}%`,
        }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="w-full flex-shrink-0"
            style={{ width: `${100 / children.length}%` }}
          >
            {child}
          </div>
        ))}
      </div>
    </SwipeableContainer>
  );
}

/**
 * カード削除用のスワイプコンテナ
 */
interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteThreshold?: number;
  className?: string;
  deleteText?: string;
}

export function SwipeToDelete({
  children,
  onDelete,
  deleteThreshold = 100,
  className = '',
  deleteText = '削除',
}: SwipeToDeleteProps) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setSwipeDistance(0);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDeleting) return;

      const currentX = e.touches[0].clientX;
      const distance = startX.current - currentX;

      // 左にスワイプした場合のみ処理
      if (distance > 0) {
        setSwipeDistance(Math.min(distance, deleteThreshold * 1.5));
      } else {
        setSwipeDistance(0);
      }
    },
    [isDeleting, deleteThreshold]
  );

  const handleTouchEnd = useCallback(() => {
    if (isDeleting) return;

    if (swipeDistance >= deleteThreshold) {
      setIsDeleting(true);
      onDelete();
    } else {
      setSwipeDistance(0);
    }
  }, [swipeDistance, deleteThreshold, onDelete, isDeleting]);

  const deleteButtonOpacity = Math.min(swipeDistance / deleteThreshold, 1);
  const contentTransform = `translateX(-${swipeDistance}px)`;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* 削除ボタン */}
      <div
        className="absolute right-0 top-0 h-full bg-red-500 flex items-center justify-center text-white font-medium px-4"
        style={{
          opacity: deleteButtonOpacity,
          width: `${deleteThreshold}px`,
        }}
      >
        {deleteText}
      </div>

      {/* メインコンテンツ */}
      <div
        className="transition-transform duration-200 ease-out bg-white"
        style={{
          transform: contentTransform,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * プルトゥリフレッシュコンテナ
 */
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;
  className?: string;
  refreshText?: string;
  refreshingText?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  refreshThreshold = 80,
  className = '',
  refreshText = '引っ張って更新',
  refreshingText = '更新中...',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const scrollTop = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current) {
      scrollTop.current = containerRef.current.scrollTop;
    }
    startY.current = e.touches[0].clientY;
    setPullDistance(0);
    setCanRefresh(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing || scrollTop.current > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      // 下にスワイプした場合のみ処理
      if (distance > 0) {
        e.preventDefault();
        const pullDist = Math.min(distance * 0.5, refreshThreshold * 1.5);
        setPullDistance(pullDist);
        setCanRefresh(pullDist >= refreshThreshold);
      }
    },
    [isRefreshing, refreshThreshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;

    if (canRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setCanRefresh(false);
      }
    } else {
      setPullDistance(0);
      setCanRefresh(false);
    }
  }, [canRefresh, onRefresh, isRefreshing]);

  const refreshIndicatorOpacity = Math.min(pullDistance / refreshThreshold, 1);
  const contentTransform = `translateY(${pullDistance}px)`;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* リフレッシュインジケーター */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center text-gray-600 text-sm font-medium"
        style={{
          height: `${refreshThreshold}px`,
          transform: `translateY(-${refreshThreshold - pullDistance}px)`,
          opacity: refreshIndicatorOpacity,
        }}
      >
        {isRefreshing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
            <span>{refreshingText}</span>
          </div>
        ) : (
          <span>{canRefresh ? '離して更新' : refreshText}</span>
        )}
      </div>

      {/* メインコンテンツ */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: contentTransform,
        }}
      >
        {children}
      </div>
    </div>
  );
}
