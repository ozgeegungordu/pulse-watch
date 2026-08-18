<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import ResponseChart from '@/components/ResponseChart.vue';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
import type { MonitorDetail, MonitorStats } from '@/types';
import { formatDuration, formatRelativeTime } from '@/utils/format';

const route = useRoute();
const monitor = ref<MonitorDetail | null>(null);
const stats = ref<MonitorStats | null>(null);
const error = ref('');
const checking = ref(false);
const saving = ref(false);
const editing = ref(false);
const publicBusy = ref(false);
const toast = useToast();

const editForm = reactive({
  name: '', url: '', method: 'GET', expectedStatus: 200,
  timeoutMs: 5000, intervalSec: 60, failureThreshold: 3,
});

const chartValues = computed(() => monitor.value?.checks.slice(0, 60).reverse().map((check) => check.responseMs) ?? []);
const publicUrl = computed(() => monitor.value?.publicEnabled && monitor.value.publicSlug
  ? `${window.location.origin}/status/${monitor.value.publicSlug}`
  : '');

function syncEditForm() {
  if (!monitor.value) return;
  Object.assign(editForm, {
    name: monitor.value.name,
    url: monitor.value.url,
    method: monitor.value.method,
    expectedStatus: monitor.value.expectedStatus,
    timeoutMs: monitor.value.timeoutMs,
    intervalSec: monitor.value.intervalSec,
    failureThreshold: monitor.value.failureThreshold,
  });
}

