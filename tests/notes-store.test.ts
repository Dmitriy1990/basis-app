import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetNotesStore, useNotesStore } from '../app/entities/model/notes.store';
import { SCHEMA_VERSION, type Note } from '../app/entities/model/types';
import {
  NOTES_STORAGE_KEY,
  StorageNoteRepository,
  draftKey,
  resetNoteRepository,
  setNoteRepository,
} from '../app/entities/api';
import { MemoryStorageDriver } from '../app/shared/lib';

function sampleNote(id = 'note-1'): Note {
  return {
    id,
    title: 'Покупки',
    todos: [{ id: 't1', text: 'Чай', done: false }],
    createdAt: 10,
    updatedAt: 20,
  };
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('notes store', () => {
  let driver: MemoryStorageDriver;

  beforeEach(() => {
    resetNotesStore();
    driver = new MemoryStorageDriver();
    setNoteRepository(new StorageNoteRepository(driver));
  });

  afterEach(() => {
    resetNoteRepository();
  });

  it('hydrates and persists a schema version', async () => {
    const store = useNotesStore();
    await store.hydrate();
    expect(store.notes).toEqual([]);

    await store.upsert(sampleNote());
    const raw = await driver.read(NOTES_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { version: number; notes: Note[] };
    expect(parsed.version).toBe(SCHEMA_VERSION);
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0]?.title).toBe('Покупки');

    resetNotesStore();
    const next = useNotesStore();
    await next.hydrate();
    expect(next.getById('note-1')?.title).toBe('Покупки');
  });

  it('does not write notes storage when only a draft changes', async () => {
    const store = useNotesStore();
    await store.hydrate();
    await store.upsert(sampleNote());
    const before = await driver.read(NOTES_STORAGE_KEY);

    await store.writeDraft('note-1', { title: 'Черновик', todos: [] });
    expect(await driver.read(NOTES_STORAGE_KEY)).toBe(before);
    expect((await store.readDraft('note-1'))?.title).toBe('Черновик');
    expect(await driver.read(draftKey('note-1'))).toContain('Черновик');
  });

  it('removes a note and its draft', async () => {
    const store = useNotesStore();
    await store.upsert(sampleNote());
    await store.writeDraft('note-1', { title: 'tmp', todos: [] });
    expect(await store.remove('note-1')).toBe(true);
    expect(store.getById('note-1')).toBeUndefined();
    expect(await store.readDraft('note-1')).toBeNull();
    expect(await store.remove('missing')).toBe(false);
  });

  it('sorts notes by updatedAt descending', async () => {
    const store = useNotesStore();
    await store.upsert({ ...sampleNote('a'), updatedAt: 1 });
    await store.upsert({ ...sampleNote('b'), title: 'Позже', updatedAt: 5 });
    expect(store.sortedNotes.map((note) => note.id)).toEqual(['b', 'a']);
  });

  it('reloads notes when another tab writes the same storage key', async () => {
    const store = useNotesStore();
    await store.hydrate();
    store.listenToCrossTab();

    await driver.write(
      NOTES_STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, notes: [sampleNote()] }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: NOTES_STORAGE_KEY }));
    await flushPromises();

    expect(store.getById('note-1')?.title).toBe('Покупки');
  });

  it('ignores storage payload with a foreign schema version', async () => {
    await driver.write(NOTES_STORAGE_KEY, JSON.stringify({ version: 99, notes: [sampleNote()] }));
    const store = useNotesStore();
    await store.hydrate();
    expect(store.notes).toEqual([]);
  });
});
