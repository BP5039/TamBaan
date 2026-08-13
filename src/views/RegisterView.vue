<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { friendlyAuthError } from '@/utils/authErrors'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const fieldErrors = ref<{ confirmPassword?: string }>({})
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  fieldErrors.value = {}

  if (password.value !== confirmPassword.value) {
    fieldErrors.value.confirmPassword = 'Passwords do not match'
    return
  }

  loading.value = true
  try {
    await authStore.register(email.value.trim(), password.value)
    router.push('/onboarding')
  } catch (e) {
    console.error('register failed:', e)
    error.value = friendlyAuthError((e as { code?: string }).code ?? '')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <h1 class="mb-1 text-center text-2xl font-semibold text-ink">Welcome</h1>
      <p class="mb-6 text-center text-sm text-muted">Create your TamBaan account</p>

      <AlertBanner
        v-if="error"
        variant="error"
        title="Couldn't create your account"
        :message="error"
        class="mb-4"
      />

      <form class="space-y-4" @submit.prevent="onSubmit">
        <BaseInput
          v-model="email"
          type="email"
          label="Email"
          autocomplete="email"
          required
        />
        <BaseInput
          v-model="password"
          type="password"
          label="Password"
          autocomplete="new-password"
          required
        />
        <BaseInput
          v-model="confirmPassword"
          type="password"
          label="Confirm password"
          autocomplete="new-password"
          :error="fieldErrors.confirmPassword"
          required
        />
        <BaseButton type="submit" full-width :loading="loading">Register</BaseButton>
      </form>

      <p class="mt-6 text-center text-sm text-muted">
        Already have an account?
        <RouterLink to="/login" class="font-medium text-primary hover:underline">
          Log in
        </RouterLink>
      </p>
    </div>
  </div>
</template>
