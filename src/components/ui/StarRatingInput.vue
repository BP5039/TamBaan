<script setup lang="ts">
import { ref } from 'vue'

const modelValue = defineModel<number>({ default: 0 })

const hovered = ref(0)

const STAR_PATH =
  'M10 1l2.35 5.94L18.5 7.64l-4.75 4.19L15.05 18 10 14.77 4.95 18l1.3-6.17L1.5 7.64l6.15-.7L10 1z'
</script>

<template>
  <div class="flex items-center gap-1" @mouseleave="hovered = 0">
    <button
      v-for="i in 5"
      :key="i"
      type="button"
      class="p-0.5"
      :aria-label="`${i} star${i > 1 ? 's' : ''}`"
      @mouseenter="hovered = i"
      @click="modelValue = i"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 20 20"
        :fill="(hovered || modelValue) >= i ? '#B8763F' : 'none'"
        stroke="#DCD3C0"
        stroke-width="1.3"
      >
        <path :d="STAR_PATH" />
      </svg>
    </button>
  </div>
</template>