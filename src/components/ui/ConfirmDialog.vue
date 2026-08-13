<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}>()

defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="w-full max-w-sm rounded-card bg-white p-5">
      <h2 class="mb-2 text-lg font-semibold text-ink">{{ title }}</h2>
      <p class="mb-5 text-sm text-muted">{{ message }}</p>
      <div class="flex gap-2">
        <BaseButton variant="outline" full-width @click="$emit('cancel')">
          {{ cancelLabel ?? 'Cancel' }}
        </BaseButton>
        <BaseButton full-width @click="$emit('confirm')">
          {{ confirmLabel ?? 'Confirm' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>