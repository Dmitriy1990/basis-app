import { onBeforeUnmount, onMounted } from 'vue';

export type HistoryShortcut = 'undo' | 'redo';

function isModified(event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  console.log('event', event);
  return (event.ctrlKey || event.metaKey) && !event.altKey;
}

function isZKey(event: Pick<KeyboardEvent, 'key' | 'code'>): boolean {
  if (event.code === 'KeyZ') {
    return true;
  }

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return key === 'z' || key === 'я';
}

export function resolveHistoryShortcut(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
): HistoryShortcut | null {
  if (!isModified(event) || !isZKey(event)) {
    return null;
  }

  return event.shiftKey ? 'redo' : 'undo';
}

export function useEditorShortcuts(handlers: { undo: () => void; redo: () => void }): void {
  function onKeydown(event: KeyboardEvent): void {
    const action = resolveHistoryShortcut(event);
    if (!action) {
      return;
    }
    console.log('action', action);
    event.preventDefault();
    if (action === 'redo') {
      handlers.redo();
    } else {
      handlers.undo();
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown, true);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown, true);
  });
}
