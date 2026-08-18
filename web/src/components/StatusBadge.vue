<script setup lang="ts">
import type { MonitorStatus } from '@/types';
defineProps<{ status: MonitorStatus }>();
</script>
<template><span class="status-badge" :class="`status-${status.toLowerCase()}`"><span class="status-dot" />{{ status }}</span></template>
