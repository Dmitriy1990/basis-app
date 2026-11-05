import type { NoteDraft, TodoItem } from '~/entities/model';
import { cloneDraft } from '~/entities/lib';

export const HISTORY_LIMIT = 50;

export type HistoryPatch =
  | { kind: 'title'; prev: string; next: string }
  | { kind: 'todoText'; id: string; prev: string; next: string }
  | { kind: 'todoDone'; id: string; prev: boolean; next: boolean }
  | { kind: 'todoAdd'; index: number; item: TodoItem }
  | { kind: 'todoRemove'; index: number; item: TodoItem };

function cloneTodo(item: TodoItem): TodoItem {
  return { ...item };
}

export function invertPatch(patch: HistoryPatch): HistoryPatch {
  switch (patch.kind) {
    case 'title':
      return { kind: 'title', prev: patch.next, next: patch.prev };
    case 'todoText':
      return { kind: 'todoText', id: patch.id, prev: patch.next, next: patch.prev };
    case 'todoDone':
      return { kind: 'todoDone', id: patch.id, prev: patch.next, next: patch.prev };
    case 'todoAdd':
      return { kind: 'todoRemove', index: patch.index, item: cloneTodo(patch.item) };
    case 'todoRemove':
      return { kind: 'todoAdd', index: patch.index, item: cloneTodo(patch.item) };
  }
}

export function applyPatch(draft: NoteDraft, patch: HistoryPatch): NoteDraft {
  const next = cloneDraft(draft);

  switch (patch.kind) {
    case 'title':
      next.title = patch.next;
      return next;
    case 'todoText': {
      const todo = next.todos.find((item) => item.id === patch.id);
      if (todo) {
        todo.text = patch.next;
      }
      return next;
    }
    case 'todoDone': {
      const todo = next.todos.find((item) => item.id === patch.id);
      if (todo) {
        todo.done = patch.next;
      }
      return next;
    }
    case 'todoAdd': {
      const index = Math.max(0, Math.min(patch.index, next.todos.length));
      next.todos.splice(index, 0, cloneTodo(patch.item));
      return next;
    }
    case 'todoRemove': {
      const byId = next.todos.findIndex((item) => item.id === patch.item.id);
      const index = byId >= 0 ? byId : patch.index;
      if (index >= 0 && index < next.todos.length) {
        next.todos.splice(index, 1);
      }
      return next;
    }
  }
}

export function isNoopPatch(patch: HistoryPatch): boolean {
  switch (patch.kind) {
    case 'title':
    case 'todoText':
      return patch.prev === patch.next;
    case 'todoDone':
      return patch.prev === patch.next;
    default:
      return false;
  }
}

export class NoteHistory {
  private undoStack: HistoryPatch[] = [];
  private redoStack: HistoryPatch[] = [];

  constructor(private readonly limit = HISTORY_LIMIT) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoSize(): number {
    return this.undoStack.length;
  }

  get redoSize(): number {
    return this.redoStack.length;
  }

  get patches(): readonly HistoryPatch[] {
    return this.undoStack;
  }

  push(patch: HistoryPatch): boolean {
    if (isNoopPatch(patch)) {
      return false;
    }

    this.undoStack.push(this.clonePatch(patch));
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    return true;
  }

  undo(draft: NoteDraft): NoteDraft | null {
    const patch = this.undoStack.pop();
    if (!patch) {
      return null;
    }

    this.redoStack.push(patch);
    return applyPatch(draft, invertPatch(patch));
  }

  redo(draft: NoteDraft): NoteDraft | null {
    const patch = this.redoStack.pop();
    if (!patch) {
      return null;
    }

    this.undoStack.push(patch);
    return applyPatch(draft, patch);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  private clonePatch(patch: HistoryPatch): HistoryPatch {
    if (patch.kind === 'todoAdd' || patch.kind === 'todoRemove') {
      return { ...patch, item: cloneTodo(patch.item) };
    }

    return { ...patch };
  }
}

export class TextCommitBuffer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private fieldId: string | null = null;
  private origin = '';
  private latest = '';

  constructor(
    private readonly pauseMs: number,
    private readonly onCommit: (fieldId: string, prev: string, next: string) => void,
  ) {}

  begin(fieldId: string, current: string): void {
    if (this.fieldId !== null && this.fieldId !== fieldId) {
      this.flush();
    }

    if (this.fieldId !== fieldId) {
      this.fieldId = fieldId;
      this.origin = current;
      this.latest = current;
    }
  }

  update(next: string): void {
    if (this.fieldId === null) {
      return;
    }

    this.latest = next;
    this.restartTimer();
  }

  flush(): void {
    this.clearTimer();
    if (this.fieldId === null) {
      return;
    }

    const fieldId = this.fieldId;
    const prev = this.origin;
    const next = this.latest;
    this.fieldId = null;
    this.origin = '';
    this.latest = '';

    if (prev !== next) {
      this.onCommit(fieldId, prev, next);
    }
  }

  dispose(): void {
    this.clearTimer();
    this.fieldId = null;
  }

  private restartTimer(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.flush();
    }, this.pauseMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
