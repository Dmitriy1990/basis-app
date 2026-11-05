export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  todos: TodoItem[];
  createdAt: number;
  updatedAt: number;
}

export type NoteDraft = Pick<Note, 'title' | 'todos'>;

export const SCHEMA_VERSION = 1;
