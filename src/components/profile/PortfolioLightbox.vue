<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PortfolioImage } from '@/types'

const props = defineProps<{ images: PortfolioImage[]; startIndex: number }>()
const emit = defineEmits<{ close: [] }>()

const index = ref(props.startIndex)
watch(
  () => props.startIndex,
  (v) => (index.value = v),
)

function prev() {
  index.value = (index.value - 1 + props.images.length) % props.images.length
}
function next() {
  index.value = (index.value + 1) % props.images.length
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}
</script>

<template>
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4"
    tabindex="0"
    @keydown="onKeydown"
    @click.self="$emit('close')"
  >
    <button
      type="button"
      class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      aria-label="Close"
      @click="$emit('close')"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" d="M5 5l10 10M15 5L5 15" />
      </svg>
    </button>

    <button
      v-if="images.length > 1"
      type="button"
      class="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      aria-label="Previous photo"
      @click.stop="prev"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12.5 15l-5-5 5-5" />
      </svg>
    </button>
    <button
      v-if="images.length > 1"
      type="button"
      class="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      aria-label="Next photo"
      @click.stop="next"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 5l5 5-5 5" />
      </svg>
    </button>

    <img :src="images[index]?.full" alt="" class="max-h-[85vh] max-w-full object-contain" @click.stop />

    <span v-if="images.length > 1" class="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
      {{ index + 1 }} / {{ images.length }}
    </span>
  </div>
</template>