<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { applyActionCode, checkActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useAuthModalStore } from '@/stores/authModal'
import { isPasswordValid, PASSWORD_HINT } from '@/utils/passwordPolicy'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import PasswordRequirementsList from '@/components/auth/PasswordRequirementsList.vue'

// One page for every Firebase email link. Firebase only allows a single
// custom action URL per project (shared by the reset and verification
// templates), so the link's `mode` decides what this page does:
//   mode=resetPassword -> set a new password (also the default, so older
//                         /reset-password?oobCode=... links keep working)
//   mode=verifyEmail   -> confirm the email address
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const authModalStore = useAuthModalStore()

type Stage =
  | 'checking'
  | 'ready'
  | 'invalid'
  | 'done'
  | 'verified'
  | 'verifyInvalid'
const stage = ref<Stage>('checking')

const email = ref('')
const oobCode = ref('')
const password = ref('')
const confirmPassword = ref('')
const fieldError = ref('')
const loading = ref(false)

async function handleVerifyEmail(code: string) {
  try {
    // checkActionCode first so the success screen can name the address —
    // applyActionCode itself returns nothing.
    const info = await checkActionCode(auth, code)
    email.value = info.data.email ?? ''
    await applyActionCode(auth, code)
    // If the person is logged in on this browser, drop the unverified
    // banner right away instead of waiting for the next focus event.
    if (auth.currentUser) await authStore.refreshEmailVerified()
    stage.value = 'verified'
  } catch {
    stage.value = 'verifyInvalid'
  }
}

async function handleResetPassword(code: string) {
  try {
    email.value = await verifyPasswordResetCode(auth, code)
    stage.value = 'ready'
  } catch {
    stage.value = 'invalid'
  }
}

onMounted(async () => {
  const code = typeof route.query.oobCode === 'string' ? route.query.oobCode : ''
  const mode = typeof route.query.mode === 'string' ? route.query.mode : 'resetPassword'
  if (!code) {
    stage.value = mode === 'verifyEmail' ? 'verifyInvalid' : 'invalid'
    return
  }
  oobCode.value = code
  if (mode === 'verifyEmail') {
    await handleVerifyEmail(code)
  } else if (mode === 'resetPassword') {
    await handleResetPassword(code)
  } else {
    // recoverEmail / verifyAndChangeEmail aren't used by TamBaan.
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

function continueToApp() {
  router.push(authStore.isLoggedIn ? '/profile' : '/home')
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

      <template v-else-if="stage === 'done'">
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

      <template v-else-if="stage === 'verified'">
        <div class="flex flex-col items-center text-center">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 10l4 4 8-8" />
            </svg>
          </div>
          <h1 class="mb-1 text-xl font-semibold text-ink">Email verified</h1>
          <p class="mb-5 text-sm text-muted">
            <strong v-if="email" class="text-ink">{{ email }}</strong><span v-if="email"> is confirmed. </span>You can now recover your account if you forget your password.
          </p>
          <BaseButton @click="continueToApp">Continue to TamBaan</BaseButton>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col items-center text-center">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-bg text-error">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 class="mb-1 text-xl font-semibold text-ink">This link has expired</h1>
          <p class="mb-5 text-sm text-muted">
            Verification links can only be used once. Log in and use Resend on the banner to get a new one.
          </p>
          <BaseButton @click="continueToApp">Go to TamBaan</BaseButton>
        </div>
      </template>
    </div>
  </div>
</template>