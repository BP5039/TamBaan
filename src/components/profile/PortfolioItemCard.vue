<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PortfolioItem } from '@/types'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox.vue'

const props = defineProps<{ item: PortfolioItem; canDelete?: boolean }>()
defineEmits<{ delete: [] }>()

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
</script>

<template>
  <div class="overflow-hidden rounded-card border border-cream bg-white">
    <div class="relative aspect-[4/3] w-full cursor-pointer bg-cream/60" @click="lightboxOpen = true">
      <img :src="item.images[index]?.thumb" alt="" class="h-full w-full object-cover" />

      <span class="absolute left-2 top-2 rounded-full border border-cream bg-cream/90 px-2 py-0.5 text-[10px] font-medium text-muted">
        Past work
      </span>

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
      <p class="text-[11px] text-muted">{{ item.location }}</p>
      <p class="line-clamp-3 text-xs text-ink/90">{{ item.description }}</p>
      <button
        v-if="canDelete"
        type="button"
        class="mt-2 text-xs font-medium text-error hover:underline"
        @click="$emit('delete')"
      >
        Remove
      </button>
    </div>

    <PortfolioLightbox
      v-if="lightboxOpen"
      :images="item.images"
      :start-index="index"
      @close="lightboxOpen = false"
    />
  </div>
</template>