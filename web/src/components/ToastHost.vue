<script setup lang="ts">
import { useToast } from '@/composables/useToast';
const toast = useToast();
</script>
<template>
  <div class="toast-stack" aria-live="polite">
    <button v-for="item in toast.items" :key="item.id" class="toast" :class="`toast-${item.kind}`" @click="toast.dismiss(item.id)">
      <span class="toast-dot" />
      <span>{{ item.message }}</span>
    </button>
  </div>
</template>
