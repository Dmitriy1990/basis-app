import { reactive } from 'vue';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Подтвердить',
  cancelLabel: 'Отмена',
  danger: false,
});

let resolver: ((value: boolean) => void) | null = null;

function finish(value: boolean): void {
  state.open = false;
  const resolve = resolver;
  resolver = null;
  resolve?.(value);
}

export function useConfirm() {
  async function confirm(options: ConfirmOptions): Promise<boolean> {
    if (state.open) {
      finish(false);
    }

    state.title = options.title;
    state.message = options.message;
    state.confirmLabel = options.confirmLabel ?? 'Подтвердить';
    state.cancelLabel = options.cancelLabel ?? 'Отмена';
    state.danger = options.danger ?? false;
    state.open = true;

    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  }

  function resolve(value: boolean): void {
    finish(value);
  }

  return {
    confirm,
    resolve,
    state,
  };
}
