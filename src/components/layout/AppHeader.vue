<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function logout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-cream bg-surface/95 backdrop-blur">
    <div class="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
      <router-link to="/" class="flex-shrink-0 font-display text-base font-bold text-ink">
        TamBaan
      </router-link>

      <div class="relative max-w-md flex-1">
        <input
          type="text"
          disabled
          placeholder="Search by name — coming soon"
          class="w-full cursor-not-allowed rounded-lg border border-cream bg-cream/30 px-3 py-2 text-sm text-muted"
        />
        <span class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-pending-bg px-2 py-0.5 text-[10px] font-medium text-pending-text">
          Coming soon
        </span>
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