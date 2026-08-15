<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import { THAI_PROVINCES } from '@/constants/provinces'
import { getYearOptions } from '@/constants/years'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_LABEL,
  MAX_IMAGE_SIZE_BYTES,
  validateImageFile,
} from '@/constants/fileValidation'

const props = defineProps<{
  saving: boolean
  uploadError?: string
}>()

const emit = defineEmits<{
  close: []
  save: [
    payload: {
      files: File[]
      title: string
      description: string
      year: number
      location: string
    },
  ]
}>()

const MAX_IMAGES = 5
const YEAR_OPTIONS = getYearOptions()

const fileInput = ref<HTMLInputElement | null>(null)
const slots = ref<{ file: File; previewUrl: string }[]>([])
const title = ref('')
const description = ref('')
const year = ref(String(new Date().getFullYear()))
const location = ref('')
const validationError = ref('')

const remainingSlots = computed(() => MAX_IMAGES - slots.value.length)
const acceptAttr = ALLOWED_IMAGE_TYPES.join(',')

function pickFiles() {
  fileInput.value?.click()
}

function onFilesChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  validationError.value = ''

  for (const file of files) {
    if (slots.value.length >= MAX_IMAGES) {
      validationError.value = `You can add up to ${MAX_IMAGES} photos.`
      break
    }
    const err = validateImageFile(file)
    if (err) {
      validationError.value = err
      continue
    }
    slots.value.push({ file, previewUrl: URL.createObjectURL(file) })
  }

  if (fileInput.value) fileInput.value.value = ''
}

function removeSlot(i: number) {
  slots.value.splice(i, 1)
}

function submit() {
  validationError.value = ''
  if (slots.value.length === 0) {
    validationError.value = 'Add at least one photo of the finished work.'
    return
  }
  if (!title.value.trim()) {
    validationError.value = 'Give this work a short title.'
    return
  }
  if (!description.value.trim()) {
    validationError.value = 'Add a short description of the work.'
    return
  }
  if (!location.value) {
    validationError.value = 'Select a location.'
    return
  }

  emit('save', {
    files: slots.value.map((s) => s.file),
    title: title.value.trim(),
    description: description.value.trim(),
    year: Number(year.value),
    location: location.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="relative w-full max-w-sm rounded-card bg-white p-5">
      <div v-if="saving" class="absolute inset-0 z-10 rounded-card bg-white/60" />

      <h2 class="mb-1 text-lg font-semibold text-ink">Add work</h2>
      <p class="mb-4 text-xs text-muted">
        {{ ALLOWED_IMAGE_LABEL }} · up to {{ Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024)) }}MB each
      </p>

      <AlertBanner
        v-if="validationError"
        variant="error"
        title="Can't save this yet"
        :message="validationError"
        class="mb-4"
      />
      <AlertBanner
        v-else-if="uploadError"
        variant="error"
        title="Upload failed"
        :message="uploadError"
        class="mb-4"
      />
      <AlertBanner
        v-else-if="saving"
        variant="pending"
        :title="`Uploading ${slots.length} photo${slots.length === 1 ? '' : 's'}…`"
        message="This can take a moment on a slow connection."
        class="mb-4"
      />

      <fieldset :disabled="saving" class="border-0 p-0">
        <!-- 1. Upload -->
        <div class="mb-1 grid grid-cols-5 gap-1.5">
          <div
            v-for="(slot, i) in slots"
            :key="i"
            class="relative aspect-square overflow-hidden rounded-lg bg-cream"
          >
            <img :src="slot.previewUrl" alt="" class="h-full w-full object-cover" />
            <button
              type="button"
              class="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink/70 text-white"
              aria-label="Remove photo"
              @click="removeSlot(i)"
            >
              <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
          <button
            v-if="remainingSlots > 0"
            type="button"
            class="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-cream text-muted hover:border-primary"
            @click="pickFiles"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
        <p class="mb-4 text-[11px] text-muted">{{ slots.length }} of {{ MAX_IMAGES }} photos added</p>
        <input
          ref="fileInput"
          type="file"
          :accept="acceptAttr"
          multiple
          class="hidden"
          @change="onFilesChange"
        />

        <!-- 2. Title -->
        <BaseInput
          v-model="title"
          label="Title"
          placeholder="e.g. ABCD Villa — pipe repiping"
          required
          class="mb-4"
        />

        <!-- 3. Description -->
        <BaseTextarea
          v-model="description"
          label="Description"
          placeholder="What was the job? e.g. Full bathroom retile, 2 weeks"
          :maxlength="200"
          :rows="3"
          required
          class="mb-4"
        />

        <!-- 4 & 5. Year and location -->
        <div class="mb-5 grid grid-cols-2 gap-3">
          <BaseSelect v-model="year" label="Year" :options="YEAR_OPTIONS" required />
          <BaseSelect v-model="location" label="Location" :options="THAI_PROVINCES" required />
        </div>

        <div class="flex gap-2">
          <BaseButton variant="outline" full-width @click="$emit('close')">Cancel</BaseButton>
          <BaseButton full-width :loading="saving" @click="submit">Save</BaseButton>
        </div>
      </fieldset>
    </div>
  </div>
</template>