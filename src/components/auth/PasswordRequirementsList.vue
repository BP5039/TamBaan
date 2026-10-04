<script setup lang="ts">
import { computed } from 'vue'
import { PASSWORD_REQUIREMENTS } from '@/utils/passwordPolicy'

const props = defineProps<{ password: string }>()

const results = computed(() =>
  PASSWORD_REQUIREMENTS.map((req) => ({ ...req, met: req.test(props.password) })),
)
</script>

<template>
  <ul class="flex flex-col gap-1 rounded-lg bg-cream/60 px-3 py-2 text-xs">
    <li
      v-for="r in results"
      :key="r.id"
      class="flex items-center gap-1.5"
      :class="r.met ? 'text-success-text' : 'text-muted'"
    >
      <svg class="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
        <path v-if="r.met" stroke-linecap="round" stroke-linejoin="round" d="M4 10l4 4 8-8" />
        <circle v-else cx="10" cy="10" r="7" />
      </svg>
      {{ r.label }}
    </li>
  </ul>
</template>