<script setup lang="ts">
// Shared "photo if we have one, initials otherwise" avatar fill.
// Deliberately has no size/border/radius of its own — it fills whatever
// sized, rounded, overflow-hidden wrapper the caller already has (the same
// wrapper shape every avatar spot in the app already used for the photo-only
// version), so dropping it in never fights the caller's layout.
import { getInitials } from '@/utils/initials'

withDefaults(
  defineProps<{
    name: string
    photoURL?: string | null
    textClass?: string
  }>(),
  { photoURL: null, textClass: 'text-[9px]' },
)
</script>

<template>
  <img v-if="photoURL" :src="photoURL" alt="" class="h-full w-full object-cover" />
  <div v-else class="flex h-full w-full items-center justify-center bg-primary font-bold text-white" :class="textClass">
    {{ getInitials(name) }}
  </div>
</template>