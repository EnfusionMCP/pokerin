/** Validated, non-overlapping REST snapshot polling for spectators. */

import { useEffect } from 'react';
import { parseServerMessage } from '../protocol/wsValidation.ts';
import { useTableStore } from '../stores/tableStore.ts';

const POLL_INTERVAL = 3_000;

export function useSpectatorPolling(tableId: string) {
  useEffect(() => {
    if (!tableId) return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    const store = useTableStore.getState();
    store.setConnectionState(tableId, 'connecting', { message: 'Loading table...' });

    const poll = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(`/api/tables/${tableId}`, { signal: controller.signal });
        if (!mounted) return;

        if (response.status === 404) {
          useTableStore.getState().recordProtocolError({
            code: 'TABLE_NOT_FOUND',
            message: 'Table not found',
          });
          useTableStore.getState().setConnectionState(tableId, 'terminal', {
            terminalReason: 'table_not_found',
            message: 'Table not found.',
          });
          return;
        }
        if (!response.ok) {
          useTableStore.getState().setConnectionState(tableId, 'reconnecting', {
            message: `Table state request failed (${response.status}). Retrying...`,
          });
          return;
        }

        const parsed = parseServerMessage(await response.json() as unknown);
        if (!parsed.ok) {
          useTableStore.getState().recordProtocolError(parsed.error);
          useTableStore.getState().setConnectionState(tableId, 'reconnecting', {
            message: 'Invalid table snapshot. Retrying...',
          });
          return;
        }
        if (parsed.message.type !== 'table_state') {
          useTableStore.getState().recordProtocolError({
            code: 'INVALID_SNAPSHOT_TYPE',
            message: 'Table endpoint returned a non-snapshot message.',
          });
          return;
        }

        useTableStore.getState().handleMessage(parsed.message);
      } catch (error) {
        if (!mounted || (error instanceof DOMException && error.name === 'AbortError')) return;
        useTableStore.getState().setConnectionState(tableId, 'reconnecting', {
          message: 'Unable to reach the table. Retrying...',
        });
      } finally {
        controller = null;
        if (mounted && useTableStore.getState().terminalReason === null) {
          timer = setTimeout(poll, POLL_INTERVAL);
        }
      }
    };

    void poll();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      controller?.abort();
      useTableStore.getState().reset();
    };
  }, [tableId]);
}
