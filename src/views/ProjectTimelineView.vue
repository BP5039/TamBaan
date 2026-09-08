<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import { useProgressStore } from '@/stores/progress'
import { formatExif } from '@/utils/exif'
import AddProgressModal from '@/components/projects/AddProgressModal.vue'
import TaskModal from '@/components/projects/TaskModal.vue'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox.vue'
import CardMenu from '@/components/ui/CardMenu.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import type { ProjectTask, ProgressUpdate } from '@/types/project'
import type { PortfolioImage } from '@/types'

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

interface TimelineEntry {
  key: string
  sortAt: number
  kind: 'skeleton' | 'update'
  task?: ProjectTask
  update?: ProgressUpdate
}

// Every task shows up somewhere now — a task with zero uploads becomes a
// skeleton entry, sitting in its natural chronological spot alongside real
// update cards, rather than being invisible until someone visits a
// separate Tasks page.
const timelineEntries = computed<TimelineEntry[]>(() => {
  const skeletons: TimelineEntry[] = tasksStore.tasks
    .filter((t) => t.status === 'not_started')
    .map((t) => ({ key: `task-${t.id}`, sortAt: t.createdAt, kind: 'skeleton' as const, task: t }))

  const updates: TimelineEntry[] = progressStore.updates.map((u) => ({
    key: `update-${u.id}`,
    sortAt: u.createdAt,
    kind: 'update' as const,
    update: u,
  }))

  return [...skeletons, ...updates].sort((a, b) => a.sortAt - b.sortAt)
})

function monthLabel(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const groupedByMonth = computed(() => {
  const map = new Map<string, TimelineEntry[]>()
  for (const entry of timelineEntries.value) {
    const label = monthLabel(entry.sortAt)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(entry)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
})

const showAddModal = ref(false)
const uploadTaskId = ref('')
const uploading = ref(false)
const modalUploadError = ref('')

const showTaskModal = ref(false)
const editingTask = ref<ProjectTask | null>(null)

const sendBackTargetId = ref<string | null>(null)
const sendBackReason = ref('')
const sendBackError = ref('')

const lightboxImages = ref<PortfolioImage[] | null>(null)

async function load() {
  if (!projectsStore.currentProject || projectsStore.currentProject.id !== projectId.value) {
    await projectsStore.fetchProject(projectId.value)
  }
  await tasksStore.fetchTasks(projectId.value)
  await progressStore.fetchUpdates(projectId.value)
}

watch(projectId, load, { immediate: true })

function openUploadFor(taskId: string) {
  uploadTaskId.value = taskId
  modalUploadError.value = ''
  showAddModal.value = true
}

async function handleSaveProgress(payload: {
  taskId: string
  taskTitle: string
  files: File[]
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
        payload.files,
        payload.description,
        payload.exifTimestamp,
        payload.exifDevice,
        project.value?.name ?? '',
    )
    showAddModal.value = false
  } catch (err) {
    console.error('addUpdate failed:', err)
    modalUploadError.value = 'Upload failed. Check your connection and try again.'
  } finally {
    uploading.value = false
  }
}

function openAddTask() {
  editingTask.value = null
  showTaskModal.value = true
}

function openEditTask(task: ProjectTask) {
  editingTask.value = task
  showTaskModal.value = true
}

async function handleTaskDelete(taskId: string) {
  if (!window.confirm("Delete this task? This can't be undone.")) return
  try {
    await tasksStore.deleteTask(projectId.value, taskId)
  } catch {
    tasksStore.error = "This task can't be deleted — progress has already been logged against it."
  }
}

async function verify(updateId: string) {
  const update = progressStore.updates.find((u) => u.id === updateId)
  await progressStore.verifyUpdate(projectId.value, updateId, project.value!.contractorUid!, update?.taskTitle ?? '', project.value?.name ?? '')
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
    project.value?.name ?? '',
  )
  sendBackTargetId.value = null
}

