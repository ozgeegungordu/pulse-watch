<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
import type { Monitor, MonitorStatus } from '@/types';
import { formatRelativeTime } from '@/utils/format';

const monitors = ref<Monitor[]>([]);
const loading = ref(false);
const error = ref('');
const showForm = ref(false);
const query = ref('');
const statusFilter = ref<'ALL' | MonitorStatus>('ALL');
const busyId = ref<string | null>(null);
const toast = useToast();

const form = reactive({
  name: '', url: '', method: 'GET', expectedStatus: 200,
  timeoutMs: 5000, intervalSec: 60, failureThreshold: 3,
});

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return monitors.value.filter((monitor) => {
    const matchesStatus = statusFilter.value === 'ALL' || monitor.status === statusFilter.value;
    const matchesQuery = !needle || `${monitor.name} ${monitor.url}`.toLowerCase().includes(needle);
    return matchesStatus && matchesQuery;
  });
});

async function load() {
  loading.value = true;
  error.value = '';
  try { monitors.value = await api<Monitor[]>('/monitors'); }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load monitors'; }
  finally { loading.value = false; }
}

async function createMonitor() {
  error.value = '';
  try {
    await api('/monitors', { method: 'POST', body: JSON.stringify(form) });
    Object.assign(form, { name: '', url: '', method: 'GET', expectedStatus: 200, timeoutMs: 5000, intervalSec: 60, failureThreshold: 3 });
    showForm.value = false;
    toast.success('Monitor created');
    await load();
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to create monitor'; }
}

async function checkNow(monitor: Monitor) {
  busyId.value = monitor.id;
  try { await api(`/monitors/${monitor.id}/check`, { method: 'POST' }); toast.success(`${monitor.name} checked`); await load(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Check failed'); }
  finally { busyId.value = null; }
}

async function togglePause(monitor: Monitor) {
  busyId.value = monitor.id;
  try {
    const action = monitor.status === 'PAUSED' ? 'resume' : 'pause';
    await api(`/monitors/${monitor.id}/${action}`, { method: 'POST' });
    toast.success(monitor.status === 'PAUSED' ? 'Monitor resumed' : 'Monitor paused');
    await load();
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
  finally { busyId.value = null; }
}

async function removeMonitor(monitor: Monitor) {
  if (!confirm(`Delete ${monitor.name}? Its check and incident history will also be deleted.`)) return;
  busyId.value = monitor.id;
  try { await api(`/monitors/${monitor.id}`, { method: 'DELETE' }); toast.success('Monitor deleted'); await load(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
  finally { busyId.value = null; }
}

onMounted(() => void load());
</script>

<template><AppShell>
  <header class="page-header">
    <div><p class="eyebrow">ENDPOINTS</p><h1>Monitors</h1><p class="muted">Track public HTTP and HTTPS endpoints.</p></div>
    <button type="button" class="primary" @click="showForm = !showForm">{{ showForm ? 'Close' : 'Add monitor' }}</button>
  </header>

  <div v-if="error" class="alert error">{{ error }}</div>

  <section v-if="showForm" class="panel form-panel">
    <div class="panel-heading"><div><h2>New monitor</h2><p class="muted">Private, loopback and local network addresses are blocked.</p></div></div>
    <form class="monitor-form" @submit.prevent="createMonitor">
      <label class="span-2">Name<input v-model="form.name" required maxlength="100" placeholder="Production API" /></label>
      <label class="span-2">URL<input v-model="form.url" required placeholder="https://api.example.com/health" /></label>
      <label>Method<select v-model="form.method"><option>GET</option><option>HEAD</option></select></label>
      <label>Expected status<input v-model.number="form.expectedStatus" type="number" min="100" max="599" /></label>
      <label>Interval (sec)<input v-model.number="form.intervalSec" type="number" min="30" max="86400" /></label>
      <label>Timeout (ms)<input v-model.number="form.timeoutMs" type="number" min="500" max="30000" /></label>
      <label>Failures before DOWN<input v-model.number="form.failureThreshold" type="number" min="1" max="10" /></label>
      <div class="form-actions span-2"><button class="primary">Create monitor</button></div>
    </form>
  </section>

  <section class="panel monitor-table-panel">
    <div class="toolbar">
      <input v-model="query" class="search-input" type="search" aria-label="Search monitors" placeholder="Search monitors…" />
      <select v-model="statusFilter" class="filter-select" aria-label="Filter monitors by status">
        <option value="ALL">All statuses</option>
        <option value="UP">Up</option><option value="DOWN">Down</option><option value="PENDING">Pending</option><option value="PAUSED">Paused</option>
      </select>
      <button type="button" class="secondary" :disabled="loading" @click="load">{{ loading ? 'Refreshing…' : 'Refresh' }}</button>
    </div>

    <div v-if="loading" class="empty-state"><span class="spinner" aria-hidden="true" />Loading monitors…</div>
    <div v-else-if="!monitors.length" class="empty-state"><strong>No monitors yet.</strong><span>Add your first health endpoint to start collecting data.</span></div>
    <div v-else-if="!filtered.length" class="empty-state"><strong>No matches.</strong><span>Try a different search or status filter.</span></div>
    <div v-else class="monitor-list">
      <article v-for="monitor in filtered" :key="monitor.id" class="monitor-row" :class="`monitor-row-${monitor.status.toLowerCase()}`">
        <RouterLink class="monitor-main" :to="`/monitors/${monitor.id}`">
          <div><strong>{{ monitor.name }}</strong><p>{{ monitor.url }}</p><small>Checked {{ formatRelativeTime(monitor.lastCheckedAt) }}</small></div>
          <StatusBadge :status="monitor.status" />
        </RouterLink>
        <div class="monitor-stat"><span>Response</span><strong>{{ monitor.lastResponseMs ?? '—' }}<small v-if="monitor.lastResponseMs !== null"> ms</small></strong></div>
        <div class="monitor-stat"><span>HTTP</span><strong>{{ monitor.lastStatusCode ?? '—' }}</strong></div>
        <div class="row-actions">
          <button type="button" class="secondary" :disabled="busyId === monitor.id" @click="checkNow(monitor)">Check now</button>
          <button type="button" class="secondary" :disabled="busyId === monitor.id" @click="togglePause(monitor)">{{ monitor.status === 'PAUSED' ? 'Resume' : 'Pause' }}</button>
          <button type="button" class="danger-ghost" :disabled="busyId === monitor.id" @click="removeMonitor(monitor)">Delete</button>
        </div>
      </article>
    </div>
  </section>
</AppShell></template>
