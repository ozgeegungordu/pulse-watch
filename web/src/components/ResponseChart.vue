<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ values: number[] }>();
const points = computed(() => {
  if (!props.values.length) return '';
  const max = Math.max(...props.values, 1);
  const min = Math.min(...props.values, 0);
  const span = Math.max(1, max - min);
  return props.values.map((value, index) => {
    const x = props.values.length === 1 ? 50 : (index / (props.values.length - 1)) * 100;
    const y = 44 - ((value - min) / span) * 36;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
});
</script>
<template>
  <div class="chart-wrap">
    <svg v-if="values.length" viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label="Response time chart">
      <line x1="0" y1="44" x2="100" y2="44" class="chart-grid" />
      <line x1="0" y1="26" x2="100" y2="26" class="chart-grid" />
      <line x1="0" y1="8" x2="100" y2="8" class="chart-grid" />
      <polyline :points="points" class="chart-line" />
    </svg>
    <div v-else class="empty-chart">No checks yet</div>
  </div>
</template>
