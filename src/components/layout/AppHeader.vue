<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDiscoveryStore } from '@/stores/discovery'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const discoveryStore = useDiscoveryStore()

async function logout() {
  await authStore.logout()
  router.push('/')
}

function onSearchInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  discoveryStore.setSearchQuery(value)
  if (route.name !== 'discover' && route.name !== 'home') {
    router.push('/contractors')
  }
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-cream bg-surface/95 backdrop-blur">
    <div class="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
      <router-link to="/" class="flex-shrink-0 font-display text-base font-bold text-ink">
        TamBaan
      </router-link>

      <div class="relative max-w-md flex-1">
        <svg
          class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
          :class="discoveryStore.searchQuery ? 'text-primary' : 'text-muted'"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <circle cx="9" cy="9" r="6.5" />
          <path d="M14 14l4.5 4.5" stroke-linecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search by name"
          :value="discoveryStore.searchQuery"
          class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-ink focus:outline-none"
          :class="discoveryStore.searchQuery ? 'border-primary' : 'border-cream'"
          @input="onSearchInput"
        />
      </div>

      <nav class="flex flex-shrink-0 items-center gap-4">
        <router-link to="/contractors" class="text-sm font-semibold text-primary">
          Find contractors
        </router-link>
        <template v-if="authStore.isLoggedIn">
          <router-link to="/profile" class="text-sm font-medium text-muted hover:text-ink">
            My profile
          </router-link>
          <button type="button" class="text-sm font-medium text-muted hover:text-ink" @click="logout">
            Log out
          </button>
        </template>
        <router-link v-else to="/login" class="text-sm font-medium text-muted hover:text-ink">
          Log in
        </router-link>
      </nav>
    </div>
  </header>
</template>