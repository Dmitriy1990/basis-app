import { onBeforeUnmount, onMounted } from 'vue';

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function useEditorShortcuts(handlers: { undo: () => void; redo: () => void }): void {
  function onKeydown(event: KeyboardEvent): void {
    const isUndoKey = event.key === 'z' || event.key === 'Z';
    if (!isUndoKey || !(event.ctrlKey || event.metaKey)) {
      return;
    }

    if (isTextField(event.target)) {
      return;
    }

    event.preventDefault();
    if (event.shiftKey) {
      handlers.redo();
    } else {
      handlers.undo();
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
  });
}
