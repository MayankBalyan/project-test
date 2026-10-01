import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { AppState } from 'react-native';

const TAG = 'istel-focus';

/**
 * Keeps the screen on while `active` (e.g. a focus timer is running). Browsers drop the wake lock whenever
 * the tab is hidden, so it is asked for again each time the app comes back to the front.
 */
export function useKeepAwakeWhile(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const acquire = () => activateKeepAwakeAsync(TAG).catch(() => {});
    acquire();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && acquire());
    return () => {
      sub.remove();
      deactivateKeepAwake(TAG).catch(() => {});
    };
  }, [active]);
}
