<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '@/firebase/config'
import { useAuthModalStore } from '@/stores/authModal'
import { isPasswordValid, PASSWORD_HINT } from '@/utils/passwordPolicy'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import PasswordRequirementsList from '@/components/auth/PasswordRequirementsList.vue'

const route = useRoute()
const router = useRouter()
const authModalStore = useAuthModalStore()

type Stage = 'checking' | 'ready' | 'invalid' | 'done'
const stage = ref<Stage>('checking')
const email = ref('')
const oobCode = ref('')

const password = ref('')
const confirmPassword = ref('')
const fieldError = ref('')
const loading = ref(false)

onMounted(async () => {
  const code = typeof route.query.oobCode === 'string' ? route.query.oobCode : ''
  if (!code) {
    stage.value = 'invalid'
    return
  }
  oobCode.value = code
  try {
    email.value = await verifyPasswordResetCode(auth, code)
    stage.value = 'ready'
  } catch {
    stage.value = 'invalid'
  }
})

async function onSubmit() {
  fieldError.value = ''

  if (!isPasswordValid(password.value)) {
    fieldError.value = 'Password must be at least 8 characters and include a letter and a number.'
    return
  }
  if (password.value !== confirmPassword.value) {
    fieldError.value = 'Passwords don’t match.'
    return
  }

  loading.value = true
  try {
    await confirmPasswordReset(auth, oobCode.value, password.value)
    stage.value = 'done'
  } catch {
    // The code can still expire, or get used from another tab, in the
    // moment between verifying it on mount and submitting here.
    stage.value = 'invalid'
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  authModalStore.openLogin()
  router.push('/home')
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm rounded-card bg-white p-6 shadow-sm">

      <template v-if="stage === 'checking'">
        <p class="text-center text-sm text-muted">Checking your link…</p>
      </template>

      <template v-else-if="stage === 'ready'">
        <h1 class="mb-1 text-center text-2xl font-semibold text-ink">Set a new password</h1>
        <p class="mb-6 text-center text-sm text-muted">
          Choose a new password for <strong class="text-ink">{{ email }}</strong>.
        </p>

        <AlertBanner v-if="fieldError" variant="error" title="Couldn't update your password" :message="fieldError" class="mb-4" />

        <form class="space-y-4" @submit.prevent="onSubmit">
          <BaseInput v-model="password" type="password" label="New password" :hint="PASSWORD_HINT" autocomplete="new-password" required />
          <BaseInput v-model="confirmPassword" type="password" label="Confirm new password" autocomplete="new-password" required />
          <PasswordRequirementsList :password="password" />
          <BaseButton type="submit" full-width :loading="loading">Save new password</BaseButton>
        </form>
      </template>

      <template v-else-if="stage === 'invalid'">
        <div class="flex flex-col items-center text-center">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-bg text-error">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 class="mb-1 text-xl font-semibold text-ink">This link has expired</h1>
          <p class="mb-5 text-sm text-muted">
            Reset links are only valid for 1 hour, or until used once. Request a new one to continue.
          </p>
          <BaseButton @click="goToLogin">Request a new link</BaseButton>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col items-center text-center">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 10l4 4 8-8" />
            </svg>
          </div>
          <h1 class="mb-1 text-xl font-semibold text-ink">Password updated</h1>
          <p class="mb-5 text-sm text-muted">Use your new password next time you sign in.</p>
          <BaseButton @click="goToLogin">Go to login</BaseButton>
        </div>
      </template>

    </div>
  </div>
</template>