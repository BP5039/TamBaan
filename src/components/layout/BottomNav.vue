<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuthModalStore } from '@/stores/authModal'
import { useNotificationsStore } from '@/stores/notifications'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const authModalStore = useAuthModalStore()
const notificationsStore = useNotificationsStore()

function isActive(names: string[]) {
  return typeof route.name === 'string' && names.includes(route.name)
}

// Home and Discover are always open; the other three require auth — tapping
// them while logged out opens the login modal instead of navigating, since
// their routes have nothing sensible to show an anonymous visitor.
function go(path: string, requiresAuth: boolean) {
  if (requiresAuth && !authStore.isLoggedIn) {
    authModalStore.openLogin()
    return
  }
  router.push(path)
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-cream bg-white px-2 pt-2 sm:hidden"
    style="padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px))"
  >
    <button
      type="button"
      class="flex flex-col items-center gap-0.5 px-2 py-1"
      :class="isActive(['home']) ? 'text-primary' : 'text-muted'"
      @click="go('/home', false)"
    >
      <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="isActive(['home']) ? 2.2 : 1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10l9-7 9 7v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" />
      </svg>
      <span class="text-[9px]" :class="isActive(['home']) ? 'font-bold' : 'font-medium'">Home</span>
    </button>

    <button
      type="button"
      class="flex flex-col items-center gap-0.5 px-2 py-1"
      :class="isActive(['discover', 'professional-profile']) ? 'text-primary' : 'text-muted'"
      @click="go('/discover', false)"
    >
      <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="isActive(['discover', 'professional-profile']) ? 2.2 : 1.8" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path stroke-linecap="round" d="M21 21l-4.35-4.35" />
      </svg>
      <span class="text-[9px]" :class="isActive(['discover', 'professional-profile']) ? 'font-bold' : 'font-medium'">Discover</span>
    </button>

    <button
      type="button"
      class="flex flex-col items-center gap-0.5 px-2 py-1"
      :class="isActive(['my-projects', 'project-hub']) ? 'text-primary' : 'text-muted'"
      @click="go('/projects', true)"
    >
      <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="isActive(['my-projects', 'project-hub']) ? 2.2 : 1.8" aria-hidden="true">
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 7l9-4 9 4" />
      </svg>
      <span class="text-[9px]" :class="isActive(['my-projects', 'project-hub']) ? 'font-bold' : 'font-medium'">Projects</span>
    </button>

    <button
      type="button"
      class="relative flex flex-col items-center gap-0.5 px-2 py-1"
      :class="isActive(['inbox']) ? 'text-primary' : 'text-muted'"
      @click="go('/inbox', true)"
    >
      <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="isActive(['inbox']) ? 2.2 : 1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path stroke-linecap="round" d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      <span
        v-if="authStore.isLoggedIn && notificationsStore.unreadCount > 0"
        class="absolute right-1 top-0 min-w-[14px] rounded-full border-[1.5px] border-white bg-error px-1 text-center text-[8px] font-bold text-white"
      >
        {{ notificationsStore.unreadCount }}
      </span>
      <span class="text-[9px]" :class="isActive(['inbox']) ? 'font-bold' : 'font-medium'">Inbox</span>
    </button>

    <button type="button" class="flex flex-col items-center gap-0.5 px-2 py-1" @click="go('/profile', true)">
      <div
        class="h-[22px] w-[22px] overflow-hidden rounded-full bg-cream"
        :class="isActive(['profile']) ? 'border-2 border-primary' : 'border border-cream'"
      >
        <img
          v-if="authStore.profile?.photoURL"
          :src="authStore.profile.photoURL"
          alt=""
          class="h-full w-full object-cover"
        />
      </div>
      <span class="text-[9px]" :class="isActive(['profile']) ? 'font-bold text-primary' : 'font-medium text-muted'">Profile</span>
    </button>
  </nav>
</template>