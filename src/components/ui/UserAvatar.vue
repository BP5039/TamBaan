<script setup lang="ts">
// Shared "photo if we have one, initials otherwise" avatar fill.
// Deliberately has no size/border/radius of its own — it fills whatever
// sized, rounded, overflow-hidden wrapper the caller already has (the same
// wrapper shape every avatar spot in the app already used for the photo-only
// version), so dropping it in never fights the caller's layout.
//
// Prop is named `photoUrl` (one capital), not `photoURL` — Vue's kebab-case
// conversion inserts a hyphen before every capital letter, so a `photoURL`
// prop only matches a template binding written as `:photo-u-r-l`. Every
// call site in this app binds it the normal way, as `:photo-url="..."`,
// which silently failed to match a `photoURL` prop and fell through as a
// dead, unbound HTML attribute on the root element instead — that's what
// was actually causing every avatar except the two spots that bypass this
// component entirely (AppHeader, BottomNav) to render blank/initials no
// matter whether a real photo URL was available. Keep this prop
// single-capital so the kebab-case match keeps working.
import { getInitials } from '@/utils/initials'

withDefaults(
  defineProps<{
    name: string
    photoUrl?: string | null
    textClass?: string
  }>(),
  { photoUrl: null, textClass: 'text-[9px]' },
)
</script>

<template>
  <img v-if="photoUrl" :src="photoUrl" alt="" class="h-full w-full object-cover" />
  <div v-else class="flex h-full w-full items-center justify-center bg-primary font-bold text-white" :class="textClass">
    {{ getInitials(name) }}
  </div>
</template>