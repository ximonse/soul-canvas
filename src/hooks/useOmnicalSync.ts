import { useEffect } from 'react';
import { registerOmnicalSyncListeners, restoreOmnicalFolder } from '../utils/omnicalSync';

export function useOmnicalSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const unregister = registerOmnicalSyncListeners();
    void restoreOmnicalFolder();
    return unregister;
  }, [enabled]);
}
