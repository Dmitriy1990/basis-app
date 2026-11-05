<script setup lang="ts">
import { useConfirm } from '~/shared/lib';
import AppButton from './AppButton.vue';
import AppModal from './AppModal.vue';

const { state, resolve } = useConfirm();
</script>

<template>
  <AppModal
    :open="state.open"
    :title="state.title"
    labelled-by="confirm-title"
    @close="resolve(false)">
    <p>{{ state.message }}</p>
    <div class="modal-actions">
      <AppButton @click="resolve(false)">{{ state.cancelLabel }}</AppButton>
      <AppButton :variant="state.danger ? 'danger' : 'primary'" @click="resolve(true)">
        {{ state.confirmLabel }}
      </AppButton>
    </div>
  </AppModal>
</template>
