<script setup lang="ts">
import { useFocusTrap } from '~/shared/lib';

const props = defineProps<{
  open: boolean;
  title: string;
  labelledBy?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const generatedId = useId();
const titleId = computed(() => props.labelledBy ?? generatedId);
const isOpen = computed(() => props.open);

useFocusTrap(dialogRef, isOpen);

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
  }
}

watch(
  () => props.open,
  (open) => {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      document.addEventListener('keydown', onKeydown);
    } else {
      document.removeEventListener('keydown', onKeydown);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-root">
      <div class="modal-backdrop" @click="emit('close')" />
      <div
        ref="dialogRef"
        class="modal-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1">
        <h2 :id="titleId">{{ title }}</h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
