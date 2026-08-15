<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AuthModal from '@/components/auth/AuthModal.vue'
import OnboardingModal from '@/components/auth/OnboardingModal.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppHeader />
    <div class="flex-1">
      <RouterView />
    </div>
    <AppFooter />
    <AuthModal />
    <OnboardingModal />
  </div>
</template>