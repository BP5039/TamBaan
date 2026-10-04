a<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const dismissed = ref(false)
const resending = ref(false)
const resent = ref(false)

function onFocus() {
  authStore.refreshEmailVerified()
}

onMounted(() => {
  window.addEventListener('focus', onFocus)
})
onUnmounted(() => {
  window.removeEventListener('focus', onFocus)
})

async function onResend() {
  if (resending.value) return
  resending.value = true
  try {
    await authStore.resendVerificationEmail()
    resent.value = true
  } catch {
    // Quietly ignore — Firebase rate-limits repeated sends anyway, and
    // there's nothing actionable to show beyond "try again later."
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div
    v-if="authStore.isLoggedIn && !authStore.emailVerified && !dismissed"
    class="flex items-center gap-3 border-b border-pending-border bg-pending-bg px-4 py-2 text-sm text-pending-text sm:px-[15%]"
  >
    <svg class="h-4 w-4 flex-shrink-0 text-pending" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4c0 .3.1.5.3.7l3 3a1 1 0 001.4-1.4L11 9.6V6z"
        clip-rule="evenodd"
      />
    </svg>
    <p class="flex-1">
      Verify your email to make sure you can recover your account — check your inbox.
      <span v-if="resent" class="font-medium">Sent again.</span>
    </p>
    <button
      type="button"
      class="font-semibold text-primary hover:underline disabled:opacity-60"
      :disabled="resending"
      @click="onResend"
    >
      Resend
    </button>
    <button
      type="button"
      class="text-pending-text/70 hover:text-pending-text"
      aria-label="Dismiss"
      @click="dismissed = true"
    >
      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" d="M5 5l10 10M15 5L5 15" />
      </svg>
    </button>
  </div>
</template>