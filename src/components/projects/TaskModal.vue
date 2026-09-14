<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTasksStore } from '@/stores/tasks'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import { validateImageFile } from '@/constants/fileValidation'
import type { ProjectTask } from '@/types/project'
import type { PortfolioImage } from '@/types'

const props = defineProps<{
  projectId: string
  task?: ProjectTask
  contractorUid?: string | null
  projectName?: string
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const tasksStore = useTasksStore()
const isEditMode = computed(() => !!props.task)
const MAX_IMAGES = 5

const title = ref(props.task?.title ?? '')
const description = ref(props.task?.description ?? '')
const error = ref('')
const saving = ref(false)

const existingImages = ref<PortfolioImage[]>(
  props.task?.referenceImages ? [...props.task.referenceImages] : [],
)
const removedImages = ref<PortfolioImage[]>([])
const newSlots = ref<{ file: File; previewUrl: string }[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const totalPhotos = computed(() => existingImages.value.length + newSlots.value.length)
const remainingSlots = computed(() => MAX_IMAGES - totalPhotos.value)

function pickFiles() {
  fileInput.value?.click()
}

function onFilesChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  error.value = ''

  for (const file of files) {
    if (totalPhotos.value >= MAX_IMAGES) {
      error.value = `You can add up to ${MAX_IMAGES} photos.`
      break
    }
    const err = validateImageFile(file)
    if (err) {
      error.value = err
      continue
    }
    newSlots.value.push({ file, previewUrl: URL.createObjectURL(file) })
  }

  if (fileInput.value) fileInput.value.value = ''
}

function removeExisting(i: number) {
  removedImages.value.push(existingImages.value[i])
  existingImages.value.splice(i, 1)
}

function removeNewSlot(i: number) {
  newSlots.value.splice(i, 1)
}

async function submit() {
  error.value = ''
  if (!title.value.trim()) {
    error.value = 'Give the task a name.'
    return
  }
  if (!description.value.trim()) {
    error.value = 'Add a description — this is where the exact spec goes (e.g. "3000K warm white bulbs").'
    return
  }

  saving.value = true
  try {
    if (isEditMode.value && props.task) {
      await tasksStore.editTask(
        props.projectId,
        props.task.id,
        title.value.trim(),
        description.value.trim(),
        newSlots.value.map((s) => s.file),
        existingImages.value,
        removedImages.value,
      )
    } else {
      await tasksStore.addTask(
        props.projectId,
        title.value.trim(),
        description.value.trim(),
        props.contractorUid ?? null,
        props.projectName ?? '',
        newSlots.value.map((s) => s.file),
      )
    }
    emit('saved')
  } catch (err) {
    console.error('task save failed:', err)
    error.value = "Couldn't save the task. Please try again."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="relative w-full max-w-sm rounded-card bg-white p-5">
      <div v-if="saving" class="absolute inset-0 z-10 rounded-card bg-white/60" />

      <h2 class="mb-1 text-lg font-semibold text-ink">{{ isEditMode ? 'Edit task' : 'Add a task' }}</h2>
      <p v-if="!isEditMode" class="mb-4 text-xs text-muted">A name, the exact spec, and optional photos of the area.</p>

      <AlertBanner v-if="error" variant="error" title="Can't save this yet" :message="error" class="mb-4" />

      <fieldset :disabled="saving" class="border-0 p-0">
        <BaseInput
          v-model="title"
          label="Task name"
          placeholder="e.g. Replace bulb"
          required
          class="mb-4"
        />
        <BaseTextarea
          v-model="description"
          label="Description"
          placeholder="Exact spec, e.g. 3000K warm white bulbs"
          :rows="3"
          required
          class="mb-4"
        />

        <p class="mb-1 text-sm font-medium text-ink">Reference photos</p>
        <p class="mb-2 text-xs text-muted">Optional — show the area so the professional knows what they're working with.</p>
        <div class="mb-1 grid grid-cols-5 gap-1.5">
          <div
            v-for="(img, i) in existingImages"
            :key="`existing-${i}`"
            class="relative aspect-square overflow-hidden rounded-lg bg-cream"
          >
            <img :src="img.thumb" alt="" class="h-full w-full object-cover" />
            <button
              type="button"
              class="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink/70 text-white"
              aria-label="Remove photo"
              @click="removeExisting(i)"
            >
              <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
          <div
            v-for="(slot, i) in newSlots"
            :key="`new-${i}`"
            class="relative aspect-square overflow-hidden rounded-lg bg-cream"
          >
            <img :src="slot.previewUrl" alt="" class="h-full w-full object-cover" />
            <button
              type="button"
              class="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink/70 text-white"
              aria-label="Remove photo"
              @click="removeNewSlot(i)"
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
        <p class="mb-5 text-[11px] text-muted">{{ totalPhotos }} of {{ MAX_IMAGES }} photos added</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/heic,image/heif"
          multiple
          class="hidden"
          @change="onFilesChange"
        />

        <div class="flex gap-2">
          <BaseButton variant="outline" full-width @click="$emit('close')">Cancel</BaseButton>
          <BaseButton full-width :loading="saving" @click="submit">{{ isEditMode ? 'Save changes' : 'Add task' }}</BaseButton>
        </div>
      </fieldset>
    </div>
  </div>
  </Teleport>
</template>