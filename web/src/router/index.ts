import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import LoginView from '@/views/LoginView.vue';
import RegisterView from '@/views/RegisterView.vue';
import MonitorsView from '@/views/MonitorsView.vue';
import MonitorDetailView from '@/views/MonitorDetailView.vue';
import NotificationsView from '@/views/NotificationsView.vue';
import PublicStatusView from '@/views/PublicStatusView.vue';
import { getToken } from '@/services/api';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView, meta: { guest: true } },
    { path: '/register', component: RegisterView, meta: { guest: true } },
    { path: '/status/:slug', component: PublicStatusView },
    { path: '/dashboard', component: DashboardView, meta: { auth: true } },
    { path: '/monitors', component: MonitorsView, meta: { auth: true } },
    { path: '/monitors/:id', component: MonitorDetailView, meta: { auth: true } },
    { path: '/notifications', component: NotificationsView, meta: { auth: true } },
  ],
});

router.beforeEach((to) => {
  const hasToken = Boolean(getToken());
  if (to.meta.auth && !hasToken) return '/login';
  if (to.meta.guest && hasToken) return '/dashboard';
});

export default router;
