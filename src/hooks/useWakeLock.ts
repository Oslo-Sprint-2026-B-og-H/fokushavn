import { useEffect } from 'react';

export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    async function request() {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (!active) {
          await lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Unsupported or denied; the screen simply keeps its default behavior.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void request();
    }

    void request();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, []);
}
