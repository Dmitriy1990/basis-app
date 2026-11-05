import { computed, reactive, ref } from 'vue';
import type { Note, NoteDraft } from './types';
import { NOTES_STORAGE_KEY, getNoteRepository } from '../api';
import { NEW_NOTE_ROUTE_ID, sortNotes } from '../lib';

function createNotesStore() {
  const notes = ref<Note[]>([]);
  const hydrated = ref(false);
  let crossTabBound = false;

  const sortedNotes = computed(() => sortNotes(notes.value));

  async function hydrate(): Promise<void> {
    notes.value = await getNoteRepository().loadNotes();
    hydrated.value = true;
  }

  function listenToCrossTab(): void {
    if (crossTabBound || typeof window === 'undefined') {
      return;
    }

    crossTabBound = true;
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === NOTES_STORAGE_KEY) {
        void hydrate();
      }
    });
  }

  function getById(id: string): Note | undefined {
    return notes.value.find((note) => note.id === id);
  }

  async function upsert(note: Note): Promise<void> {
    const index = notes.value.findIndex((item) => item.id === note.id);
    if (index >= 0) {
      const next = [...notes.value];
      next[index] = note;
      notes.value = next;
    } else {
      notes.value = [...notes.value, note];
    }

    await getNoteRepository().saveNotes(notes.value);
    await dropDraft(note.id);
    if (note.id !== NEW_NOTE_ROUTE_ID) {
      await dropDraft(NEW_NOTE_ROUTE_ID);
    }
  }

  async function remove(id: string): Promise<boolean> {
    const exists = notes.value.some((note) => note.id === id);
    if (!exists) {
      await dropDraft(id);
      return false;
    }

    notes.value = notes.value.filter((note) => note.id !== id);
    await getNoteRepository().saveNotes(notes.value);
    await dropDraft(id);
    return true;
  }

  async function writeDraft(noteId: string, draft: NoteDraft): Promise<void> {
    await getNoteRepository().saveDraft(noteId, draft);
  }

  async function readDraft(noteId: string): Promise<NoteDraft | null> {
    return getNoteRepository().loadDraft(noteId);
  }

  async function dropDraft(noteId: string): Promise<void> {
    await getNoteRepository().clearDraft(noteId);
  }

  return reactive({
    notes,
    hydrated,
    sortedNotes,
    hydrate,
    listenToCrossTab,
    getById,
    upsert,
    remove,
    writeDraft,
    readDraft,
    dropDraft,
  });
}

export type NotesStore = ReturnType<typeof createNotesStore>;

let instance: NotesStore | null = null;

export function useNotesStore(): NotesStore {
  return (instance ??= createNotesStore());
}

export function resetNotesStore(): void {
  instance = null;
}
