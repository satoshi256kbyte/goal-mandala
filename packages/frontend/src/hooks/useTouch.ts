import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// タッチイベントの情報
export interface TouchInfo {
  x: number;
  y: number;
  timestamp: number;
}

// スワイプの方向
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

// スワイプイベントの情報
export interface SwipeEvent {
  direction: SwipeDirection;
  distance: number;
  velocity: number;
  duration: number;
}

// タッチジェスチャーの設定
export interface TouchGestureConfig {
  swipeThreshold: number; // スワイプと判定する最小距離（px）
  velocityThreshold: number; // スワイプと判定する最小速度（px/ms）
  maxDuration: number; // スワイプと判定する最大時間（ms）
}

const defaultConfig: TouchGestureConfig = {
  swipeThreshold: 50,
  velocityThreshold: 0.3,
  maxDuration: 300,
};

/**
 * タッチジェスチャーを処理するフック
 */
export function useTouch(
  onSwipe?: (event: SwipeEvent) => void,
  config: Partial<TouchGestureConfig> = {}
) {
  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const touchStart = useRef<TouchInfo | null>(null);
  const touchEnd = useRef<TouchInfo | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };
    touchEnd.current = null;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current || !onSwipe) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const duration = touchEnd.current.timestamp - touchStart.current.timestamp;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // スワイプの判定
    if (
      distance >= finalConfig.swipeThreshold &&
      velocity >= finalConfig.velocityThreshold &&
      duration <= finalConfig.maxDuration
    ) {
      let direction: SwipeDirection;

      // 方向の判定（より大きな変化量の軸で判定）
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      onSwipe({
        direction,
        distance,
        velocity,
        duration,
      });
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipe, finalConfig]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * 長押しを検出するフック
 */
export function useLongPress(onLongPress: () => void, duration: number = 500) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, duration);
  }, [onLongPress, duration]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const end = useCallback(() => {
    clear();
    return isLongPress.current;
  }, [clear]);

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: end,
    onTouchCancel: clear,
  };
}

/**
 * ピンチズームを検出するフック
 */
export function usePinchZoom(onPinch?: (scale: number, center: { x: number; y: number }) => void) {
  const lastDistance = useRef<number | null>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      lastDistance.current = distance;
      lastCenter.current = center;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && lastDistance.current && lastCenter.current && onPinch) {
        e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        const center = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
        };

        const scale = distance / lastDistance.current;

        onPinch(scale, center);

        lastDistance.current = distance;
        lastCenter.current = center;
      }
    },
    [onPinch]
  );

  const handleTouchEnd = useCallback(() => {
    lastDistance.current = null;
    lastCenter.current = null;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * タッチデバイスかどうかを判定するフック
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia('(pointer: coarse)').matches
      );
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);

    return () => {
      window.removeEventListener('resize', checkTouch);
    };
  }, []);

  return isTouch;
}

/**
 * 仮想キーボードの表示状態を検出するフック
 */
export function useVirtualKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight - currentHeight;

      // 高さの差が100px以上の場合、仮想キーボードが表示されていると判定
      if (heightDiff > 100) {
        setIsVisible(true);
        setHeight(heightDiff);
      } else {
        setIsVisible(false);
        setHeight(0);
      }
    };

    // Visual Viewport APIが利用可能な場合
    if (typeof window !== 'undefined' && 'visualViewport' in window && window.visualViewport) {
      const visualViewport = window.visualViewport;

      const handleViewportChange = () => {
        const heightDiff = window.innerHeight - visualViewport.height;
        setIsVisible(heightDiff > 100);
        setHeight(heightDiff);
      };

      visualViewport.addEventListener('resize', handleViewportChange);

      return () => {
        visualViewport.removeEventListener('resize', handleViewportChange);
      };
    } else if (typeof window !== 'undefined') {
      // フォールバック: window.resizeイベントを使用
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return { isVisible, height };
}
