<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDiscoveryStore } from '@/stores/discovery'
import { useAuthModalStore } from '@/stores/authModal'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const discoveryStore = useDiscoveryStore()
const authModalStore = useAuthModalStore()

function isActive(names: string[]) {
  return typeof route.name === 'string' && names.includes(route.name)
}

// Purely local — never touches the store or the route until submit.
const searchInput = ref('')

function onSearchSubmit(e: Event) {
  const value = (e.target as HTMLFormElement).search.value as string
  if (!isActive(['discover', 'professional-profile'])) {
    router.push('/discover')
  }
  discoveryStore.submitSearch(value)
  searchInput.value = ''
}
</script>

<template>
  <header class="z-20 border-b border-cream bg-surface/95 backdrop-blur">
    <div class="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
      <router-link to="/home" class="flex-shrink-0 font-display text-base font-bold text-ink">
        TamBaan
      </router-link>

      <form class="flex flex-1 justify-center" @submit.prevent="onSearchSubmit">
        <div class="flex w-full max-w-xs items-center gap-1 rounded-lg border border-cream bg-white p-1">
          <svg
            class="ml-1.5 h-3.5 w-3.5 flex-shrink-0 text-muted"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <circle cx="9" cy="9" r="6.5" />
            <path d="M14 14l4.5 4.5" stroke-linecap="round" />
          </svg>
          <input
            v-model="searchInput"
            name="search"
            type="text"
            placeholder="Search"
            class="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-ink focus:outline-none"
          />
          <button
            type="submit"
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-dark"
            aria-label="Search"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="9" r="6.5" />
              <path d="M14 14l4.5 4.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </form>

      <nav class="flex flex-shrink-0 items-center gap-5">
        <router-link
          to="/home"
          class="text-sm font-medium pb-0.5"
          :class="
            isActive(['home'])
              ? 'border-b-2 border-primary text-primary font-semibold'
              : 'text-muted hover:text-ink'
          "
        >
          Home
        </router-link>
        <router-link
          to="/discover"
          class="text-sm font-medium pb-0.5"
          :class="
            isActive(['discover', 'professional-profile'])
              ? 'border-b-2 border-primary text-primary font-semibold'
              : 'text-muted hover:text-ink'
          "
        >
          Find professionals
        </router-link>

        <router-link v-if="authStore.isLoggedIn" to="/profile" aria-label="My profile">
          <div class="h-7 w-7 overflow-hidden rounded-full border border-cream bg-cream">
            <img
              v-if="authStore.profile?.photoURL"
              :src="authStore.profile.photoURL"
              alt=""
              class="h-full w-full object-cover"
            />
          </div>
        </router-link>
        <button
          v-else
          type="button"
          class="rounded-lg bg-cream px-3 py-1.5 text-sm font-semibold text-ink hover:bg-cream/70"
          @click="authModalStore.openLogin()"
        >
          Log in
        </button>
      </nav>
    </div>
  </header>
</template>