async function load() {
  error.value = '';
  try {
    const id = String(route.params.id);
    [monitor.value, stats.value] = await Promise.all([
      api<MonitorDetail>(`/monitors/${id}`),
      api<MonitorStats>(`/monitors/${id}/stats`),
    ]);
    syncEditForm();
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load monitor'; }
}

async function check() {
  checking.value = true;
  try { await api(`/monitors/${route.params.id}/check`, { method: 'POST' }); toast.success('Check completed'); await load(); }
  catch (e) { error.value = e instanceof Error ? e.message : 'Check failed'; }
  finally { checking.value = false; }
}

async function save() {
  saving.value = true; error.value = '';
  try {
    await api(`/monitors/${route.params.id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
    editing.value = false;
    toast.success('Monitor settings saved');
    await load();
  } catch (e) { error.value = e instanceof Error ? e.message : 'Could not save'; }
  finally { saving.value = false; }
}

async function togglePublic() {
  if (!monitor.value) return;
  publicBusy.value = true;
  try {
    await api(`/monitors/${monitor.value.id}/public-status`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !monitor.value.publicEnabled }),
    });
    toast.success(monitor.value.publicEnabled ? 'Public status page disabled' : 'Public status page enabled');
    await load();
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update public status page'); }
  finally { publicBusy.value = false; }
}

async function copyPublicUrl() {
  if (!publicUrl.value) return;
  await navigator.clipboard.writeText(publicUrl.value);
  toast.success('Public status URL copied');
}

onMounted(() => void load());
</script>

<template><AppShell>
  <div v-if="error" class="alert error">{{ error }}</div>
  <template v-if="monitor">
    <header class="page-header">
      <div>
        <RouterLink class="back-link" to="/monitors">← Monitors</RouterLink>
        <h1>{{ monitor.name }}</h1>
        <p class="muted url-text">{{ monitor.url }}</p>
        <p class="sub-meta">Last checked {{ formatRelativeTime(monitor.lastCheckedAt) }}</p>
      </div>
      <div class="header-actions">
        <StatusBadge :status="monitor.status" />
        <button type="button" class="secondary" @click="editing = !editing">{{ editing ? 'Close settings' : 'Edit settings' }}</button>
        <button type="button" class="primary" :disabled="checking" @click="check">{{ checking ? 'Checking…' : 'Check now' }}</button>
      </div>
    </header>

    <section v-if="editing" class="panel form-panel">
      <div class="panel-heading"><div><h2>Monitor settings</h2><p class="muted">Changing the URL resets the monitor to PENDING until its next check.</p></div></div>
      <form class="monitor-form" @submit.prevent="save">
        <label class="span-2">Name<input v-model="editForm.name" required maxlength="100" /></label>
        <label class="span-2">URL<input v-model="editForm.url" required /></label>
        <label>Method<select v-model="editForm.method"><option>GET</option><option>HEAD</option></select></label>
        <label>Expected status<input v-model.number="editForm.expectedStatus" type="number" min="100" max="599" /></label>
        <label>Interval (sec)<input v-model.number="editForm.intervalSec" type="number" min="30" max="86400" /></label>
        <label>Timeout (ms)<input v-model.number="editForm.timeoutMs" type="number" min="500" max="30000" /></label>
        <label>Failures before DOWN<input v-model.number="editForm.failureThreshold" type="number" min="1" max="10" /></label>
        <div class="form-actions span-2"><button class="primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save changes' }}</button></div>
      </form>
    </section>

    <section class="metric-grid">
      <div class="metric-card"><span>24h uptime</span><strong>{{ stats?.last24h.uptimePct ?? 100 }}%</strong><small>{{ stats?.last24h.checks ?? 0 }} checks</small></div>
      <div class="metric-card"><span>7d uptime</span><strong>{{ stats?.last7d.uptimePct ?? 100 }}%</strong><small>{{ stats?.last7d.checks ?? 0 }} checks</small></div>
      <div class="metric-card"><span>Avg response</span><strong>{{ stats?.last24h.avgResponseMs ?? 0 }} ms</strong><small>p95 {{ stats?.last24h.p95ResponseMs ?? 0 }} ms</small></div>
      <div class="metric-card"><span>Last response</span><strong>{{ monitor.lastResponseMs ?? '—' }}<template v-if="monitor.lastResponseMs !== null"> ms</template></strong><small>HTTP {{ monitor.lastStatusCode ?? '—' }}</small></div>
    </section>

    <section class="panel public-panel">
      <div>
        <p class="eyebrow">SHARE</p>
        <h2>Public status page</h2>
        <p class="muted">Create a read-only status page you can share without exposing your account.</p>
        <div v-if="publicUrl" class="public-url-row"><code>{{ publicUrl }}</code><button type="button" class="secondary" @click="copyPublicUrl">Copy URL</button><a class="secondary button-link" :href="publicUrl" target="_blank" rel="noreferrer">Open</a></div>
      </div>
      <button type="button" class="secondary" :disabled="publicBusy" @click="togglePublic">{{ monitor.publicEnabled ? 'Disable public page' : 'Enable public page' }}</button>
    </section>

    <section class="panel">
      <div class="panel-heading"><div><h2>Response time</h2><p class="muted">Most recent checks, oldest to newest.</p></div></div>
      <ResponseChart :values="chartValues" />
    </section>

    <div class="detail-grid">
      <section class="panel">
        <div class="panel-heading"><h2>Recent checks</h2></div>
        <div v-if="!monitor.checks.length" class="empty-state">No checks yet.</div>
        <div v-else class="checks-list">
          <div v-for="checkItem in monitor.checks.slice(0, 30)" :key="checkItem.id" class="check-row">
            <span :class="checkItem.successful ? 'check-ok' : 'check-fail'">{{ checkItem.successful ? 'OK' : 'FAIL' }}</span>
            <span>HTTP {{ checkItem.statusCode ?? '—' }}</span>
            <strong>{{ checkItem.responseMs }} ms</strong>
            <time>{{ new Date(checkItem.checkedAt).toLocaleString() }}</time>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading"><h2>Incidents</h2></div>
        <div v-if="!monitor.incidents.length" class="empty-state">No incidents.</div>
        <div v-else class="incident-list">
          <div v-for="incident in monitor.incidents" :key="incident.id" class="incident-row">
            <div><strong>{{ incident.resolvedAt ? 'Resolved' : 'Active incident' }}</strong><p>{{ incident.reason }}</p><small>{{ new Date(incident.startedAt).toLocaleString() }} · {{ formatDuration(incident.startedAt, incident.resolvedAt) }}</small></div>
            <span :class="incident.resolvedAt ? 'pill neutral' : 'pill danger'">{{ incident.resolvedAt ? 'Resolved' : 'Down' }}</span>
          </div>
        </div>
      </section>
    </div>
  </template>
</AppShell></template>
