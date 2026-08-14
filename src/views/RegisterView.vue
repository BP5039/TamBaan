<script setup lang="ts">
import { useRouter } from 'vue-router'
import RegisterForm from '@/components/auth/RegisterForm.vue'

const router = useRouter()

function onSuccess() {
  router.push('/onboarding')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <RegisterForm @success="onSuccess" @switch-to-login="router.push('/login')" />
    </div>
  </div>
</template>