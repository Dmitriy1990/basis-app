import { LocalStorageDriver, type StorageDriver } from '~/shared/lib';
import type { Note, NoteDraft } from '../model/types';
import type { NoteRepository } from './note.repository';
import {
  NOTES_STORAGE_KEY,
  draftKey,
  parseDraft,
  parseNotes,
  serializeDraft,
  serializeNotes,
} from './dto';

export class StorageNoteRepository implements NoteRepository {
  constructor(private readonly driver: StorageDriver = new LocalStorageDriver()) {}

  async loadNotes(): Promise<Note[]> {
    return parseNotes(await this.driver.read(NOTES_STORAGE_KEY));
  }

  async saveNotes(notes: Note[]): Promise<void> {
    await this.driver.write(NOTES_STORAGE_KEY, serializeNotes(notes));
  }

  async loadDraft(noteId: string): Promise<NoteDraft | null> {
    return parseDraft(await this.driver.read(draftKey(noteId)), noteId);
  }

  async saveDraft(noteId: string, draft: NoteDraft): Promise<void> {
    await this.driver.write(draftKey(noteId), serializeDraft(noteId, draft));
  }

  async clearDraft(noteId: string): Promise<void> {
    await this.driver.remove(draftKey(noteId));
  }
}
