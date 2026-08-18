<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api } from '@/services/api';
import type { DashboardSummary } from '@/types';
import { formatDuration } from '@/utils/format';

const summary = ref<DashboardSummary | null>(null);
const error = ref('');
const loading = ref(false);
const updatedAt = ref<Date | null>(null);

async function load() {
  loading.value = true; error.value = '';
  try { summary.value = await api<DashboardSummary>('/dashboard/summary'); updatedAt.value = new Date(); }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load dashboard'; }
  finally { loading.value = false; }
}

onMounted(() => void load());
</script>

<template><AppShell>
  <header class="page-header">
    <div><p class="eyebrow">OVERVIEW</p><h1>Dashboard</h1><p class="muted">Your API health at a glance.</p><p v-if="updatedAt" class="sub-meta">Updated {{ updatedAt.toLocaleTimeString() }}</p></div>
    <div class="header-actions"><button type="button" class="secondary" :disabled="loading" @click="load">{{ loading ? 'Refreshing…' : 'Refresh' }}</button><RouterLink class="primary button-link" to="/monitors">Manage monitors</RouterLink></div>
  </header>
  <div v-if="error" class="alert error">{{ error }}</div>
  <template v-if="summary">
    <section class="health-banner" :class="summary.down ? 'has-down' : 'healthy'">
      <div><span class="health-indicator" /><div><strong>{{ summary.down ? `${summary.down} monitor${summary.down === 1 ? '' : 's'} down` : 'All monitored services are operational' }}</strong><p>{{ summary.paused }} paused · {{ summary.pending }} pending · {{ summary.activeIncidents }} active incidents</p></div></div>
      <RouterLink class="banner-link" to="/monitors">View monitors <span aria-hidden="true">→</span></RouterLink>
    </section>

    <section class="metric-grid">
      <div class="metric-card"><span>Monitors</span><strong>{{ summary.total }}</strong><small>{{ summary.operational }} operational</small></div>
      <div class="metric-card"><span>24h uptime</span><strong>{{ summary.uptimePct }}%</strong><small>{{ summary.checks24h }} checks</small></div>
      <div class="metric-card"><span>Avg response</span><strong>{{ summary.avgResponseMs }} ms</strong><small>last 24 hours</small></div>
      <div class="metric-card"><span>Active incidents</span><strong>{{ summary.activeIncidents }}</strong><small>{{ summary.down }} monitors down</small></div>
    </section>

    <section class="panel">
      <div class="panel-heading"><div><h2>Recent incidents</h2><p class="muted">Latest downtime and recovery events.</p></div></div>
      <div v-if="!summary.recentIncidents.length" class="empty-state"><span class="empty-icon" aria-hidden="true">✓</span><strong>No incidents yet.</strong><span>Everything looks quiet.</span></div>
      <div v-else class="incident-list">
        <div v-for="incident in summary.recentIncidents" :key="incident.id" class="incident-row">
          <div><strong>{{ incident.monitor?.name }}</strong><p>{{ incident.reason || 'Endpoint unavailable' }}</p><small>{{ new Date(incident.startedAt).toLocaleString() }} · {{ formatDuration(incident.startedAt, incident.resolvedAt) }}</small></div>
          <span :class="incident.resolvedAt ? 'pill neutral' : 'pill danger'">{{ incident.resolvedAt ? 'Resolved' : 'Active' }}</span>
        </div>
      </div>
    </section>
  </template>
</AppShell></template>
