<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ items: { label: string; action: () => void; variant?: 'danger' }[] }>()

const open = ref(false)

function trigger(action: () => void) {
  open.value = false
  action()
}
</script>

<template>
  <div class="relative" @click.stop>
    <button
      type="button"
      class="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink hover:bg-white"
      aria-label="More options"
      @click="open = !open"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <circle cx="10" cy="4" r="1.5" />
        <circle cx="10" cy="10" r="1.5" />
        <circle cx="10" cy="16" r="1.5" />
      </svg>
    </button>

    <div v-if="open" class="fixed inset-0 z-10" @click="open = false" />

    <div
      v-if="open"
      class="absolute right-0 top-7 z-20 w-36 rounded-lg border border-cream bg-white py-1 shadow-lg"
    >
      <button
        v-for="(item, i) in items"
        :key="i"
        type="button"
        class="block w-full px-3 py-2 text-left text-xs"
        :class="item.variant === 'danger' ? 'text-error hover:bg-error-bg' : 'text-ink hover:bg-cream/40'"
        @click="trigger(item.action)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>