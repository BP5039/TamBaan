<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import { useProgressStore } from '@/stores/progress'
import { formatExif } from '@/utils/exif'
import AddProgressModal from '@/components/projects/AddProgressModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const progressStore = useProgressStore()

const projectId = computed(() => route.params.id as string)
const project = computed(() => projectsStore.currentProject)
const isHomeowner = computed(() => project.value?.homeownerUid === authStore.user?.uid)
const isContractor = computed(() => project.value?.contractorUid === authStore.user?.uid)

const doneCount = computed(() => tasksStore.tasks.filter((t) => t.status === 'done').length)

const showAddModal = ref(false)
const uploading = ref(false)
const modalUploadError = ref('')

const sendBackTargetId = ref<string | null>(null)
const sendBackReason = ref('')
const sendBackError = ref('')

async function load() {
  if (!projectsStore.currentProject || projectsStore.currentProject.id !== projectId.value) {
    await projectsStore.fetchProject(projectId.value)
  }
  await tasksStore.fetchTasks(projectId.value)
  await progressStore.fetchUpdates(projectId.value)
}

onMounted(load)

function openAddModal() {
  modalUploadError.value = ''
  showAddModal.value = true
}

async function handleSaveProgress(payload: {
  taskId: string
  taskTitle: string
  file: File
  description: string
  exifTimestamp: number | null
  exifDevice: string | null
}) {
  modalUploadError.value = ''
  uploading.value = true
  try {
    await progressStore.addUpdate(
        projectId.value,
        project.value!.homeownerUid,
        payload.taskId,
        payload.taskTitle,
        payload.file,
        payload.description,
        payload.exifTimestamp,
        payload.exifDevice,
    )
    showAddModal.value = false
  } catch (err) {
    console.error('addUpdate failed:', err)
    modalUploadError.value = 'Upload failed. Check your connection and try again.'
  } finally {
    uploading.value = false
  }
}

async function verify(updateId: string) {
  const update = progressStore.updates.find((u) => u.id === updateId)
  await progressStore.verifyUpdate(projectId.value, updateId, project.value!.contractorUid!, update?.taskTitle ?? '')
}

function startSendBack(updateId: string) {
  sendBackTargetId.value = updateId
  sendBackReason.value = ''
  sendBackError.value = ''
}

function cancelSendBack() {
  sendBackTargetId.value = null
}

async function confirmSendBack(updateId: string) {
  if (!sendBackReason.value.trim()) {
    sendBackError.value = 'Explain what needs fixing.'
    return
  }
  const update = progressStore.updates.find((u) => u.id === updateId)
  await progressStore.sendBackUpdate(
    projectId.value,
    updateId,
    sendBackReason.value.trim(),
    project.value!.contractorUid!,
    update?.taskTitle ?? '',
  )
  sendBackTargetId.value = null
}

function statusBadge(status: string) {
  if (status === 'verified') return { text: 'Verified', class: 'bg-success-bg text-success-text' }
  if (status === 'sent_back') return { text: 'Sent back', class: 'bg-error-bg text-error-text' }
  return { text: 'Awaiting review', class: 'bg-pending-bg text-pending-text' }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <BaseButton variant="ghost" class="mb-4" @click="router.push(`/projects/${projectId}`)">
      ← {{ project?.name ?? 'Project' }}
    </BaseButton>

    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-ink">Timeline</h1>
        <p class="text-xs text-muted">{{ doneCount }}/{{ tasksStore.tasks.length }} tasks done</p>
      </div>
      <BaseButton v-if="isContractor" @click="openAddModal">+ Add progress</BaseButton>
    </div>

    <AlertBanner v-if="progressStore.error" variant="error" title="Couldn't load timeline" :message="progressStore.error" class="mb-4" />
    <p v-if="progressStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <div v-else class="space-y-4">
      <div v-for="update in progressStore.updates" :key="update.id" class="rounded-lg border border-cream bg-white p-3">
        <div class="mb-2 h-40 overflow-hidden rounded-lg bg-cream">
          <img :src="update.images[0]?.full" alt="" class="h-full w-full object-cover" />
        </div>

        <div class="mb-1 flex items-start justify-between gap-2">
          <p class="text-sm font-semibold text-ink">{{ update.taskTitle }}</p>
          <span class="flex-shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium" :class="statusBadge(update.status).class">
            {{ statusBadge(update.status).text }}
          </span>
        </div>
        <p class="mb-1 text-xs text-ink/90">{{ update.description }}</p>
        <p class="mb-2 text-[11px] text-muted">
          {{ new Date(update.createdAt).toLocaleDateString() }}
          <span v-if="update.exifTimestamp || update.exifDevice">
            · {{ formatExif({ timestamp: update.exifTimestamp, device: update.exifDevice }) }}
          </span>
        </p>

        <p v-if="update.status === 'sent_back'" class="mb-2 rounded-lg bg-error-bg p-2 text-xs text-error-text">
          {{ update.sentBackReason }}
        </p>

        <template v-if="isHomeowner && update.status === 'pending'">
          <div v-if="sendBackTargetId === update.id" class="mt-2">
            <textarea
              v-model="sendBackReason"
              rows="2"
              placeholder="What needs fixing?"
              class="mb-1 w-full resize-none rounded-lg border border-cream px-2.5 py-1.5 text-xs text-ink focus:outline-none"
            />
            <p v-if="sendBackError" class="mb-1 text-[11px] text-error-text">{{ sendBackError }}</p>
            <div class="flex gap-2">
              <button type="button" class="flex-1 rounded-lg border border-cream py-1.5 text-xs font-medium text-muted hover:bg-cream/40" @click="cancelSendBack">
                Cancel
              </button>
              <button type="button" class="flex-1 rounded-lg bg-error py-1.5 text-xs font-semibold text-white hover:opacity-90" @click="confirmSendBack(update.id)">
                Confirm send back
              </button>
            </div>
          </div>
          <div v-else class="flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-lg border border-error-border py-1.5 text-xs font-semibold text-error hover:bg-error-bg"
              @click="startSendBack(update.id)"
            >
              Send back
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
              @click="verify(update.id)"
            >
              Confirm
            </button>
          </div>
        </template>
      </div>

      <p v-if="!progressStore.updates.length" class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
        No progress logged yet.
      </p>
    </div>

    <AddProgressModal
      v-if="showAddModal"
      :tasks="tasksStore.tasks"
      :saving="uploading"
      :upload-error="modalUploadError"
      @close="showAddModal = false"
      @save="handleSaveProgress"
    />
  </div>
</template>