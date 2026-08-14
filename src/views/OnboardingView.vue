<script setup lang="ts">
import { useRouter } from 'vue-router'
import OnboardingForm from '@/components/auth/OnboardingForm.vue'

const router = useRouter()

function onComplete() {
  router.push('/profile')
}
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-10">
    <OnboardingForm @complete="onComplete" />
  </div>
</template>