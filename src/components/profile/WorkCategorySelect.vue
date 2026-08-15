<script setup lang="ts">
import { WORK_CATEGORIES } from '@/constants/workCategories'
import type { WorkCategoryValue } from '@/types'

const props = defineProps<{
  modelValue: WorkCategoryValue[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: WorkCategoryValue[]] }>()

function toggle(value: WorkCategoryValue) {
  const set = new Set(props.modelValue)
  if (set.has(value)) {
    set.delete(value)
  } else {
    set.add(value)
  }
  emit('update:modelValue', Array.from(set))
}
</script>

<template>
  <div>
    <span class="mb-2 block text-sm font-medium text-ink">
      Work experience <span class="text-muted font-normal">(select all that apply)</span>
    </span>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="opt in WORK_CATEGORIES"
        :key="opt.value"
        type="button"
        class="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
        :class="
          modelValue.includes(opt.value)
            ? 'border-primary bg-primary text-white'
            : 'border-cream text-muted hover:border-primary/50 hover:text-ink'
        "
        @click="toggle(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>