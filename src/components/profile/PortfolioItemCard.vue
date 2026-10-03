<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PortfolioItem } from '@/types'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox.vue'
import CardMenu from '@/components/ui/CardMenu.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import ImageCountBadge from '@/components/ui/ImageCountBadge.vue'
import { formatDateRange } from '@/utils/dateFormat'

const props = defineProps<{ item: PortfolioItem; canDelete?: boolean }>()
const emit = defineEmits<{ delete: []; 'open-project': [projectId: string] }>()

const lightboxOpen = ref(false)

function onImageClick() {
  if (props.item.source === 'collaboration' && props.item.projectId) {
    emit('open-project', props.item.projectId)
  } else {
    lightboxOpen.value = true
  }
}

// Collaboration items get this denormalized at completion time (see
// completeProject()); manual past-work entries never have it — same split
// ProjectCard draws between a real otherParty and "no professional invited yet".
const dateRange = computed(() =>
  props.item.plannedStartDate && props.item.plannedEndDate
    ? formatDateRange(props.item.plannedStartDate, props.item.plannedEndDate)
    : '',
)
</script>

<template>
  <div class="overflow-hidden rounded-card border border-cream bg-white">
    <div class="relative aspect-[4/3] w-full cursor-pointer bg-cream/60" @click="onImageClick">
      <img :src="item.images[0]?.thumb" alt="" class="h-full w-full object-cover" />

      <span
        class="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
        :class="item.source === 'collaboration' ? 'bg-success-bg text-success-text' : 'border border-cream bg-cream/90 text-muted'"
      >
        {{ item.source === 'collaboration' ? 'Completed project' : 'Past work' }}
      </span>

      <div v-if="canDelete && item.source !== 'collaboration'" class="absolute right-2 top-2">
        <CardMenu :items="[{ label: 'Remove', action: () => $emit('delete'), variant: 'danger' }]" />
      </div>

      <div class="absolute bottom-2 right-2">
        <ImageCountBadge :count="item.images.length" />
      </div>
    </div>

    <div class="flex flex-col gap-1 p-3">
      <!-- Collaboration items show who the homeowner was, same as a live project
           card. Manual entries have no homeowner — a calendar + year chip
           keeps this row's height matched instead of leaving it blank. -->
      <div v-if="item.source === 'collaboration' && item.homeownerName" class="flex items-center gap-1.5">
        <div class="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full bg-cream">
          <UserAvatar :name="item.homeownerName" />
        </div>
        <span class="text-[11px] text-muted">{{ item.homeownerName }}</span>
      </div>
      <div v-else class="flex items-center gap-1.5">
        <div class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sand text-muted">
          <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
            <path stroke-linecap="round" d="M3 8h14M7 2.5v3M13 2.5v3" />
          </svg>
        </div>
        <span class="text-[11px] text-muted">{{ item.year }}</span>
      </div>

      <p class="text-xs font-semibold text-ink">{{ item.title }}</p>

      <p v-if="item.description" class="line-clamp-2 text-xs text-ink/90">{{ item.description }}</p>

      <div class="flex items-center gap-1.5 text-[11px] text-muted">
        <svg class="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 18s6-5.686 6-10a6 6 0 10-12 0c0 4.314 6 10 6 10z" />
          <circle cx="10" cy="8" r="2" />
        </svg>
        {{ item.location }}
      </div>

      <div v-if="dateRange" class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-[11px] text-muted">
          <svg class="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
            <path stroke-linecap="round" d="M3 8h14M7 2.5v3M13 2.5v3" />
          </svg>
          {{ dateRange }}
        </div>
        <div class="flex items-center gap-0.5 text-[10px] font-semibold text-primary">
          View details
          <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 4.5l6 5.5-6 5.5" />
          </svg>
        </div>
      </div>
    </div>

    <PortfolioLightbox
      v-if="lightboxOpen"
      :images="item.images"
      :start-index="0"
      @close="lightboxOpen = false"
    />
  </div>
</template>