<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
import type { NotificationChannel, NotificationStatus } from '@/types';

const channels = ref<NotificationChannel[]>([]);
const status = ref<NotificationStatus | null>(null);
const error = ref('');
const busyId = ref<string | null>(null);
const creating = ref(false);
const toast = useToast();
const form = reactive({ name: '', type: 'EMAIL' as NotificationChannel['type'], destination: '' });

async function load() {
  error.value = '';
  try {
    [channels.value, status.value] = await Promise.all([
      api<NotificationChannel[]>('/notifications'),
      api<NotificationStatus>('/notifications/status'),
    ]);
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load notifications'; }
}

async function create() {
  creating.value = true; error.value = '';
  try {
    await api('/notifications', { method: 'POST', body: JSON.stringify(form) });
    Object.assign(form, { name: '', type: 'EMAIL', destination: '' });
    toast.success('Notification channel added');
    await load();
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to create channel'; }
  finally { creating.value = false; }
}

async function testChannel(channel: NotificationChannel) {
  busyId.value = channel.id; error.value = '';
  try { await api(`/notifications/${channel.id}/test`, { method: 'POST' }); toast.success('Test notification sent'); }
  catch (e) { error.value = e instanceof Error ? e.message : 'Test failed'; }
  finally { busyId.value = null; }
}

async function toggle(channel: NotificationChannel) {
  busyId.value = channel.id;
  try { await api(`/notifications/${channel.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !channel.enabled }) }); toast.success(channel.enabled ? 'Channel disabled' : 'Channel enabled'); await load(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  finally { busyId.value = null; }
}

async function remove(channel: NotificationChannel) {
  if (!confirm(`Delete ${channel.name}?`)) return;
  busyId.value = channel.id;
  try { await api(`/notifications/${channel.id}`, { method: 'DELETE' }); toast.success('Notification channel deleted'); await load(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
  finally { busyId.value = null; }
}

onMounted(() => void load());
</script>

<template><AppShell>
  <header class="page-header"><div><p class="eyebrow">ALERTS</p><h1>Notifications</h1><p class="muted">Get notified when a monitor goes down or recovers.</p></div></header>
  <div v-if="error" class="alert error">{{ error }}</div>

  <section class="notification-readiness" :class="status?.emailConfigured ? 'ready' : 'warning'">
    <div><strong>{{ status?.emailConfigured ? 'Email delivery is ready' : 'Email delivery needs SMTP setup' }}</strong>
      <p v-if="status?.emailConfigured">Using {{ status.smtpHost }}<template v-if="status.smtpFrom"> · {{ status.smtpFrom }}</template></p>
      <p v-else>Add SMTP credentials to your environment configuration, restart the API, then use Test on an email channel.</p>
    </div>
    <span class="readiness-dot" />
  </section>

  <div class="detail-grid">
    <section class="panel">
      <div class="panel-heading"><div><h2>Add channel</h2><p class="muted">Email is the recommended default whenever SMTP is configured.</p></div></div>
      <form @submit.prevent="create">
        <label>Name<input v-model="form.name" required maxlength="80" placeholder="My alerts" /></label>
        <label>Type<select v-model="form.type"><option value="EMAIL">Email</option><option value="SLACK_WEBHOOK">Slack webhook</option><option value="DISCORD_WEBHOOK">Discord webhook</option></select></label>
        <label>{{ form.type === 'EMAIL' ? 'Email address' : 'HTTPS webhook URL' }}<input v-model="form.destination" required :placeholder="form.type === 'EMAIL' ? 'you@example.com' : 'https://…'" /></label>
        <button class="primary" :disabled="creating">{{ creating ? 'Adding…' : 'Add channel' }}</button>
      </form>
      <div v-if="form.type === 'EMAIL'" class="setup-note">
        <strong>Gmail example</strong>
        <code>SMTP_HOST=smtp.gmail.com<br>SMTP_PORT=587<br>SMTP_SECURE=false<br>SMTP_USER=you@gmail.com<br>SMTP_PASS=app-password<br>SMTP_FROM=PulseWatch &lt;you@gmail.com&gt;</code>
        <p>Use an app password, never your normal account password. Keep SMTP credentials and environment files out of Git.</p>
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading"><div><h2>Channels</h2><p class="muted">Tests send immediately; state alerts send on DOWN and recovery.</p></div></div>
      <div v-if="!channels.length" class="empty-state">No notification channels.</div>
      <div v-else class="channel-list">
        <div v-for="channel in channels" :key="channel.id" class="channel-row">
          <div><div class="channel-title"><strong>{{ channel.name }}</strong><span :class="channel.enabled ? 'pill success' : 'pill neutral'">{{ channel.enabled ? 'Enabled' : 'Disabled' }}</span></div><p>{{ channel.type }} · {{ channel.destination }}</p></div>
          <div class="row-actions"><button type="button" class="secondary" :disabled="busyId === channel.id || (!status?.emailConfigured && channel.type === 'EMAIL')" @click="testChannel(channel)">Test</button><button type="button" class="secondary" :disabled="busyId === channel.id" @click="toggle(channel)">{{ channel.enabled ? 'Disable' : 'Enable' }}</button><button type="button" class="danger-ghost" :disabled="busyId === channel.id" @click="remove(channel)">Delete</button></div>
        </div>
      </div>
    </section>
  </div>
</AppShell></template>
