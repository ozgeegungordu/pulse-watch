<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ToastHost from '@/components/ToastHost.vue';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  void router.push('/login');
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink
        class="brand"
        to="/dashboard"
      >
        <img
          class="brand-logo"
          src="/pulsewatch-icon.png"
          alt=""
        />
        <span>PulseWatch</span>
      </RouterLink>

      <nav aria-label="Primary navigation">
        <RouterLink to="/dashboard">
          Dashboard
        </RouterLink>

        <RouterLink to="/monitors">
          Monitors
        </RouterLink>

        <RouterLink to="/notifications">
          Notifications
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-caption">
          Signed in as
        </div>

        <div class="user-email">
          {{ auth.user?.email }}
        </div>

        <button
          type="button"
          class="text-button"
          @click="logout"
        >
          Sign out
        </button>
      </div>
    </aside>

    <main class="main-content">
      <slot />
    </main>

    <ToastHost />
  </div>
</template>
