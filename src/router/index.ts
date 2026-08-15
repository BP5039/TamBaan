import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/LandingView.vue'),
      beforeEnter: async () => {
        const authStore = useAuthStore()
        await authStore.whenReady()
        if (authStore.isLoggedIn) return { name: 'profile' }
        return true
      },
    },
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
      component: () => import('@/views/OnboardingView.vue'),
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
    {
      path: '/discover',
      name: 'discover',
      component: () => import('@/views/DiscoverView.vue'),
    },
    {
      path: '/discover/:username',
      name: 'professional-profile',
      component: () => import('@/views/PublicProfileView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/LandingView.vue'),
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