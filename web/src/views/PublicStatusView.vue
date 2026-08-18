<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import ResponseChart from '@/components/ResponseChart.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { api } from '@/services/api';
import type { PublicStatus } from '@/types';
import { formatDuration, formatRelativeTime } from '@/utils/format';

const route = useRoute();

const status = ref<PublicStatus | null>(null);
const error = ref('');

const chartValues = computed(
  () =>
    status.value?.recentChecks
      .slice()
      .reverse()
      .map((check) => check.responseMs) ?? [],
);

async function load() {
  error.value = '';

  try {
    status.value = await api<PublicStatus>(
      `/public/status/${route.params.slug}`,
    );
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'Status page unavailable';
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <main class="public-status-page">
    <div class="public-status-shell">
      <header class="public-status-header">
        <div class="brand">
          <img
            class="brand-logo"
            src="/pulsewatch-icon.png"
            alt=""
          />
          <span>PulseWatch</span>
        </div>

        <span class="public-label">Public status</span>
      </header>

      <div
        v-if="error"
        class="public-error"
      >
        <h1>Status page unavailable</h1>
        <p>{{ error }}</p>
      </div>

      <template v-else-if="status">
        <section class="public-hero">
          <div>
            <p class="eyebrow">SERVICE STATUS</p>
            <h1>{{ status.name }}</h1>
            <p class="muted url-text">
              {{ status.url }}
            </p>
            <p class="sub-meta">
              Last checked {{ formatRelativeTime(status.lastCheckedAt) }}
            </p>
          </div>

          <StatusBadge :status="status.status" />
        </section>

        <section class="metric-grid">
          <div class="metric-card">
            <span>Current status</span>
            <strong>{{ status.status }}</strong>
            <small>
              HTTP {{ status.lastStatusCode ?? '—' }}
            </small>
          </div>

          <div class="metric-card">
            <span>24h uptime</span>
            <strong>{{ status.uptime24h }}%</strong>
            <small>{{ status.checks24h }} checks</small>
          </div>

          <div class="metric-card">
            <span>Avg response</span>
            <strong>{{ status.avgResponseMs24h }} ms</strong>
            <small>last 24 hours</small>
          </div>

          <div class="metric-card">
            <span>Last response</span>
            <strong>
              {{ status.lastResponseMs ?? '—' }}
              <template v-if="status.lastResponseMs !== null">
                ms
              </template>
            </strong>
            <small>
              {{ formatRelativeTime(status.lastCheckedAt) }}
            </small>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>Response time</h2>
              <p class="muted">Recent public measurements.</p>
            </div>
          </div>

          <ResponseChart :values="chartValues" />
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>Incident history</h2>
              <p class="muted">
                Recent downtime and recoveries.
              </p>
            </div>
          </div>

          <div
            v-if="!status.incidents.length"
            class="empty-state"
          >
            No incidents recorded.
          </div>

          <div
            v-else
            class="incident-list"
          >
            <div
              v-for="incident in status.incidents"
              :key="incident.id"
              class="incident-row"
            >
              <div>
                <strong>
                  {{
                    incident.resolvedAt
                      ? 'Resolved incident'
                      : 'Active incident'
                  }}
                </strong>

                <p>{{ incident.reason }}</p>

                <small>
                  {{ new Date(incident.startedAt).toLocaleString() }}
                  ·
                  {{
                    formatDuration(
                      incident.startedAt,
                      incident.resolvedAt,
                    )
                  }}
                </small>
              </div>

              <span
                :class="
                  incident.resolvedAt
                    ? 'pill neutral'
                    : 'pill danger'
                "
              >
                {{
                  incident.resolvedAt
                    ? 'Resolved'
                    : 'Active'
                }}
              </span>
            </div>
          </div>
        </section>

        <footer class="public-footer">
          <span
            class="footer-dot"
            aria-hidden="true"
          />
          Monitored by PulseWatch
        </footer>
      </template>
    </div>
  </main>
</template>
