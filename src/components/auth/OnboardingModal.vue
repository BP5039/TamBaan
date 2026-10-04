<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingModalStore } from '@/stores/onboardingModal'
import OnboardingForm from '@/components/auth/OnboardingForm.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const router = useRouter()
const authStore = useAuthStore()
const onboardingModalStore = useOnboardingModalStore()

function onComplete() {
  onboardingModalStore.complete()
  router.push('/profile')
}
</script>

<template>
  <div v-if="onboardingModalStore.isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
    <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-6">
      <AlertBanner
        v-if="!authStore.emailVerified"
        variant="pending"
        title="Verify your email"
        :message="`We sent a link to ${authStore.user?.email}. You can finish setting up your profile while you wait.`"
        class="mb-5"
      />
      <OnboardingForm @complete="onComplete" />
    </div>
  </div>
</template>