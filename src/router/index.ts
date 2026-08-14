import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/profile' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true, hideHeader: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true, hideHeader: true },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/OnboardingWizard.vue'),
      meta: { requiresAuth: true, hideHeader: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true, requiresProfile: true },
    },
    {
      path: '/profile/edit',
      name: 'profile-edit',
      component: () => import('@/views/ProfileFormView.vue'),
      meta: { requiresAuth: true, requiresProfile: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.whenReady()

  const isLoggedIn = authStore.isLoggedIn
  const hasProfile = authStore.hasProfile

  if (to.meta.requiresAuth && !isLoggedIn) return { name: 'login' }
  if (to.meta.guestOnly && isLoggedIn) return { name: 'profile' }
  if (to.meta.requiresAuth && isLoggedIn && !hasProfile && to.name !== 'onboarding') {
    return { name: 'onboarding' }
  }
  if (to.name === 'onboarding' && hasProfile) return { name: 'profile' }
  return true
})

export default router