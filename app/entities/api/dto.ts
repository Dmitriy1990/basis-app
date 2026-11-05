import type { Note, NoteDraft } from '../model/types';
import { SCHEMA_VERSION } from '../model/types';

export const NOTES_STORAGE_KEY = 'notes-app:data';
export const DRAFT_STORAGE_PREFIX = 'notes-app:draft:';

export interface NotesPayload {
  version: number;
  notes: Note[];
}

export interface DraftPayload {
  version: number;
  noteId: string;
  draft: NoteDraft;
}

export function draftKey(noteId: string): string {
  return DRAFT_STORAGE_PREFIX + noteId;
}

export function serializeNotes(notes: Note[]): string {
  const payload: NotesPayload = { version: SCHEMA_VERSION, notes };
  return JSON.stringify(payload);
}

export function parseNotes(raw: string | null): Note[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotesPayload>;
    if (parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.notes)) {
      return [];
    }

    return parsed.notes.filter(isNote);
  } catch {
    return [];
  }
}

export function serializeDraft(noteId: string, draft: NoteDraft): string {
  const payload: DraftPayload = { version: SCHEMA_VERSION, noteId, draft };
  return JSON.stringify(payload);
}

export function parseDraft(raw: string | null, noteId: string): NoteDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DraftPayload>;
    if (parsed.version !== SCHEMA_VERSION || parsed.noteId !== noteId || !isDraft(parsed.draft)) {
      return null;
    }

    return parsed.draft;
  } catch {
    return null;
  }
}

function isTodo(value: unknown): value is Note['todos'][number] {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const todo = value as Record<string, unknown>;
  return (
    typeof todo.id === 'string' && typeof todo.text === 'string' && typeof todo.done === 'boolean'
  );
}

function isDraft(value: unknown): value is NoteDraft {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const draft = value as Record<string, unknown>;
  return typeof draft.title === 'string' && Array.isArray(draft.todos) && draft.todos.every(isTodo);
}

function isNote(value: unknown): value is Note {
  if (!isDraft(value)) {
    return false;
  }

  const note = value as unknown as Record<string, unknown>;
  return (
    typeof note.id === 'string' &&
    typeof note.createdAt === 'number' &&
    typeof note.updatedAt === 'number'
  );
}
