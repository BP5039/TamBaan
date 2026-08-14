<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ rating: number | null; count?: number; size?: number }>(),
  { count: 0, size: 13 },
)

const STAR_PATH =
  'M10 1l2.35 5.94L18.5 7.64l-4.75 4.19L15.05 18 10 14.77 4.95 18l1.3-6.17L1.5 7.64l6.15-.7L10 1z'

const starStates = computed<('full' | 'half' | 'empty')[]>(() => {
  if (props.rating == null) return Array(5).fill('empty')
  return Array.from({ length: 5 }, (_, i) => {
    const threshold = i + 1
    if (props.rating! >= threshold) return 'full'
    if (props.rating! >= threshold - 0.5) return 'half'
    return 'empty'
  })
})
</script>

<template>
  <div class="flex items-center gap-1">
    <div class="flex items-center gap-0.5">
      <template v-for="(state, i) in starStates" :key="i">
        <svg v-if="state === 'full'" :width="size" :height="size" viewBox="0 0 20 20" fill="#B8763F">
          <path :d="STAR_PATH" />
        </svg>
        <span v-else-if="state === 'half'" class="relative inline-block" :style="{ width: size + 'px', height: size + 'px' }">
          <svg class="absolute left-0 top-0" :width="size" :height="size" viewBox="0 0 20 20" fill="none" stroke="#DCD3C0" stroke-width="1.3">
            <path :d="STAR_PATH" />
          </svg>
          <span class="absolute left-0 top-0 h-full w-1/2 overflow-hidden">
            <svg :width="size" :height="size" viewBox="0 0 20 20" fill="#B8763F">
              <path :d="STAR_PATH" />
            </svg>
          </span>
        </span>
        <svg v-else :width="size" :height="size" viewBox="0 0 20 20" fill="none" stroke="#DCD3C0" stroke-width="1.3">
          <path :d="STAR_PATH" />
        </svg>
      </template>
    </div>
    <span v-if="rating != null" class="text-xs text-muted">{{ rating.toFixed(1) }} ({{ count }})</span>
    <span v-else class="text-xs text-muted">Not yet rated</span>
  </div>
</template>