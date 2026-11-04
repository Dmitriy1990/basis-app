<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'danger';
    type?: 'button' | 'submit';
    disabled?: boolean;
  }>(),
  {
    variant: 'ghost',
    type: 'button',
    disabled: false,
  },
);
</script>

<template>
  <button :type="type" class="btn" :class="`btn--${variant}`" :disabled="disabled">
    <slot />
  </button>
</template>
