<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuthModalStore } from '@/stores/authModal'
import { useOnboardingModalStore } from '@/stores/onboardingModal'
import LoginForm from '@/components/auth/LoginForm.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const authModalStore = useAuthModalStore()
const onboardingModalStore = useOnboardingModalStore()

function onSuccess() {
  const needsOnboarding = !authStore.hasProfile
  authModalStore.close()

  if (needsOnboarding) {
    onboardingModalStore.open()
  } else if (route.name === 'home') {
    router.push('/profile')
  }
  // Otherwise: stay exactly where the person already was.
}
</script>

<template>
  <div
    v-if="authModalStore.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
    @click.self="authModalStore.close()"
  >
    <div class="relative w-full max-w-sm rounded-card bg-surface p-6">
      <button
        type="button"
        class="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-cream text-muted hover:text-ink"
        aria-label="Close"
        @click="authModalStore.close()"
      >
        <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path stroke-linecap="round" d="M5 5l10 10M15 5L5 15" />
        </svg>
      </button>

      <LoginForm
        v-if="authModalStore.mode === 'login'"
        @success="onSuccess"
        @switch-to-register="authModalStore.switchTo('register')"
      />
      <RegisterForm
        v-else
        @success="onSuccess"
        @switch-to-login="authModalStore.switchTo('login')"
      />
    </div>
  </div>
</template>