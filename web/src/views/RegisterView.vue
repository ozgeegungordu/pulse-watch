<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');

async function submit() {
  error.value = '';

  try {
    await auth.register(email.value, password.value, name.value);
    await router.push('/dashboard');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not create account';
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <img class="brand-logo" src="/pulsewatch-icon.png" alt="" />
        <strong>PulseWatch</strong>
      </div>

      <h1>Create your workspace</h1>
      <p class="muted">Start monitoring public HTTP endpoints in minutes.</p>

      <form @submit.prevent="submit">
        <label>
          <span>
            Name
            <span class="muted">(optional)</span>
          </span>
          <input
            v-model="name"
            maxlength="80"
            autocomplete="name"
          />
        </label>

        <label>
          Email
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
          />
        </label>

        <label>
          Password
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
          <span class="field-hint">Use at least 8 characters.</span>
        </label>

        <div v-if="error" class="alert error">
          {{ error }}
        </div>

        <button
          class="primary wide"
          :disabled="auth.loading"
        >
          {{ auth.loading ? 'Creating…' : 'Create account' }}
        </button>
      </form>

      <p class="auth-switch">
        Already have an account?
        <RouterLink to="/login">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>
