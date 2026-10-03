<script setup lang="ts">
// Shared "camera icon + count" pill — the one visual piece that kept
// drifting between ProjectCard, PortfolioItemCard, the Kanban board and
// Snapshot. No positioning of its own: the caller wraps it in its own
// `absolute bottom-2 right-2` (or wherever it needs to sit on that card),
// so this component never fights a Tailwind class with the caller's.
defineProps<{ count: number }>()
</script>

<template>
  <span
    v-if="count > 0"
    class="inline-flex items-center gap-1 rounded-full bg-ink/60 px-2 py-0.5 text-[10px] font-semibold text-white"
  >
    <svg class="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 4.5h18v15H3v-15z"
      />
    </svg>
    {{ count }}
  </span>
</template>