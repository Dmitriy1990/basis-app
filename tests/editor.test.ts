import { createApp, defineComponent, h } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoteDraft } from '../app/entities/note/model/types';
import { useNoteEditor } from '../app/features/note-editing/model/use-note-editor';

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
