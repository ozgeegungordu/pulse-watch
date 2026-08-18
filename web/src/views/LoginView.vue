<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');

async function submit() {
  error.value = '';

  try {
    await auth.login(email.value, password.value);
    await router.push('/dashboard');
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'Could not sign in';
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <img
          class="brand-logo"
          src="/pulsewatch-icon.png"
          alt=""
        />
        <strong>PulseWatch</strong>
      </div>

      <h1>Welcome back</h1>
      <p class="muted">Sign in to monitor your APIs.</p>

      <form @submit.prevent="submit">
        <label>
          Email
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            autocomplete="current-password"
          />
        </label>

        <div
          v-if="error"
          class="alert error"
        >
          {{ error }}
        </div>

        <button
          class="primary wide"
          :disabled="auth.loading"
        >
          {{ auth.loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="auth-switch">
        New to PulseWatch?
        <RouterLink to="/register">
          Create an account
        </RouterLink>
      </p>
    </div>
  </div>
</template>
