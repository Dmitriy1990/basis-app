<script setup lang="ts">
import type { TodoItem } from '../../model';

defineProps<{
  todo: TodoItem;
}>();

const emit = defineEmits<{
  toggle: [];
  'update-text': [value: string];
  commit: [];
  remove: [];
}>();
</script>

<template>
  <div class="todo-row" :data-todo-id="todo.id">
    <input
      class="check"
      type="checkbox"
      :checked="todo.done"
      :aria-label="`Выполнено: ${todo.text || 'без текста'}`"
      @change="emit('toggle')" />
    <input
      class="todo-row__text"
      :class="{ 'is-done': todo.done }"
      :value="todo.text"
      type="text"
      maxlength="240"
      placeholder="Текст пункта"
      aria-label="Текст пункта"
      @input="emit('update-text', ($event.target as HTMLInputElement).value)"
      @blur="emit('commit')" />
    <button class="icon-btn" type="button" aria-label="Удалить пункт" @click="emit('remove')">
      ×
    </button>
  </div>
</template>
