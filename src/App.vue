<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()
const showHeader = computed(() => !route.meta.hideHeader)
</script>

<template>
  <div class="min-h-screen bg-surface">
    <AppHeader v-if="showHeader" />
    <RouterView />
  </div>
</template>