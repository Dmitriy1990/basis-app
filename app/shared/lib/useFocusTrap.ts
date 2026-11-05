import type { Ref } from 'vue';
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && isVisible(el),
  );
}

export function useFocusTrap(rootRef: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let previous: HTMLElement | null = null;

  function onKeydown(event: KeyboardEvent): void {
    if (!active.value || event.key !== 'Tab' || !rootRef.value) {
      return;
    }

    const nodes = focusableElements(rootRef.value);
    if (nodes.length === 0) {
      event.preventDefault();
      rootRef.value.focus();
      return;
    }

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function activate(): void {
    previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.addEventListener('keydown', onKeydown);

    requestAnimationFrame(() => {
      if (!rootRef.value) {
        return;
      }

      const nodes = focusableElements(rootRef.value);
      (nodes[0] ?? rootRef.value).focus();
    });
  }

  function deactivate(): void {
    document.removeEventListener('keydown', onKeydown);
    previous?.focus();
    previous = null;
  }

  onMounted(() => {
    if (active.value) {
      void nextTick(() => activate());
    }
  });

  watch(active, (isActive) => {
    if (isActive) {
      void nextTick(() => activate());
    } else {
      deactivate();
    }
  });

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
  });
}
