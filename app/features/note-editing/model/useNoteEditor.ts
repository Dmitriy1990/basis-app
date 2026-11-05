import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { NoteDraft } from '~/entities//model';
import { cloneDraft, createEmptyDraft, createTodo, notesEqual } from '~/entities/lib';
import { NoteHistory, TextCommitBuffer } from './history';

const TEXT_PAUSE_MS = 700;
const DRAFT_WRITE_MS = 500;

export function useNoteEditor(options: {
  baseline: () => NoteDraft;
  persistDraft: (draft: NoteDraft) => void;
}) {
  const draft = ref<NoteDraft>(cloneDraft(options.baseline()));
  const history = new NoteHistory();
  const canUndo = ref(false);
  const canRedo = ref(false);
  let draftTimer: ReturnType<typeof setTimeout> | null = null;
  let persistOnUnload = true;

  const dirty = computed(() => !notesEqual(draft.value, options.baseline()));

  function syncFlags(): void {
    canUndo.value = history.canUndo;
    canRedo.value = history.canRedo;
  }

  function scheduleDraftWrite(): void {
    if (draftTimer !== null) {
      clearTimeout(draftTimer);
    }

    draftTimer = setTimeout(() => {
      options.persistDraft(cloneDraft(draft.value));
    }, DRAFT_WRITE_MS);
  }

  const textBuffer = new TextCommitBuffer(TEXT_PAUSE_MS, (fieldId, prev, next) => {
    if (fieldId === 'title') {
      history.push({ kind: 'title', prev, next });
    } else {
      history.push({ kind: 'todoText', id: fieldId, prev, next });
    }
    syncFlags();
    scheduleDraftWrite();
  });

  function cancelDraftWrite(): void {
    if (draftTimer !== null) {
      clearTimeout(draftTimer);
      draftTimer = null;
    }
  }

  function replaceDraft(next: NoteDraft, resetHistory = false): void {
    persistOnUnload = true;
    textBuffer.flush();
    cancelDraftWrite();
    draft.value = cloneDraft(next);
    if (resetHistory) {
      history.clear();
    }
    syncFlags();
  }

  function setTitle(next: string): void {
    textBuffer.begin('title', draft.value.title);
    draft.value = { ...draft.value, title: next };
    textBuffer.update(next);
    scheduleDraftWrite();
  }

  function commitTitle(): void {
    textBuffer.flush();
  }

  function setTodoText(id: string, next: string): void {
    const current = draft.value.todos.find((todo) => todo.id === id);
    if (!current) {
      return;
    }

    textBuffer.begin(id, current.text);
    draft.value = {
      ...draft.value,
      todos: draft.value.todos.map((todo) => (todo.id === id ? { ...todo, text: next } : todo)),
    };
    textBuffer.update(next);
    scheduleDraftWrite();
  }

  function commitTodoText(): void {
    textBuffer.flush();
  }

  function toggleTodo(id: string): void {
    textBuffer.flush();
    const current = draft.value.todos.find((todo) => todo.id === id);
    if (!current) {
      return;
    }

    const next = !current.done;
    history.push({ kind: 'todoDone', id, prev: current.done, next });
    draft.value = {
      ...draft.value,
      todos: draft.value.todos.map((todo) => (todo.id === id ? { ...todo, done: next } : todo)),
    };
    syncFlags();
    scheduleDraftWrite();
  }

  function addTodo(): string {
    textBuffer.flush();
    const item = createTodo();
    const index = draft.value.todos.length;
    history.push({ kind: 'todoAdd', index, item });
    draft.value = {
      ...draft.value,
      todos: [...draft.value.todos, item],
    };
    syncFlags();
    scheduleDraftWrite();
    return item.id;
  }

  function removeTodo(id: string): void {
    textBuffer.flush();
    const index = draft.value.todos.findIndex((todo) => todo.id === id);
    const item = draft.value.todos[index];
    if (index < 0 || !item) {
      return;
    }

    history.push({ kind: 'todoRemove', index, item });
    draft.value = {
      ...draft.value,
      todos: draft.value.todos.filter((todo) => todo.id !== id),
    };
    syncFlags();
    scheduleDraftWrite();
  }

  function undo(): void {
    textBuffer.flush();
    const next = history.undo(draft.value);
    if (next) {
      draft.value = next;
      syncFlags();
      scheduleDraftWrite();
    }
  }

  function redo(): void {
    textBuffer.flush();
    const next = history.redo(draft.value);
    if (next) {
      draft.value = next;
      syncFlags();
      scheduleDraftWrite();
    }
  }

  function resetSession(next: NoteDraft = createEmptyDraft()): void {
    persistOnUnload = true;
    textBuffer.flush();
    cancelDraftWrite();
    history.clear();
    draft.value = cloneDraft(next);
    syncFlags();
  }

  function persistNow(): void {
    cancelDraftWrite();
    options.persistDraft(cloneDraft(draft.value));
  }

  function detach(): void {
    persistOnUnload = false;
    textBuffer.flush();
    cancelDraftWrite();
    history.clear();
  }

  function onPageHide(): void {
    textBuffer.flush();
    if (persistOnUnload) {
      persistNow();
    }
  }

  onMounted(() => {
    window.addEventListener('pagehide', onPageHide);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', onPageHide);
    textBuffer.flush();
    cancelDraftWrite();
    if (persistOnUnload) {
      options.persistDraft(cloneDraft(draft.value));
    }
    textBuffer.dispose();
  });

  return {
    draft,
    dirty,
    canUndo,
    canRedo,
    setTitle,
    commitTitle,
    setTodoText,
    commitTodoText,
    toggleTodo,
    addTodo,
    removeTodo,
    undo,
    redo,
    replaceDraft,
    resetSession,
    detach,
  };
}
