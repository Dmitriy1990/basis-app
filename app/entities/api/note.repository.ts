import type { Note, NoteDraft } from '../model/types';

export interface NoteRepository {
  loadNotes(): Promise<Note[]>;
  saveNotes(notes: Note[]): Promise<void>;
  loadDraft(noteId: string): Promise<NoteDraft | null>;
  saveDraft(noteId: string, draft: NoteDraft): Promise<void>;
  clearDraft(noteId: string): Promise<void>;
}
