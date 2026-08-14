<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginForm from '@/components/auth/LoginForm.vue'

const router = useRouter()
const authStore = useAuthStore()

function onSuccess() {
  router.push(authStore.hasProfile ? '/profile' : '/onboarding')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <LoginForm @success="onSuccess" @switch-to-register="router.push('/register')" />
    </div>
  </div>
</template>