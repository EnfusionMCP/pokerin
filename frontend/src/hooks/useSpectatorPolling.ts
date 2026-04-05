/** REST-based table state polling for unauthenticated spectators. */

import { useEffect } from 'react';
import { useTableStore } from '../stores/tableStore';

export function useSpectatorPolling(tableId: string) {
  useEffect(() => {
    if (!tableId) return;
    let mounted = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tables/${tableId}`);
        if (!res.ok) {
          if (res.status === 404 && mounted) {
            useTableStore.getState().handleMessage({
              type: 'error',
              message: 'Table not found',
            });
          }
          return;
        }
        const data = await res.json();
        if (mounted) {
          useTableStore.getState().handleMessage(data);
          useTableStore.getState().setConnection(tableId, true);
        }
      } catch {
        // Silent — will retry on next poll
      }
    };

    poll();
    const id = setInterval(poll, 3_000);
    return () => {
      mounted = false;
      clearInterval(id);
      useTableStore.getState().reset();
    };
  }, [tableId]);
}
