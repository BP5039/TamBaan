<script setup lang="ts">
import { ref, computed } from 'vue'
import { validateImageFile } from '@/constants/fileValidation'

const props = defineProps<{
  currentUrl?: string | null
}>()

const emit = defineEmits<{
  'file-selected': [file: File]
  'invalid-file': [message: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const localPreview = ref<string | null>(null)

const displayUrl = computed(() => localPreview.value ?? props.currentUrl ?? null)

function openPicker() {
  fileInput.value?.click()
}

function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const validationError = validateImageFile(file)
  if (validationError) {
    emit('invalid-file', validationError)
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  localPreview.value = URL.createObjectURL(file)
  emit('file-selected', file)
}

function reset() {
  localPreview.value = null
  if (fileInput.value) fileInput.value.value = ''
}

defineExpose({ reset })
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <button
      type="button"
      class="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-cream bg-cream/40 text-muted transition hover:border-primary"
      @click="openPicker"
    >
      <img v-if="displayUrl" :src="displayUrl" alt="Profile picture" class="h-full w-full object-cover" />
      <span v-else class="flex flex-col items-center gap-1 text-xs">
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5V6.75A2.25 2.25 0 015.25 4.5h2.379a1.5 1.5 0 001.06-.44l.842-.84A1.5 1.5 0 0110.6 2.75h2.8a1.5 1.5 0 011.06.44l.842.84a1.5 1.5 0 001.06.44h2.379A2.25 2.25 0 0121 6.75v9.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 11.25a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Profile pic
      </span>
      <span class="absolute inset-0 flex items-center justify-center bg-ink/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
        Change
      </span>
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/heic,image/heif"
      class="hidden"
      @change="onChange"
    />
  </div>
</template>