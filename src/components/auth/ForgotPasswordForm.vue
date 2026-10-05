<script setup lang="ts">
import { ref } from 'vue'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/firebase/config'
import { friendlyAuthError } from '@/utils/authErrors'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

defineEmits<{ 'switch-to-login': [] }>()

const email = ref('')
const error = ref('')
const loading = ref(false)
const sent = ref(false)

// Firebase won't let this project point its email links at TamBaan
// (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED), so the reset happens on Firebase's own
// page. This URL is where its "Continue" button sends the person afterwards.
// It must not be /auth/action or /reset-password: those expect a one-time code
// in the URL and would show "This link has expired" without one.
function actionCodeSettings() {
  return {
    url: `${window.location.origin}/home`,
  }
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await sendPasswordResetEmail(auth, email.value.trim(), actionCodeSettings())
    sent.value = true
  } catch (e) {
    error.value = friendlyAuthError((e as { code?: string }).code ?? '')
  } finally {
    loading.value = false
  }
}

async function onResend() {
  if (loading.value) return
  loading.value = true
  try {
    await sendPasswordResetEmail(auth, email.value.trim(), actionCodeSettings())
  } catch {
    // Resend failing silently here is fine — the person already has a working
    // link from the first send, so we don't kick them back to the request
    // step over a resend hiccup.
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="!sent">
    <button
      type="button"
      class="mb-4 flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      @click="$emit('switch-to-login')"
    >
      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12.5 15l-5-5 5-5" />
      </svg>
      Back to login
    </button>

    <h1 class="mb-1 text-center text-2xl font-semibold text-ink">Reset your password</h1>
    <p class="mb-6 text-center text-sm text-muted">
      Enter the email on your account and we'll send you a link to set a new one.
    </p>

    <AlertBanner v-if="error" variant="error" title="Couldn't send the reset link" :message="error" class="mb-4" />

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseInput v-model="email" type="email" label="Email" autocomplete="email" required />
      <BaseButton type="submit" full-width :loading="loading">Send reset link</BaseButton>
    </form>
  </div>

  <div v-else class="flex flex-col items-center text-center">
    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.5V17a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h10M22 4l-7.5 7.5L12 9" />
      </svg>
    </div>
    <h1 class="mb-1 text-xl font-semibold text-ink">Check your email</h1>
    <p class="mb-4 text-sm text-muted">
      We sent a reset link to<br /><strong class="text-ink">{{ email }}</strong>. It expires in 1 hour.
    </p>
    <button type="button" class="text-sm font-medium text-primary hover:underline disabled:opacity-60" :disabled="loading" @click="onResend">
      Resend link
    </button>
  </div>
</template>