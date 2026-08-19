<script setup lang="ts">
import { computed, ref } from 'vue'
import { readExif, formatExif } from '@/utils/exif'
import { validateImageFile, ALLOWED_IMAGE_TYPES } from '@/constants/fileValidation'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import type { ProjectTask } from '@/types/project'

const props = defineProps<{
  tasks: ProjectTask[]
  saving: boolean
  uploadError?: string
}>()

const emit = defineEmits<{
  close: []
  save: [
    payload: {
      taskId: string
      taskTitle: string
      file: File
      description: string
      exifTimestamp: number | null
      exifDevice: string | null
    },
  ]
}>()

const cameraInput = ref<HTMLInputElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const exifText = ref('')
const exifTimestamp = ref<number | null>(null)
const exifDevice = ref<string | null>(null)
const readingExif = ref(false)

const taskId = ref('')
const description = ref('')
const validationError = ref('')

const acceptAttr = ALLOWED_IMAGE_TYPES.join(',')

const selectedTask = computed(() => props.tasks.find((t) => t.id === taskId.value) ?? null)

const selectableTasks = computed(() =>
  props.tasks.filter((t) => t.status === 'not_started' || t.status === 'sent_back'),
)

async function onFileChange(e: Event) {
  const picked = (e.target as HTMLInputElement).files?.[0]
  if (!picked) return
  validationError.value = ''

  const err = validateImageFile(picked)
  if (err) {
    validationError.value = err
    return
  }

  file.value = picked
  previewUrl.value = URL.createObjectURL(picked)

  readingExif.value = true
  const exif = await readExif(picked)
  exifTimestamp.value = exif.timestamp
  exifDevice.value = exif.device
  exifText.value = formatExif(exif)
  readingExif.value = false
}

function submit() {
  validationError.value = ''
  if (!file.value) {
    validationError.value = 'Add a photo first.'
    return
  }
  if (!taskId.value) {
    validationError.value = 'Choose which task this update is for.'
    return
  }
  if (!description.value.trim()) {
    validationError.value = 'Add a short description of the progress.'
    return
  }

  emit('save', {
    taskId: taskId.value,
    taskTitle: selectedTask.value?.title ?? '',
    file: file.value,
    description: description.value.trim(),
    exifTimestamp: exifTimestamp.value,
    exifDevice: exifDevice.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="relative w-full max-w-sm rounded-card bg-white p-5">
      <div v-if="saving" class="absolute inset-0 z-10 rounded-card bg-white/60" />

      <h2 class="mb-1 text-lg font-semibold text-ink">Add progress</h2>
      <p class="mb-4 text-xs text-muted">A photo, the task it's for, and what happened.</p>

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
        title="Uploading…"
        message="This can take a moment on a slow connection."
        class="mb-4"
      />

      <fieldset :disabled="saving" class="border-0 p-0">
        <div class="mb-2 flex gap-2">
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-dark"
            @click="cameraInput?.click()"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5V6.75A2.25 2.25 0 015.25 4.5h2.379a1.5 1.5 0 001.06-.44l.842-.84A1.5 1.5 0 0110.6 2.75h2.8a1.5 1.5 0 011.06.44l.842.84a1.5 1.5 0 001.06.44h2.379A2.25 2.25 0 0121 6.75v9.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11.25a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take photo
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-cream py-2 text-xs font-medium text-muted hover:bg-cream/40"
            @click="galleryInput?.click()"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 4.5h18v15H3v-15z" />
            </svg>
            Gallery
          </button>
        </div>
        <input
          ref="cameraInput"
          type="file"
          :accept="acceptAttr"
          capture="environment"
          class="hidden"
          @change="onFileChange"
        />
        <input ref="galleryInput" type="file" :accept="acceptAttr" class="hidden" @change="onFileChange" />

        <div v-if="previewUrl" class="mb-1.5 h-24 overflow-hidden rounded-lg bg-cream">
          <img :src="previewUrl" alt="" class="h-full w-full object-cover" />
        </div>
        <p v-if="previewUrl" class="mb-3 flex items-center gap-1 text-[11px] text-muted">
          <svg class="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4c0 .3.1.5.3.7l3 3a1 1 0 001.4-1.4L11 9.6V6z" clip-rule="evenodd" />
          </svg>
          {{ readingExif ? 'Checking photo info…' : exifText }}
        </p>

        <p class="mb-1 text-sm font-medium text-ink">Task</p>
        <select
          v-model="taskId"
          class="mb-4 w-full rounded-lg border border-cream bg-white px-3 py-2.5 text-sm text-ink focus:outline-none"
        >
          <option value="" disabled>Select a task…</option>
          <option v-for="t in selectableTasks" :key="t.id" :value="t.id">
            {{ t.title }}
          </option>
        </select>

        <BaseTextarea
          v-model="description"
          label="Description"
          placeholder="What did you do?"
          :rows="3"
          required
          class="mb-5"
        />

        <div class="flex gap-2">
          <BaseButton variant="outline" full-width @click="$emit('close')">Cancel</BaseButton>
          <BaseButton full-width :loading="saving" @click="submit">Submit</BaseButton>
        </div>
      </fieldset>
    </div>
  </div>
</template>