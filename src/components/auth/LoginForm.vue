<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { friendlyAuthError } from '@/utils/authErrors'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const emit = defineEmits<{ success: []; 'switch-to-register': [] }>()

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(email.value.trim(), password.value)
    emit('success')
  } catch (e) {
    error.value = friendlyAuthError((e as { code?: string }).code ?? '')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-center text-2xl font-semibold text-ink">Welcome back</h1>
    <p class="mb-6 text-center text-sm text-muted">Log in to TamBaan</p>

    <AlertBanner
      v-if="error"
      variant="error"
      title="Couldn't log you in"
      :message="error"
      class="mb-4"
    />

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseInput v-model="email" type="email" label="Email" autocomplete="email" required />
      <BaseInput
        v-model="password"
        type="password"
        label="Password"
        autocomplete="current-password"
        required
      />
      <BaseButton type="submit" full-width :loading="loading">Log in</BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-muted">
      Don't have an account?
      <button
        type="button"
        class="font-medium text-primary hover:underline"
        @click="$emit('switch-to-register')"
      >
        Register
      </button>
    </p>
  </div>
</template>