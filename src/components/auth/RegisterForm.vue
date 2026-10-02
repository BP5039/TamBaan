<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fieldAuthError } from '@/utils/authErrors'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const emit = defineEmits<{ success: []; 'switch-to-login': [] }>()

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const fieldErrors = reactive<{ email?: string; password?: string; confirmPassword?: string }>({})
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  fieldErrors.email = undefined
  fieldErrors.password = undefined
  fieldErrors.confirmPassword = undefined

  if (password.value !== confirmPassword.value) {
    fieldErrors.confirmPassword = 'Invalid confirm password.'
    return
  }

  loading.value = true
  try {
    await authStore.register(email.value.trim(), password.value)
    emit('success')
  } catch (e) {
    const { field, message } = fieldAuthError((e as { code?: string }).code ?? '')
    if (field === 'general') error.value = message
    else fieldErrors[field] = message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
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
        :error="fieldErrors.email"
        required
      />
      <BaseInput
        v-model="password"
        type="password"
        label="Password"
        autocomplete="new-password"
        :error="fieldErrors.password"
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
      <button
        type="button"
        class="font-medium text-primary hover:underline"
        @click="$emit('switch-to-login')"
      >
        Log in
      </button>
    </p>
  </div>
</template>