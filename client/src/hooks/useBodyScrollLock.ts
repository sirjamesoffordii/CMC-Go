import { useEffect } from "react";

let lockCount = 0;
let savedScrollY = 0;

function lock() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.overflow = "";
    window.scrollTo(0, savedScrollY);
  }
}

/**
 * Locks body scroll while `active` is true.
 * Supports nested locks — body scroll is only restored
 * when all active locks are released (e.g. BottomSheet
 * closing while MobileDrawer stays open).
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (active) {
      lock();
      return () => unlock();
    }
  }, [active]);
}
