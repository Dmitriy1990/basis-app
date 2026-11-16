import { createApp, defineComponent, h } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoteDraft } from '../app/entities/model/types';
import { useNoteEditor } from '../app/features/note-editing/model/useNoteEditor';
import {
  resolveHistoryShortcut,
  useEditorShortcuts,
} from '../app/features/note-editing/model/useEditorShortcuts';

function emptyDraft(): NoteDraft {
  return { title: '', todos: [] };
}

function withEditor(baseline: NoteDraft = emptyDraft(), persist: (draft: NoteDraft) => void = () => undefined) {
  let editor!: ReturnType<typeof useNoteEditor>;
  const host = document.createElement('div');
  document.body.appendChild(host);

  const app = createApp(
    defineComponent({
      setup() {
        editor = useNoteEditor({
          baseline: () => baseline,
          persistDraft: persist,
        });
        return () => h('div');
      },
    }),
  );

  app.mount(host);

  return {
    editor,
    unmount: () => {
      app.unmount();
      host.remove();
    },
  };
}

describe('useNoteEditor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces continuous title typing into one undo step after a pause', () => {
    vi.useFakeTimers();
    const { editor, unmount } = withEditor();

    editor.setTitle('П');
    editor.setTitle('По');
    editor.setTitle('Покупки');
    expect(editor.canUndo.value).toBe(false);

    vi.advanceTimersByTime(700);
    expect(editor.canUndo.value).toBe(true);
    expect(editor.draft.value.title).toBe('Покупки');

    editor.undo();
    expect(editor.draft.value.title).toBe('');
    editor.redo();
    expect(editor.draft.value.title).toBe('Покупки');
    unmount();
  });

  it('treats checkbox, add and remove as separate history entries', () => {
    const { editor, unmount } = withEditor();

    const id = editor.addTodo();
    editor.setTodoText(id, 'Молоко');
    editor.commitTodoText();
    editor.toggleTodo(id);
    editor.removeTodo(id);

    expect(editor.canUndo.value).toBe(true);
    editor.undo();
    expect(editor.draft.value.todos).toHaveLength(1);
    editor.undo();
    expect(editor.draft.value.todos[0]?.done).toBe(false);
    editor.undo();
    expect(editor.draft.value.todos[0]?.text).toBe('');
    editor.undo();
    expect(editor.draft.value.todos).toHaveLength(0);
    unmount();
  });

  it('clears the redo branch after a new change', () => {
    const { editor, unmount } = withEditor();

    editor.setTitle('A');
    editor.commitTitle();
    editor.undo();
    expect(editor.canRedo.value).toBe(true);

    editor.setTitle('B');
    editor.commitTitle();
    expect(editor.canRedo.value).toBe(false);
    editor.redo();
    expect(editor.draft.value.title).toBe('B');
    unmount();
  });

  it('undoes mixed typing, toggle and add in reverse chronological order', () => {
    const { editor, unmount } = withEditor();

    editor.setTitle('Список');
    const id = editor.addTodo();
    editor.setTodoText(id, 'Хлеб');
    editor.toggleTodo(id);

    editor.undo();
    expect(editor.draft.value.todos[0]?.done).toBe(false);
    expect(editor.draft.value.todos[0]?.text).toBe('Хлеб');
    expect(editor.draft.value.title).toBe('Список');

    editor.undo();
    expect(editor.draft.value.todos[0]?.text).toBe('');
    expect(editor.draft.value.todos).toHaveLength(1);

    editor.undo();
    expect(editor.draft.value.todos).toHaveLength(0);
    expect(editor.draft.value.title).toBe('Список');

    editor.undo();
    expect(editor.draft.value.title).toBe('');
    unmount();
  });

  it('keeps uncommitted title behind a later checkbox change on undo', () => {
    const { editor, unmount } = withEditor();
    const id = editor.addTodo();
    editor.setTitle('Покупки');
    editor.toggleTodo(id);

    editor.undo();
    expect(editor.draft.value.todos[0]?.done).toBe(false);
    expect(editor.draft.value.title).toBe('Покупки');

    editor.undo();
    expect(editor.draft.value.title).toBe('');
    expect(editor.draft.value.todos).toHaveLength(1);
    unmount();
  });

  it('does not persist a draft after detach', () => {
    vi.useFakeTimers();
    const writes: NoteDraft[] = [];
    const { editor, unmount } = withEditor(emptyDraft(), (draft) => {
      writes.push(draft);
    });

    editor.setTitle('Черновик');
    editor.detach();
    vi.advanceTimersByTime(1000);
    unmount();
    expect(writes).toHaveLength(0);
  });
});

describe('resolveHistoryShortcut', () => {
  it('maps Ctrl+Z and Russian Я on KeyZ to undo', () => {
    expect(
      resolveHistoryShortcut({
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe('undo');
    expect(
      resolveHistoryShortcut({
        key: 'я',
        code: 'KeyZ',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe('undo');
    expect(
      resolveHistoryShortcut({
        key: 'Я',
        code: 'KeyZ',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe('undo');
  });

  it('maps Shift+Ctrl+Z on Russian layout to redo', () => {
    expect(
      resolveHistoryShortcut({
        key: 'я',
        code: 'KeyZ',
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        altKey: false,
      }),
    ).toBe('redo');
  });

  it('invokes undo from a checkbox and a text field on Russian Ctrl+Я', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);

    const app = createApp(
      defineComponent({
        setup() {
          useEditorShortcuts({ undo, redo });
          return () => h('div');
        },
      }),
    );
    app.mount(host);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    document.body.appendChild(checkbox);

    const text = document.createElement('input');
    text.type = 'text';
    document.body.appendChild(text);

    const fire = (target: EventTarget) => {
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'я',
          code: 'KeyZ',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    };

    fire(checkbox);
    fire(text);

    expect(undo).toHaveBeenCalledTimes(2);
    expect(redo).not.toHaveBeenCalled();

    app.unmount();
    host.remove();
    checkbox.remove();
    text.remove();
  });

  it('ignores Z without a modifier', () => {
    expect(
      resolveHistoryShortcut({
        key: 'z',
        code: 'KeyZ',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBeNull();
  });
});
