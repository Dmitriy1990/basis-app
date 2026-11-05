<script setup lang="ts">
import type { Note } from '../../model';
import { displayTitle } from '../../lib';
import { AppButton } from '~/shared/ui';
import TodoListPreview from './TodoListPreview.vue';

defineProps<{
  note: Note;
}>();

const emit = defineEmits<{
  edit: [];
  remove: [];
}>();
</script>

<template>
  <article class="note-card">
    <div class="note-card__body">
      <h2>
        <NuxtLink class="note-card__title" :to="`/notes/${note.id}`">{{
          displayTitle(note.title)
        }}</NuxtLink>
      </h2>
      <TodoListPreview :todos="note.todos" />
    </div>
    <div class="note-card__actions">
      <AppButton @click="emit('edit')">Изменить</AppButton>
      <AppButton variant="danger" @click="emit('remove')">Удалить</AppButton>
    </div>
  </article>
</template>
