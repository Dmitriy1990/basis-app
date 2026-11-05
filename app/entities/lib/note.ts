import { createId } from '~/shared/lib';
import type { Note, NoteDraft, TodoItem } from '../model';

export const NEW_NOTE_ROUTE_ID = 'new';
export const PREVIEW_TODO_LIMIT = 3;

export function createEmptyDraft(): NoteDraft {
  return {
    title: '',
    todos: [],
  };
}

export function createTodo(text = '', done = false): TodoItem {
  return {
    id: createId(),
    text,
    done,
  };
}

export function cloneDraft(draft: NoteDraft): NoteDraft {
  return {
    title: draft.title,
    todos: draft.todos.map((todo) => ({ ...todo })),
  };
}

export function notesEqual(a: NoteDraft, b: NoteDraft): boolean {
  if (a.title !== b.title || a.todos.length !== b.todos.length) {
    return false;
  }

  return a.todos.every((todo, index) => {
    const other = b.todos[index];
    return (
      other !== undefined &&
      todo.id === other.id &&
      todo.text === other.text &&
      todo.done === other.done
    );
  });
}

export function displayTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : 'Без названия';
}

export function sanitizeDraft(draft: NoteDraft): NoteDraft {
  return {
    title: draft.title.trim(),
    todos: draft.todos
      .map((todo) => ({ ...todo, text: todo.text.trim() }))
      .filter((todo) => todo.text.length > 0),
  };
}

export function toNote(
  id: string,
  draft: NoteDraft,
  timestamps?: Pick<Note, 'createdAt' | 'updatedAt'>,
): Note {
  const now = Date.now();
  const clean = sanitizeDraft(draft);

  return {
    id,
    title: clean.title,
    todos: clean.todos,
    createdAt: timestamps?.createdAt ?? now,
    updatedAt: timestamps?.updatedAt ?? now,
  };
}

export function draftFromNote(note: Note): NoteDraft {
  return cloneDraft({ title: note.title, todos: note.todos });
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}
