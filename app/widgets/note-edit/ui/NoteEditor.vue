<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { TodoItemEditor, displayTitle } from '~/entities';
import { useEditorShortcuts, useNoteEditingSession } from '~/features/note-editing';
import { useConfirm } from '~/shared/lib';
import { AppButton, AppModal } from '~/shared/ui';

const props = defineProps<{
  noteId: string;
}>();

const router = useRouter();
const { confirm } = useConfirm();

const {
  draft,
  dirty,
  canUndo,
  canRedo,
  ready,
  isNew,
  missing,
  remoteDeleted,
  restoreOpen,
  setTitle,
  commitTitle,
  setTodoText,
  commitTodoText,
  toggleTodo,
  addTodo: pushTodo,
  removeTodo,
  undo,
  redo,
  restoreDraft,
  discardDraft,
  save,
  deleteNote,
  prepareLeave,
} = useNoteEditingSession(() => props.noteId);

useEditorShortcuts({ undo, redo });

const skipLeaveConfirm = ref(false);

async function onSave(): Promise<void> {
  const { note, idChanged } = await save();
  if (idChanged) {
    skipLeaveConfirm.value = true;
    await router.replace(`/notes/${note.id}`);
  }
}

async function onCancel(): Promise<void> {
  if (dirty.value) {
    const ok = await confirm({
      title: 'Отменить редактирование?',
      message: 'Несохранённые изменения будут потеряны.',
      confirmLabel: 'Отменить изменения',
      danger: true,
    });
    if (!ok) {
      return;
    }
  }

  await prepareLeave();
  skipLeaveConfirm.value = true;
  await router.push('/');
}

async function onRemove(): Promise<void> {
  const ok = await confirm({
    title: 'Удалить заметку?',
    message: `«${displayTitle(draft.value.title)}» будет удалена безвозвратно.`,
    confirmLabel: 'Удалить',
    danger: true,
  });

  if (!ok) {
    return;
  }

  await deleteNote();
  skipLeaveConfirm.value = true;
  await router.push('/');
}

async function onAddTodo(): Promise<void> {
  const id = pushTodo();
  await nextTick();
  const row = document.querySelector<HTMLElement>(`[data-todo-id="${id}"]`);
  row?.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
}

onBeforeRouteLeave(async () => {
  if (skipLeaveConfirm.value) {
    skipLeaveConfirm.value = false;
    return true;
  }

  if (!ready.value) {
    return true;
  }

  if (missing.value) {
    await prepareLeave();
    return true;
  }

  if (dirty.value) {
    const ok = await confirm({
      title: 'Отменить редактирование?',
      message: 'Несохранённые изменения будут потеряны.',
      confirmLabel: 'Отменить изменения',
      danger: true,
    });
    if (!ok) {
      return false;
    }
  }

  await prepareLeave();
  return true;
});
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div class="header-copy">
        <h1>{{ isNew ? 'Новая заметка' : 'Редактирование' }}</h1>
        <p class="kbd-hint">
          Ctrl+Z и Shift+Ctrl+Z — история правки. В текстовом поле работает обычная отмена ввода.
        </p>
      </div>
      <NuxtLink class="btn btn--ghost" to="/">Все заметки</NuxtLink>
    </header>

    <section v-if="missing" class="sheet missing-state">
      <h2>Заметка не найдена</h2>
      <p>По этой ссылке нет сохранённой заметки. Возможно, её удалили или адрес указан неверно.</p>
      <NuxtLink class="btn btn--primary" to="/">На главную</NuxtLink>
    </section>

    <section v-else class="editor">
      <p v-if="remoteDeleted" class="status-banner" role="status">
        Эта заметка удалена в другом окне. Можно сохранить копию или закрыть редактор.
      </p>

      <div class="editor-toolbar">
        <div class="editor-toolbar__group">
          <AppButton variant="primary" @click="onSave">Сохранить</AppButton>
          <AppButton @click="onCancel">Отменить редактирование</AppButton>
          <AppButton variant="danger" @click="onRemove">Удалить</AppButton>
        </div>
        <div class="editor-toolbar__group">
          <AppButton :disabled="!canUndo" @click="undo">Отменить изменение</AppButton>
          <AppButton :disabled="!canRedo" @click="redo">Повторить изменение</AppButton>
        </div>
      </div>

      <div class="sheet editor-sheet">
        <label class="sr-only" for="note-title">Название заметки</label>
        <input
          id="note-title"
          class="title-input"
          :value="draft.title"
          type="text"
          maxlength="160"
          placeholder="Без названия"
          @input="setTitle(($event.target as HTMLInputElement).value)"
          @blur="commitTitle" />
        <p class="field-hint">
          Пустое название сохранится как «Без названия». Пустые пункты при сохранении отбрасываются.
        </p>

        <div class="todo-editor" role="list" aria-label="Список задач">
          <TodoItemEditor
            v-for="todo in draft.todos"
            :key="todo.id"
            :todo="todo"
            role="listitem"
            @toggle="toggleTodo(todo.id)"
            @update-text="setTodoText(todo.id, $event)"
            @commit="commitTodoText"
            @remove="removeTodo(todo.id)" />
        </div>

        <div class="todo-editor__add">
          <AppButton variant="primary" @click="onAddTodo">Добавить пункт</AppButton>
        </div>
      </div>
    </section>

    <AppModal :open="restoreOpen" title="Восстановить черновик?" @close="discardDraft">
      <p>
        Есть несохранённые правки с прошлого сеанса. Восстановить их или продолжить с последней
        сохранённой версии?
      </p>
      <div class="modal-actions">
        <AppButton @click="discardDraft">Отказаться</AppButton>
        <AppButton variant="primary" @click="restoreDraft">Восстановить</AppButton>
      </div>
    </AppModal>
  </main>
</template>
