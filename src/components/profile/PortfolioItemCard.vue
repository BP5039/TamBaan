<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PortfolioItem } from '@/types'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox.vue'
import CardMenu from '@/components/ui/CardMenu.vue'

const props = defineProps<{ item: PortfolioItem; canDelete?: boolean }>()
const emit = defineEmits<{ delete: []; 'open-project': [projectId: string] }>()

const index = ref(0)
const lightboxOpen = ref(false)
const hasMultiple = computed(() => props.item.images.length > 1)

function preload(url: string) {
  const img = new Image()
  img.src = url
}

watch(
  index,
  (i) => {
    const { images } = props.item
    if (images.length < 2) return
    preload(images[(i + 1) % images.length].thumb)
    preload(images[(i - 1 + images.length) % images.length].thumb)
  },
  { immediate: true },
)

function prev() {
  index.value = (index.value - 1 + props.item.images.length) % props.item.images.length
}
function next() {
  index.value = (index.value + 1) % props.item.images.length
}

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
      <img :src="item.images[index]?.thumb" alt="" class="h-full w-full object-cover" />

      <span
        class="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
        :class="item.source === 'collaboration' ? 'bg-success-bg text-success-text' : 'border border-cream bg-cream/90 text-muted'"
      >
        {{ item.source === 'collaboration' ? 'Completed project' : 'Past work' }}
      </span>

      <div v-if="canDelete && item.source !== 'collaboration'" class="absolute right-2 top-2">
        <CardMenu :items="[{ label: 'Remove', action: () => $emit('delete'), variant: 'danger' }]" />
      </div>

      <template v-if="hasMultiple">
        <button
          type="button"
          class="absolute left-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink"
          aria-label="Previous photo"
          @click.stop="prev"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12.5 15l-5-5 5-5" />
          </svg>
        </button>
        <button
          type="button"
          class="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink"
          aria-label="Next photo"
          @click.stop="next"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 5l5 5-5 5" />
          </svg>
        </button>
        <span class="absolute bottom-2 right-2 rounded-full bg-ink/60 px-2 py-0.5 text-[10px] text-white">
          {{ index + 1 }}/{{ item.images.length }}
        </span>
      </template>
    </div>
    <div class="p-3">
      <p class="mb-0.5 text-xs font-semibold text-ink">{{ item.title }}</p>
      <p class="line-clamp-3 text-xs text-ink/90">{{ item.description }}</p>
      <p class="mt-1 text-[11px] text-muted">{{ item.location }}</p>
    </div>

    <PortfolioLightbox
      v-if="lightboxOpen"
      :images="item.images"
      :start-index="index"
      @close="lightboxOpen = false"
    />
  </div>
</template>