function statusBadge(status: string) {
  if (status === 'verified') return { text: 'Verified', class: 'bg-success-bg text-success-text' }
  if (status === 'sent_back') return { text: 'Sent back', class: 'bg-error-bg text-error-text' }
  return { text: 'Awaiting review', class: 'bg-pending-bg text-pending-text' }
}

function dotColor(entry: TimelineEntry) {
  if (entry.kind === 'skeleton') return 'bg-white border-2 border-cream'
  if (entry.update?.status === 'verified') return 'bg-success'
  if (entry.update?.status === 'sent_back') return 'bg-error'
  return 'bg-pending'
}
</script>

<template>
  <div class="w-full px-[15%] py-8">
    <BaseButton variant="ghost" class="mb-4" @click="router.push(`/projects/${projectId}`)">
      ← {{ project?.name ?? 'Project' }}
    </BaseButton>

    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-ink">Timeline</h1>
        <p class="text-xs text-muted">{{ doneCount }}/{{ tasksStore.tasks.length }} tasks done</p>
      </div>
      <BaseButton v-if="isHomeowner" @click="openAddTask">+ Add task</BaseButton>
    </div>

    <AlertBanner v-if="progressStore.error" variant="error" title="Couldn't load timeline" :message="progressStore.error" class="mb-4" />
    <p v-if="progressStore.loading || tasksStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <p
      v-else-if="!timelineEntries.length"
      class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
    >
      No tasks yet.
    </p>

    <div v-else class="space-y-10">
      <div v-for="group in groupedByMonth" :key="group.label">
        <p class="mb-4 text-lg font-semibold text-ink">{{ group.label }}</p>

        <!--
          One list, responsive via breakpoint classes rather than two separate
          DOM trees — avoids duplicating the card markup for mobile vs desktop.
          Mobile: vertical stack, line runs down the left edge through the dots.
          sm and up: horizontal scroll, line runs across the top through the dots.
        -->
        <div class="relative flex flex-col gap-8 sm:flex-row sm:gap-8 sm:overflow-x-auto sm:pb-4">
          <div
            class="absolute left-[7px] top-0 bottom-0 w-0.5 bg-cream sm:left-3.5 sm:right-3.5 sm:top-[7px] sm:bottom-auto sm:h-0.5 sm:w-auto"
          />

          <div
            v-for="entry in group.items"
            :key="entry.key"
            class="relative flex gap-3 sm:w-64 sm:flex-shrink-0 sm:flex-col sm:items-center sm:gap-0"
          >
            <span
              class="z-10 mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-white sm:mt-0"
              :class="dotColor(entry)"
            />

            <div class="min-w-0 flex-1 sm:mt-2 sm:w-full">
              <!-- Skeleton: a task with no uploads yet -->
              <template v-if="entry.kind === 'skeleton' && entry.task">
                <p class="mb-2 text-[11px] font-semibold text-muted sm:text-center">Not started</p>
                <div class="relative overflow-hidden rounded-lg border border-dashed border-cream bg-white">
                  <button
                    type="button"
                    class="block aspect-[4/3] w-full overflow-hidden bg-surface"
                    @click="entry.task.referenceImages?.length ? (lightboxImages = entry.task.referenceImages) : undefined"
                  >
                    <img
                      v-if="entry.task.referenceImages?.length"
                      :src="entry.task.referenceImages[0].thumb"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center">
                      <svg class="h-6 w-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5V6.75A2.25 2.25 0 015.25 4.5h2.379a1.5 1.5 0 001.06-.44l.842-.84A1.5 1.5 0 0110.6 2.75h2.8a1.5 1.5 0 011.06.44l.842.84a1.5 1.5 0 001.06.44h2.379A2.25 2.25 0 0121 6.75v9.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11.25a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </button>

                  <div v-if="isHomeowner" class="absolute right-1.5 top-1.5">
                    <CardMenu
                      :items="[
                        { label: 'Edit', action: () => openEditTask(entry.task!) },
                        { label: 'Delete', action: () => handleTaskDelete(entry.task!.id), variant: 'danger' },
                      ]"
                    />
                  </div>

                  <div class="p-2.5">
                    <p class="mb-1 text-sm font-semibold text-ink">{{ entry.task.title }}</p>
                    <p class="mb-2 text-xs text-ink/90">{{ entry.task.description }}</p>
                    <span class="mb-2 inline-block rounded-lg bg-cream px-2 py-0.5 text-[10px] font-medium text-muted">
                      Not started
                    </span>
                    <BaseButton
                      v-if="isContractor"
                      full-width
                      class="mt-2"
                      @click="openUploadFor(entry.task.id)"
                    >
                      Upload progress
                    </BaseButton>
                  </div>
                </div>
              </template>

              <!-- Real card: a progress update that's actually been submitted -->
              <template v-else-if="entry.update">
                <p class="mb-2 text-[11px] text-muted sm:text-center">
                  {{ new Date(entry.update.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
                </p>

                <div class="overflow-hidden rounded-lg border border-cream bg-white">
                  <button
                    type="button"
                    class="block aspect-[4/3] w-full overflow-hidden bg-cream"
                    @click="lightboxImages = entry.update.images"
                  >
                    <img :src="entry.update.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                  </button>

                  <div class="p-2.5">
                    <div class="mb-1 flex items-start justify-between gap-2">
                      <p class="text-sm font-semibold text-ink">{{ entry.update.taskTitle }}</p>
                      <span class="flex-shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium" :class="statusBadge(entry.update.status).class">
                        {{ statusBadge(entry.update.status).text }}
                      </span>
                    </div>
                    <p class="mb-1 text-xs text-ink/90">{{ entry.update.description }}</p>
                    <p class="mb-2 text-[11px] text-muted">
                      {{ new Date(entry.update.createdAt).toLocaleDateString() }}
                      <span v-if="entry.update.exifTimestamp || entry.update.exifDevice">
                        · {{ formatExif({ timestamp: entry.update.exifTimestamp, device: entry.update.exifDevice }) }}
                      </span>
                    </p>

                    <p v-if="entry.update.status === 'sent_back'" class="mb-2 rounded-lg bg-error-bg p-2 text-xs text-error-text">
                      {{ entry.update.sentBackReason }}
                    </p>

                    <BaseButton
                      v-if="isContractor && entry.update.status === 'sent_back'"
                      variant="outline"
                      full-width
                      @click="openUploadFor(entry.update.taskId)"
                    >
                      Retry upload
                    </BaseButton>

                    <template v-if="isHomeowner && entry.update.status === 'pending'">
                      <div v-if="sendBackTargetId === entry.update.id" class="mt-2">
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
                          <button type="button" class="flex-1 rounded-lg bg-error py-1.5 text-xs font-semibold text-white hover:opacity-90" @click="confirmSendBack(entry.update.id)">
                            Confirm send back
                          </button>
                        </div>
                      </div>
                      <div v-else class="flex gap-2">
                        <button
                          type="button"
                          class="flex-1 rounded-lg border border-error-border py-1.5 text-xs font-semibold text-error hover:bg-error-bg"
                          @click="startSendBack(entry.update.id)"
                        >
                          Send back
                        </button>
                        <button
                          type="button"
                          class="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
                          @click="verify(entry.update.id)"
                        >
                          Confirm
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AddProgressModal
      v-if="showAddModal"
      :tasks="tasksStore.tasks"
      :initial-task-id="uploadTaskId"
      :saving="uploading"
      :upload-error="modalUploadError"
      @close="showAddModal = false"
      @save="handleSaveProgress"
    />

    <TaskModal
      v-if="showTaskModal"
      :project-id="projectId"
      :task="editingTask ?? undefined"
      :contractor-uid="project?.contractorUid ?? null"
      :project-name="project?.name ?? ''"
      @close="showTaskModal = false"
      @saved="showTaskModal = false"
    />

    <PortfolioLightbox
      v-if="lightboxImages"
      :images="lightboxImages"
      :start-index="0"
      @close="lightboxImages = null"
    />
  </div>
</template>