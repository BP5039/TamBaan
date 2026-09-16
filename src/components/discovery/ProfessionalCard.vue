<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDiscoveryStore } from '@/stores/discovery'
import { labelForCategory } from '@/constants/workCategories'
import { formatLastSeen, activityRingClass, activityTextClass } from '@/utils/lastSeen'
import StarRating from '@/components/ui/StarRating.vue'
import type { UserProfile } from '@/types'

const props = defineProps<{ profile: UserProfile }>()
const router = useRouter()
const discoveryStore = useDiscoveryStore()
const MAX_BADGES = 2

function openProfile() {
  router.push(`/discover/${props.profile.username}`)
}

const matchedItem = computed(() => {
  const q = discoveryStore.searchQuery.trim().toLowerCase()
  if (!q) return null
  return (
    (props.profile.portfolioPreview ?? []).find((item) =>
      `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(q),
    ) ?? null
  )
})

const previewItem = computed(() => matchedItem.value ?? props.profile.portfolioPreview?.[0] ?? null)
const isMatched = computed(() => !!matchedItem.value)
</script>

<template>
  <button
    type="button"
    class="flex h-full w-full flex-col rounded-card border border-cream bg-white p-3.5 text-left transition hover:border-primary/50"
    @click="openProfile"
  >
    <div class="mb-2 flex items-center gap-2.5">
        <div
        class="h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded-full border-[2.5px] bg-cream"
        :class="activityRingClass(profile.lastActiveAt)"
        >
        <img v-if="profile.photoURL" :src="profile.photoURL" alt="" class="h-full w-full object-cover" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-ink">{{ profile.firstName }} {{ profile.lastName }}</p>
        <p class="truncate text-xs text-muted">@{{ profile.username }}</p>
        <p class="text-[11px] font-medium" :class="activityTextClass(profile.lastActiveAt)">
          {{ formatLastSeen(profile.lastActiveAt) }}
        </p>
      </div>
    </div>

    <StarRating :rating="profile.rating ?? null" :count="profile.ratingCount ?? 0" class="mb-1.5" />

    <p class="mb-1.5 text-xs text-muted">{{ profile.province }}</p>

    <div class="mb-2.5 flex flex-wrap gap-1">
      <span
        v-for="cat in profile.workCategories.slice(0, MAX_BADGES)"
        :key="cat"
        class="rounded-lg bg-cream px-2 py-0.5 text-[10px] font-medium text-ink"
      >
        {{ labelForCategory(cat) }}
      </span>
      <span
        v-if="profile.workCategories.length > MAX_BADGES"
        class="rounded-lg bg-cream px-2 py-0.5 text-[10px] font-medium text-muted"
      >
        +{{ profile.workCategories.length - MAX_BADGES }}
      </span>
    </div>

    <div
      v-if="previewItem && isMatched"
      class="-mx-3.5 -mb-3.5 mt-auto flex items-center gap-2 rounded-b-card bg-success-bg px-3.5 py-2.5"
    >
      <div class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-sand">
        <img v-if="previewItem.thumbUrl" :src="previewItem.thumbUrl" alt="" class="h-full w-full object-cover" />
      </div>
      <div class="min-w-0">
        <p class="text-[10px] font-bold text-success-text">✓ Matched your search</p>
        <p class="truncate text-[11px] text-ink">{{ previewItem.title }}</p>
      </div>
    </div>

    <div v-else class="mt-2 flex flex-1 flex-col border-t border-cream pt-2">
      <div v-if="previewItem" class="flex flex-1 items-center gap-2">
        <div class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-sand">
          <img v-if="previewItem.thumbUrl" :src="previewItem.thumbUrl" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="min-w-0">
          <p class="text-[10px] font-bold text-[#5A5344]">Most recent work</p>
          <p class="truncate text-[11px] text-ink">{{ previewItem.title }}</p>
        </div>
      </div>
      <p v-else class="flex flex-1 items-center justify-center text-center text-[11px] italic text-muted">
        No work uploaded yet
      </p>
    </div>
  </button>
</template>