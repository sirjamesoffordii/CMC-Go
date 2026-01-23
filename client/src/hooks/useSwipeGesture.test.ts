import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSwipeGesture } from "./useSwipeGesture";

describe("useSwipeGesture", () => {
  it("should call onSwipeRight when swiping right beyond threshold", () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeRight,
        threshold: 50,
      })
    );

    // Simulate touch start
    const touchStartEvent = new TouchEvent("touchstart", {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    result.current.handleTouchStart(touchStartEvent);

    // Simulate touch move (swipe right 60px)
    const touchMoveEvent = new TouchEvent("touchmove", {
      touches: [{ clientX: 160, clientY: 100 } as Touch],
    });
    result.current.handleTouchMove(touchMoveEvent);

    // Simulate touch end
    result.current.handleTouchEnd();

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it("should not call onSwipeRight when swiping right below threshold", () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeRight,
        threshold: 50,
      })
    );

    // Simulate touch start
    const touchStartEvent = new TouchEvent("touchstart", {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    result.current.handleTouchStart(touchStartEvent);

    // Simulate touch move (swipe right 30px - below threshold)
    const touchMoveEvent = new TouchEvent("touchmove", {
      touches: [{ clientX: 130, clientY: 100 } as Touch],
    });
    result.current.handleTouchMove(touchMoveEvent);

    // Simulate touch end
    result.current.handleTouchEnd();

    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("should call onSwipeLeft when swiping left beyond threshold", () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeLeft,
        threshold: 50,
      })
    );

    // Simulate touch start
    const touchStartEvent = new TouchEvent("touchstart", {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    result.current.handleTouchStart(touchStartEvent);

    // Simulate touch move (swipe left 60px)
    const touchMoveEvent = new TouchEvent("touchmove", {
      touches: [{ clientX: 40, clientY: 100 } as Touch],
    });
    result.current.handleTouchMove(touchMoveEvent);

    // Simulate touch end
    result.current.handleTouchEnd();

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it("should call onSwipeMove during swipe", () => {
    const onSwipeMove = vi.fn();
    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeMove,
        threshold: 50,
      })
    );

    // Simulate touch start
    const touchStartEvent = new TouchEvent("touchstart", {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    result.current.handleTouchStart(touchStartEvent);

    // Simulate touch move (swipe right 30px)
    const touchMoveEvent = new TouchEvent("touchmove", {
      touches: [{ clientX: 130, clientY: 100 } as Touch],
    });
    result.current.handleTouchMove(touchMoveEvent);

    expect(onSwipeMove).toHaveBeenCalledWith(30, 0);
  });

  it("should not trigger swipe when vertical movement is greater than horizontal", () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeRight,
        threshold: 50,
      })
    );

    // Simulate touch start
    const touchStartEvent = new TouchEvent("touchstart", {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    result.current.handleTouchStart(touchStartEvent);

    // Simulate touch move (vertical scroll - 30px horizontal, 60px vertical)
    const touchMoveEvent = new TouchEvent("touchmove", {
      touches: [{ clientX: 130, clientY: 160 } as Touch],
    });
    result.current.handleTouchMove(touchMoveEvent);

    // Simulate touch end
    result.current.handleTouchEnd();

    // Should not trigger swipe when vertical movement dominates
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
