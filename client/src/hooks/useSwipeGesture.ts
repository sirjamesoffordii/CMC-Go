import { useRef, useCallback, useMemo } from "react";

interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number;
  onSwipeMove?: (deltaX: number, deltaY: number) => void;
  onSwipeEnd?: () => void;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeRight,
    onSwipeLeft,
    threshold = 50,
    onSwipeMove,
    onSwipeEnd,
  } = options;

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentX.current = e.touches[0].clientX;
    touchCurrentY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      touchCurrentX.current = e.touches[0].clientX;
      touchCurrentY.current = e.touches[0].clientY;

      const deltaX = touchCurrentX.current - touchStartX.current;
      const deltaY = touchCurrentY.current - touchStartY.current;

      // Only consider horizontal swipe if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwiping.current = true;
        // Prevent scrolling when swiping horizontally
        e.preventDefault();

        if (onSwipeMove) {
          onSwipeMove(deltaX, deltaY);
        }
      }
    },
    [onSwipeMove]
  );

  const handleTouchEnd = useCallback(() => {
    const deltaX = touchCurrentX.current - touchStartX.current;
    const deltaY = touchCurrentY.current - touchStartY.current;

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && isSwiping.current) {
      if (deltaX > threshold && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < -threshold && onSwipeLeft) {
        onSwipeLeft();
      } else if (onSwipeEnd) {
        onSwipeEnd();
      }
    } else if (onSwipeEnd) {
      onSwipeEnd();
    }

    // Reset
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchCurrentX.current = 0;
    touchCurrentY.current = 0;
    isSwiping.current = false;
  }, [threshold, onSwipeRight, onSwipeLeft, onSwipeEnd]);

  return useMemo(
    () => ({
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    }),
    [handleTouchStart, handleTouchMove, handleTouchEnd]
  );
}
