import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { Note, NoteDraft } from '~/entities/model';
import { useNotesStore } from '~/entities/model';
import {
  NEW_NOTE_ROUTE_ID,
  cloneDraft,
  createEmptyDraft,
  draftFromNote,
  notesEqual,
  toNote,
} from '~/entities/lib';
import { createId } from '~/shared/lib';
import { useNoteEditor } from './useNoteEditor';

export function useNoteEditingSession(noteId: MaybeRefOrGetter<string>) {
  const store = useNotesStore();
  const ready = ref(false);
  let crossTabBound = false;

  const id = computed(() => toValue(noteId));
  const isNew = computed(() => id.value === NEW_NOTE_ROUTE_ID);
  const persisted = computed(() => (isNew.value ? undefined : store.getById(id.value)));

  const missing = ref(false);
  const remoteDeleted = ref(false);
  const restoreOpen = ref(false);
  const pendingDraft = ref<NoteDraft | null>(null);
  let seenPersisted = false;

  const baseline = computed<NoteDraft>(() =>
    persisted.value ? draftFromNote(persisted.value) : createEmptyDraft(),
  );

  const editor = useNoteEditor({
    baseline: () => baseline.value,
    persistDraft: (nextDraft) => {
      if (!ready.value || missing.value) {
        return;
      }
      void store.writeDraft(id.value, cloneDraft(nextDraft));
    },
  });

  watch(persisted, (note) => {
    if (note) {
      seenPersisted = true;
      remoteDeleted.value = false;
      return;
    }

    if (seenPersisted && !isNew.value) {
      remoteDeleted.value = true;
    }
  });

  async function init(): Promise<void> {
    restoreOpen.value = false;
    pendingDraft.value = null;
    remoteDeleted.value = false;
    missing.value = false;
    seenPersisted = Boolean(persisted.value);

    if (!isNew.value && !persisted.value) {
      const orphan = await store.readDraft(id.value);
      if (orphan) {
        remoteDeleted.value = true;
        editor.replaceDraft(orphan, true);
        return;
      }

      missing.value = true;
      editor.resetSession(createEmptyDraft());
      return;
    }

    const saved = cloneDraft(baseline.value);
    editor.replaceDraft(saved, true);
    const stored = await store.readDraft(id.value);
    if (stored && !notesEqual(stored, saved)) {
      pendingDraft.value = stored;
      restoreOpen.value = true;
    }
  }

  async function bootstrap(): Promise<void> {
    await store.hydrate();
    if (!crossTabBound) {
      crossTabBound = true;
      store.listenToCrossTab();
    }
    ready.value = true;
  }

  void bootstrap();

  watch(
    [ready, id],
    ([isReady]) => {
      if (isReady) {
        void init();
      }
    },
    { immediate: true },
  );

  function restoreDraft(): void {
    if (pendingDraft.value) {
      editor.replaceDraft(pendingDraft.value, true);
    }
    restoreOpen.value = false;
    pendingDraft.value = null;
  }

  async function discardDraft(): Promise<void> {
    await store.dropDraft(id.value);
    editor.replaceDraft(baseline.value, true);
    restoreOpen.value = false;
    pendingDraft.value = null;
  }

  async function save(): Promise<{ note: Note; idChanged: boolean }> {
    const targetId = isNew.value || remoteDeleted.value ? createId() : id.value;
    const existing = remoteDeleted.value ? undefined : store.getById(targetId);
    const note = toNote(targetId, editor.draft.value, {
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });

    await store.dropDraft(id.value);
    await store.upsert(note);
    editor.resetSession(draftFromNote(note));
    remoteDeleted.value = false;
    seenPersisted = true;

    return { note, idChanged: id.value !== note.id };
  }

  async function deleteNote(): Promise<void> {
    if (isNew.value) {
      await store.dropDraft(NEW_NOTE_ROUTE_ID);
    } else {
      await store.remove(id.value);
    }
    await prepareLeave();
  }

  async function prepareLeave(): Promise<void> {
    editor.detach();
    await store.dropDraft(id.value);
  }

  return {
    ...editor,
    ready,
    isNew,
    missing,
    remoteDeleted,
    restoreOpen,
    restoreDraft,
    discardDraft,
    save,
    deleteNote,
    prepareLeave,
  };
}
