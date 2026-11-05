<script setup lang="ts">
import { NoteCard, displayTitle, useNotesStore } from '~/entities';
import { useConfirm } from '~/shared/lib';

const router = useRouter();
const store = useNotesStore();
const { confirm } = useConfirm();

store.listenToCrossTab();
void store.hydrate();

async function removeNote(id: string, title: string): Promise<void> {
  const ok = await confirm({
    title: 'Удалить заметку?',
    message: `«${displayTitle(title)}» будет удалена безвозвратно.`,
    confirmLabel: 'Удалить',
    danger: true,
  });

  if (ok) {
    await store.remove(id);
  }
}
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div class="header-copy">
        <h1 class="h1">Заметки</h1>
      </div>
      <NuxtLink class="btn btn--primary" to="/notes/new">Создать заметку</NuxtLink>
    </header>

    <section v-if="store.sortedNotes.length === 0" class="sheet empty-state">
      <h2>У вас пока нет заметок</h2>
      <NuxtLink class="btn btn--primary" to="/notes/new">Создать заметку</NuxtLink>
    </section>

    <section v-else class="notes-grid" aria-label="Список заметок">
      <NoteCard
        v-for="note in store.sortedNotes"
        :key="note.id"
        :note="note"
        @edit="router.push(`/notes/${note.id}`)"
        @remove="removeNote(note.id, note.title)" />
    </section>
  </main>
</template>
