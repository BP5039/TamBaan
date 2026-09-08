import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuthModalStore } from '@/stores/authModal'
import { useOnboardingModalStore } from '@/stores/onboardingModal'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/LandingView.vue'),
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
      path: '/projects',
      name: 'my-projects',
      component: () => import('@/views/MyProjectsView.vue'),
      meta: { requiresAuth: true, requiresProfile: true },
    },
    {
      path: '/inbox',
      name: 'inbox',
      component: () => import('@/views/InboxView.vue'),
      meta: { requiresAuth: true, requiresProfile: true },
    },
    {
      path: '/projects/:id',
      name: 'project-hub',
      component: () => import('@/views/ProjectHubView.vue'),
    },
    {
      path: '/projects/:id/timeline',
      name: 'project-timeline',
      component: () => import('@/views/ProjectTimelineView.vue'),
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
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'discover' },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const authModalStore = useAuthModalStore()
  const onboardingModalStore = useOnboardingModalStore()
  await authStore.whenReady()

  const isLoggedIn = authStore.isLoggedIn
  const hasProfile = authStore.hasProfile

  if (to.meta.requiresAuth && !isLoggedIn) {
    authModalStore.openLogin()
    return { name: 'discover' }
  }
  if (to.meta.requiresAuth && isLoggedIn && !hasProfile) {
    onboardingModalStore.open()
    return { name: 'discover' }
  }
  return true
})

export default router