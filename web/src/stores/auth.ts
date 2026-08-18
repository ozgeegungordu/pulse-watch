import { defineStore } from 'pinia';
import { api, getToken, setToken } from '@/services/api';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null as User | null, loading: false, initialized: false }),
  getters: { authenticated: (state) => Boolean(state.user && getToken()) },
  actions: {
    async initialize() {
      if (this.initialized) return;
      this.initialized = true;
      if (!getToken()) return;
      try { this.user = await api<User>('/auth/me'); } catch { setToken(null); this.user = null; }
    },
    async login(email: string, password: string) {
      this.loading = true;
      try {
        const result = await api<{ accessToken: string; user: User }>('/auth/login', {
          method: 'POST', body: JSON.stringify({ email, password }),
        });
        setToken(result.accessToken); this.user = result.user;
      } finally { this.loading = false; }
    },
    async register(email: string, password: string, name?: string) {
      this.loading = true;
      try {
        const result = await api<{ accessToken: string; user: User }>('/auth/register', {
          method: 'POST', body: JSON.stringify({ email, password, name: name || undefined }),
        });
        setToken(result.accessToken); this.user = result.user;
      } finally { this.loading = false; }
    },
    logout() { setToken(null); this.user = null; },
  },
});
