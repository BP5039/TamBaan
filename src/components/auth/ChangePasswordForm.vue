<script setup lang="ts">
import { ref } from 'vue'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'
import { friendlyAuthError } from '@/utils/authErrors'
import { isPasswordValid, PASSWORD_HINT } from '@/utils/passwordPolicy'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import PasswordRequirementsList from '@/components/auth/PasswordRequirementsList.vue'

const authStore = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorTitle = ref('')
const error = ref('')
const fieldError = ref('')
const loading = ref(false)
const done = ref(false)

async function onSubmit() {
  errorTitle.value = ''
  error.value = ''
  fieldError.value = ''

  if (!isPasswordValid(newPassword.value)) {
    fieldError.value = 'New password must be at least 8 characters and include a letter and a number.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    fieldError.value = 'New passwords don’t match.'
    return
  }

  const user = authStore.user
  if (!user?.email) {
    errorTitle.value = "Couldn't update your password"
    error.value = 'Something went wrong. Please try again.'
    return
  }

  loading.value = true
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword.value)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, newPassword.value)
    done.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    errorTitle.value = "Couldn't update your password"
    error.value = friendlyAuthError((e as { code?: string }).code ?? '')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="rounded-card border border-cream bg-white p-6">
    <template v-if="!done">
      <h2 class="mb-1 text-lg font-semibold text-ink">Change your password</h2>
      <p class="mb-5 text-sm text-muted">You'll need your current password to confirm it's you.</p>

      <AlertBanner v-if="error" variant="error" :title="errorTitle" :message="error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="onSubmit">
        <BaseInput
          v-model="currentPassword"
          type="password"
          label="Current password"
          autocomplete="current-password"
          required
        />
        <BaseInput
          v-model="newPassword"
          type="password"
          label="New password"
          :hint="PASSWORD_HINT"
          autocomplete="new-password"
          required
        />
        <BaseInput
          v-model="confirmPassword"
          type="password"
          label="Confirm new password"
          autocomplete="new-password"
          :error="fieldError"
          required
        />
        <PasswordRequirementsList :password="newPassword" />
        <BaseButton type="submit" :loading="loading">Update password</BaseButton>
      </form>
    </template>

    <template v-else>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 10l4 4 8-8" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-ink">Password updated</p>
          <p class="text-xs text-muted">Use it next time you sign in.</p>
        </div>
      </div>
      <button type="button" class="mt-4 text-sm font-medium text-primary hover:underline" @click="done = false">
        Change it again
      </button>
    </template>
  </div>
</template>