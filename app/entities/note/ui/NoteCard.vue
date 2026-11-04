<script setup lang="ts">
import { AppButton } from '~/shared/ui';
import TodoListPreview from './TodoListPreview.vue';
</script>

<template>
  <article class="note-card">
    <div class="note-card__body">
      <h2>
        <NuxtLink class="note-card__title" :to="`/`">To card</NuxtLink>
      </h2>
      <TodoListPreview />
    </div>
    <div class="note-card__actions">
      <AppButton>Изменить</AppButton>
      <AppButton variant="danger">Удалить</AppButton>
    </div>
  </article>
</template>
