<script setup lang="ts">
import { useOnboardingModalStore } from '@/stores/onboardingModal'
import OnboardingForm from '@/components/auth/OnboardingForm.vue'

const onboardingModalStore = useOnboardingModalStore()

function onComplete() {
  onboardingModalStore.complete()
}
</script>

<template>
  <div v-if="onboardingModalStore.isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
    <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-6">
      <OnboardingForm @complete="onComplete" />
    </div>
  </div>
</template>