<script setup lang="ts">
import { ref } from 'vue'
import type { PortfolioItem } from '@/types'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox.vue'
import CardMenu from '@/components/ui/CardMenu.vue'

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

      <!-- Icon + count, always shown — browsing beyond the cover photo now
           happens inside the lightbox (it has its own arrow navigation),
           not inline on the card. -->
      <span
        v-if="item.images.length"
        class="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-ink/60 px-2 py-0.5 text-[10px] font-semibold text-white"
      >
        <svg class="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 4.5h18v15H3v-15z" />
        </svg>
        {{ item.images.length }}
      </span>
    </div>
    <div class="p-3">
      <p class="mb-0.5 text-xs font-semibold text-ink">{{ item.title }}</p>
      <p class="line-clamp-3 text-xs text-ink/90">{{ item.description }}</p>
      <p class="mt-1 text-[11px] text-muted">{{ item.location }}</p>
    </div>

    <PortfolioLightbox
      v-if="lightboxOpen"
      :images="item.images"
      :start-index="0"
      @close="lightboxOpen = false"
    />
  </div>
</template>