<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import AuthModal from '@/components/auth/AuthModal.vue'
import OnboardingModal from '@/components/auth/OnboardingModal.vue'
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-surface">
    <AppHeader />
    <div class="flex-1 overflow-y-auto pb-16 sm:pb-0">
      <RouterView />
    </div>
    <AppFooter />
    <BottomNav />
    <AuthModal />
    <OnboardingModal />
  </div>
</template>