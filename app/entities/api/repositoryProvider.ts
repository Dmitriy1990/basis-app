import type { NoteRepository } from './note.repository';
import { StorageNoteRepository } from './storageNote.repository';

let current: NoteRepository | null = null;

export function getNoteRepository(): NoteRepository {
  current ??= new StorageNoteRepository();
  return current;
}

export function setNoteRepository(repository: NoteRepository): void {
  current = repository;
}

export function resetNoteRepository(): void {
  current = null;
}
