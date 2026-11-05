import { useNotesStore } from '~/entities/model';

export default defineNuxtPlugin(async () => {
  const store = useNotesStore();
  await store.hydrate();
  store.listenToCrossTab();
});
