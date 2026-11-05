<script setup lang="ts">
import type { TodoItem } from '../../model';
import { PREVIEW_TODO_LIMIT } from '../../lib';

const props = defineProps<{
  todos: TodoItem[];
}>();

const visible = computed(() => props.todos.slice(0, PREVIEW_TODO_LIMIT));
const rest = computed(() => Math.max(0, props.todos.length - PREVIEW_TODO_LIMIT));
</script>

<template>
  <div>
    <p v-if="todos.length === 0" class="todo-preview__more">Пока нет пунктов</p>
    <ul v-else class="todo-preview">
      <li
        v-for="todo in visible"
        :key="todo.id"
        class="todo-preview__item"
        :class="{ 'is-done': todo.done }">
        <span class="fake-check" :class="{ 'is-done': todo.done }" aria-hidden="true" />
        <span>{{ todo.text.trim() || 'Пустой пункт' }}</span>
      </li>
    </ul>
    <p v-if="rest > 0" class="todo-preview__more">ещё {{ rest }}</p>
  </div>
</template>
