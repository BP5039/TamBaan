<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AuthModal from '@/components/auth/AuthModal.vue'

const route = useRoute()
const showHeader = computed(() => !route.meta.hideHeader)
</script>

<template>
  <div class="min-h-screen bg-surface">
    <AppHeader v-if="showHeader" />
    <RouterView />
    <AuthModal />
  </div>
</template>