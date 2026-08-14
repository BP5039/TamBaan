<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AuthModal from '@/components/auth/AuthModal.vue'

const route = useRoute()
const showHeader = computed(() => !route.meta.hideHeader)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppHeader v-if="showHeader" />
    <div class="flex-1">
      <RouterView />
    </div>
    <AppFooter v-if="showHeader" />
    <AuthModal />
  </div>
</template>