<script setup lang="ts">
import { NoteCard } from '~/entities';
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div class="">
        <h1 class="h1">Мои заметки</h1>
      </div>
      <NuxtLink class="btn btn--primary" to="/notes/new">Создать заметку</NuxtLink>
    </header>

    <section class="sheet">
      <NuxtLink class="btn btn--primary" to="/notes/new">Добавить заметку</NuxtLink>
    </section>

    <section class="notes-grid" aria-label="Список заметок">
      <NoteCard />
    </section>
  </main>
</template>
