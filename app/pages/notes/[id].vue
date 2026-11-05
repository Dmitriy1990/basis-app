<script setup lang="ts">
import { NoteEditor } from '~/widgets';

const route = useRoute();
const noteId = computed(() => String(route.params.id ?? ''));
</script>

<template>
  <NoteEditor :note-id="noteId" />
</template>
