<script setup lang="ts">
import { useRouter } from 'vue-router'
import { labelForCategory } from '@/constants/workCategories'
import StarRating from '@/components/ui/StarRating.vue'
import type { UserProfile } from '@/types'

const props = defineProps<{ profile: UserProfile }>()
const router = useRouter()
const MAX_BADGES = 3

function openProfile() {
  router.push(`/contractors/${props.profile.username}`)
}
</script>

<template>
  <button
    type="button"
    class="w-full rounded-card border border-cream bg-white p-4 text-left transition hover:border-primary/50"
    @click="openProfile"
  >
    <div class="mb-2 flex items-center gap-3">
      <div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-cream">
        <img v-if="profile.photoURL" :src="profile.photoURL" alt="" class="h-full w-full object-cover" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-ink">{{ profile.firstName }} {{ profile.lastName }}</p>
        <p class="truncate text-xs text-muted">@{{ profile.username }}</p>
      </div>
    </div>

    <StarRating :rating="profile.rating ?? null" :count="profile.ratingCount ?? 0" class="mb-2" />

    <div class="mb-2 flex flex-wrap gap-1.5">
      <span
        v-for="cat in profile.workCategories.slice(0, MAX_BADGES)"
        :key="cat"
        class="rounded-full bg-cream px-2 py-0.5 text-[10px] font-medium text-ink"
      >
        {{ labelForCategory(cat) }}
      </span>
      <span
        v-if="profile.workCategories.length > MAX_BADGES"
        class="rounded-full bg-cream px-2 py-0.5 text-[10px] font-medium text-muted"
      >
        +{{ profile.workCategories.length - MAX_BADGES }}
      </span>
    </div>

    <p class="text-xs text-muted">{{ profile.province }}</p>
  </button>
</template>