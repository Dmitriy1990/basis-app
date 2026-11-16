import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HISTORY_LIMIT,
  NoteHistory,
  TextCommitBuffer,
  applyPatch,
  invertPatch,
} from '../app/features/note-editing/model/history';
import type { NoteDraft } from '../app/entities/model/types';

function draft(partial?: Partial<NoteDraft>): NoteDraft {
  return {
    title: 'Заголовок',
    todos: [{ id: 't1', text: 'Купить хлеб', done: false }],
    ...partial,
  };
}

describe('NoteHistory', () => {
  it('undo and redo title patches', () => {
    const history = new NoteHistory();
    let state = draft();

    history.push({ kind: 'title', prev: 'Заголовок', next: 'Список' });
    state = applyPatch(state, { kind: 'title', prev: 'Заголовок', next: 'Список' });
    expect(state.title).toBe('Список');

    state = history.undo(state)!;
    expect(state.title).toBe('Заголовок');
    expect(history.canRedo).toBe(true);

    state = history.redo(state)!;
    expect(state.title).toBe('Список');
  });

  it('treats checkbox, add and remove as atomic entries', () => {
    const history = new NoteHistory();
    let state = draft({ todos: [] });
    const item = { id: 'n1', text: 'Молоко', done: false };

    history.push({ kind: 'todoAdd', index: 0, item });
    state = applyPatch(state, { kind: 'todoAdd', index: 0, item });
    history.push({ kind: 'todoDone', id: 'n1', prev: false, next: true });
    state = applyPatch(state, { kind: 'todoDone', id: 'n1', prev: false, next: true });
    history.push({ kind: 'todoRemove', index: 0, item: { ...item, done: true } });
    state = applyPatch(state, { kind: 'todoRemove', index: 0, item: { ...item, done: true } });

    expect(history.undoSize).toBe(3);
    state = history.undo(state)!;
    expect(state.todos).toHaveLength(1);
    state = history.undo(state)!;
    expect(state.todos[0]?.done).toBe(false);
    state = history.undo(state)!;
    expect(state.todos).toHaveLength(0);
  });

  it('clears redo after a new change', () => {
    const history = new NoteHistory();
    let state = draft();
    history.push({ kind: 'title', prev: 'Заголовок', next: 'A' });
    state = applyPatch(state, { kind: 'title', prev: 'Заголовок', next: 'A' });
    state = history.undo(state)!;
    expect(history.canRedo).toBe(true);

    history.push({ kind: 'title', prev: 'Заголовок', next: 'B' });
    expect(history.canRedo).toBe(false);
    expect(history.redo(state)).toBeNull();
  });

  it('caps history at 50 patches and does not store full note copies', () => {
    const history = new NoteHistory();
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      history.push({ kind: 'title', prev: `t${i}`, next: `t${i + 1}` });
    }

    expect(history.undoSize).toBe(HISTORY_LIMIT);
    expect(history.patches[0]).toEqual({ kind: 'title', prev: 't5', next: 't6' });
    for (const patch of history.patches) {
      expect(patch).not.toHaveProperty('title');
      expect(patch).not.toHaveProperty('todos');
      expect(Object.keys(patch).length).toBeLessThan(6);
    }
  });

  it('skips no-op patches', () => {
    const history = new NoteHistory();
    expect(history.push({ kind: 'title', prev: 'A', next: 'A' })).toBe(false);
    expect(history.undoSize).toBe(0);
  });

  it('inverts add into remove and back', () => {
    const item = { id: 'x', text: 'A', done: false };
    const add = { kind: 'todoAdd' as const, index: 1, item };
    expect(invertPatch(add)).toEqual({ kind: 'todoRemove', index: 1, item });
    expect(invertPatch(invertPatch(add))).toEqual(add);
  });
});

describe('TextCommitBuffer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('commits continuous typing as a single history entry after a pause', () => {
    vi.useFakeTimers();
    const commits: Array<[string, string, string]> = [];
    const buffer = new TextCommitBuffer(700, (id, prev, next) => commits.push([id, prev, next]));

    buffer.begin('title', '');
    buffer.update('П');
    buffer.update('При');
    buffer.update('Привет');
    expect(commits).toHaveLength(0);

    vi.advanceTimersByTime(700);
    expect(commits).toEqual([['title', '', 'Привет']]);
  });

  it('commits the previous field when typing moves to another field', () => {
    vi.useFakeTimers();
    const commits: Array<[string, string, string]> = [];
    const buffer = new TextCommitBuffer(700, (id, prev, next) => commits.push([id, prev, next]));

    buffer.begin('title', '');
    buffer.update('Дом');
    buffer.begin('t1', 'Купить хлеб');
    expect(commits).toEqual([['title', '', 'Дом']]);
    buffer.update('Купить молоко');
    buffer.flush();
    expect(commits).toEqual([
      ['title', '', 'Дом'],
      ['t1', 'Купить хлеб', 'Купить молоко'],
    ]);
  });

  it('flushes on blur-like flush() without waiting for the pause', () => {
    vi.useFakeTimers();
    const commits: Array<[string, string, string]> = [];
    const buffer = new TextCommitBuffer(700, (id, prev, next) => commits.push([id, prev, next]));

    buffer.begin('t1', 'старый');
    buffer.update('новый');
    buffer.flush();
    expect(commits).toEqual([['t1', 'старый', 'новый']]);
  });

  it('does not commit when the value returned to origin', () => {
    vi.useFakeTimers();
    const commits: Array<[string, string, string]> = [];
    const buffer = new TextCommitBuffer(700, (id, prev, next) => commits.push([id, prev, next]));

    buffer.begin('title', 'A');
    buffer.update('AB');
    buffer.update('A');
    vi.advanceTimersByTime(700);
    expect(commits).toHaveLength(0);
  });
});
