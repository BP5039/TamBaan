<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import { useProgressStore } from '@/stores/progress'
import { usePublicProfileStore } from '@/stores/publicProfile'
import { labelForCategory } from '@/constants/workCategories'
import { DAYS_PER_TASK } from '@/constants/projectTypes'
import { formatExif } from '@/utils/exif'
import BaseButton from '@/components/ui/BaseButton.vue'
import StarRating from '@/components/ui/StarRating.vue'
import CompleteProjectModal from '@/components/projects/CompleteProjectModal.vue'
import CreateProjectModal from '@/components/projects/CreateProjectModal.vue'
import AddProgressModal from '@/components/projects/AddProgressModal.vue'
import TaskModal from '@/components/projects/TaskModal.vue'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox.vue'
import CardMenu from '@/components/ui/CardMenu.vue'
import type { ProjectTask, ProgressUpdate, TaskStatus } from '@/types/project'
import type { PortfolioImage } from '@/types'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const progressStore = useProgressStore()
const publicProfileStore = usePublicProfileStore()

const projectId = computed(() => route.params.id as string)
const project = computed(() => projectsStore.currentProject)

const isParticipant = computed(() => {
  if (!project.value || !authStore.user) return false
  const uid = authStore.user.uid
  return (
    uid === project.value.homeownerUid ||
    uid === project.value.contractorUid ||
    uid === project.value.pendingInvitationUid
  )
})

// A completed project is meant to be browsable from the professional's
// portfolio by anyone, not just the two people who worked on it.
const canView = computed(() => isParticipant.value || project.value?.status === 'completed')

const isHomeowner = computed(() => project.value?.homeownerUid === authStore.user?.uid)
const isContractor = computed(() => project.value?.contractorUid === authStore.user?.uid)

const isPendingInvitee = computed(
  () => !!project.value?.pendingInvitationUid && project.value.pendingInvitationUid === authStore.user?.uid,
)

// Same lock the Firestore rule enforces server-side — this just controls the button's visibility.
const canEditDetails = computed(
  () => isHomeowner.value && project.value?.status === 'pending' && !project.value?.pendingInvitationUid,
)
const showEditModal = ref(false)

// One shared lightbox for every photo source on this page — project
// reference photos, task skeleton photos, and progress update photos.
const lightboxImages = ref<PortfolioImage[] | null>(null)
const lightboxStartIndex = ref(0)
function openLightbox(images: PortfolioImage[], startIndex = 0) {
  lightboxImages.value = images
  lightboxStartIndex.value = startIndex
}

interface HomeownerContact {
  phone: string
  lineId: string | null
  facebookId: string | null
}
const homeownerContact = ref<HomeownerContact | null>(null)

async function loadHomeownerContact() {
  homeownerContact.value = null
  if (!isContractor.value || !project.value) return
  try {
    const snap = await getDoc(doc(db, 'projects', project.value.id, 'private', 'contact'))
    if (snap.exists()) homeownerContact.value = snap.data() as HomeownerContact
  } catch (err) {
    console.error('loadHomeownerContact failed:', err)
  }
}

const contractorSummary = computed(() => {
  const p = publicProfileStore.profile
  if (!p) return ''
  const parts: string[] = []
  if (p.workCategories[0]) parts.push(labelForCategory(p.workCategories[0]))
  if (p.province) parts.push(p.province)
  return parts.join(' · ')
})

// Description centers when it's short, but switches to left-aligned once it
// wraps to more than one line — centered multi-line text gets ragged edges.
const descriptionEl = ref<HTMLElement | null>(null)
const descriptionWraps = ref(false)

function checkDescriptionWrap() {
  const el = descriptionEl.value
  if (!el) return
  const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight)
  descriptionWraps.value = el.scrollHeight > lineHeight * 1.4
}

onMounted(() => {
  checkDescriptionWrap()
  window.addEventListener('resize', checkDescriptionWrap)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkDescriptionWrap)
})
watch(
  () => project.value?.description,
  () => nextTick(checkDescriptionWrap),
)

const respondLoading = computed(() => projectsStore.loading)

async function respond(action: 'accept' | 'decline') {
  if (!project.value) return
  if (action === 'accept') {
    await projectsStore.acceptInvitation(project.value)
  } else {
    await projectsStore.declineInvitation(project.value)
  }
}

const allTasksDone = computed(
  () => tasksStore.tasks.length > 0 && tasksStore.tasks.every((t) => t.status === 'done'),
)

const showCompleteModal = ref(false)
const completing = ref(false)
const completeError = ref('')

async function handleComplete(payload: {
  workQuality: number
  communication: number
  timeliness: number
  comment: string
}) {
  if (!project.value) return
  completeError.value = ''
  completing.value = true
  try {
    await projectsStore.completeProject(project.value, payload)
    showCompleteModal.value = false
  } catch (err) {
    console.error('completeProject failed:', err)
    completeError.value = "Couldn't complete the project. Please try again."
  } finally {
    completing.value = false
  }
}

const statusLabel = computed(() => {
  switch (project.value?.status) {
    case 'active':
      return { text: 'Active', variant: 'success' }
    case 'completed':
      return { text: 'Completed', variant: 'success' }
    default:
      return { text: 'Pending', variant: 'pending' }
  }
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

// One shared confirm-modal state for every "this can't be undone" action on
// this page, instead of the browser's plain window.confirm().
const confirmState = ref<{ title: string; message: string; danger: boolean; run: () => void } | null>(null)
function askConfirm(title: string, message: string, danger: boolean, run: () => void) {
  confirmState.value = { title, message, danger, run }
}
function runConfirmed() {
  const run = confirmState.value?.run
  confirmState.value = null
  run?.()
}

function handleTaskDelete(taskId: string) {
  askConfirm("Delete this task?", "This can't be undone.", true, async () => {
    try {
      await tasksStore.deleteTask(projectId.value, taskId)
    } catch {
      tasksStore.error = "This task can't be deleted — progress has already been logged against it."
    }
  })
}

function verify(updateId: string) {
  askConfirm("Confirm this work?", "This can't be undone.", false, async () => {
    const update = progressStore.updates.find((u) => u.id === updateId)
    await progressStore.verifyUpdate(projectId.value, updateId, project.value!.contractorUid!, update?.taskTitle ?? '', project.value?.name ?? '')
  })
}

function startSendBack(updateId: string) {
  sendBackTargetId.value = updateId
  sendBackReason.value = ''
  sendBackError.value = ''
}

function cancelSendBack() {
  sendBackTargetId.value = null
}

function confirmSendBack(updateId: string) {
  if (!sendBackReason.value.trim()) {
    sendBackError.value = 'Explain what needs fixing.'
    return
  }
  askConfirm("Send this back to the professional?", "This can't be undone.", true, async () => {
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
  })
}

function statusBadge(status: string, createdAt?: number) {
  if (status === 'verified') return { text: 'Verified', class: 'bg-success-bg text-success-text' }
  if (status === 'sent_back') return { text: 'Sent back', class: 'bg-error-bg text-error-text' }
  const overdue = createdAt != null && now.value - createdAt >= DAY_MS
  return {
    text: overdue ? 'Awaiting review · overdue' : 'Awaiting review',
    class: 'bg-pending-bg text-pending-text',
  }
}

// Tiered by score rather than a hard red/green split — an "okay" review
// shouldn't get flagged the same way as a genuinely bad one.
function reviewScoreClass(score: number) {
  if (score >= 4) return { bg: 'bg-success-bg', text: 'text-success-text' }
  if (score >= 2.5) return { bg: 'bg-wood-bg', text: 'text-wood-text' }
  return { bg: 'bg-error-bg', text: 'text-error-text' }
}

// ---- Tasks, as a Kanban board ----

const TASK_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'not_started', label: 'Not started' },
  { status: 'awaiting_review', label: 'Awaiting review' },
  { status: 'sent_back', label: 'Sent back' },
  { status: 'done', label: 'Done' },
]

const tasksByStatus = computed(() => {
  const map: Record<TaskStatus, ProjectTask[]> = {
    not_started: [],
    awaiting_review: [],
    sent_back: [],
    done: [],
  }
  for (const t of tasksStore.tasks) map[t.status].push(t)
  return map
})

// A task's most recent update — progressStore.updates is already ordered
// newest-first, so .find() naturally gets the one matching its current status.
function latestUpdateFor(taskId: string): ProgressUpdate | undefined {
  return progressStore.updates.find((u) => u.taskId === taskId)
}

const expandedTaskId = ref<string | null>(null)
function toggleTask(taskId: string) {
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId
}

function taskCardId(taskId: string) {
  return `task-card-${taskId}`
}

// Clicking an Activity entry expands that task's card wherever it sits in
// the board, and scrolls it into view — the log and the board are two views
// onto the same data, so jumping between them should feel connected.
function jumpToTask(taskId: string) {
  expandedTaskId.value = taskId
  nextTick(() => {
    document.getElementById(taskCardId(taskId))?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  })
}

function monthLabel(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

interface ActivityEntry {
  key: string
  sortAt: number
  taskId: string
  taskTitle: string
  label: string
  dotClass: string
}

// Reconstructed from the update docs themselves rather than a separate event
// log — every update starts "uploaded" at createdAt, and if it's since been
// reviewed, a second entry captures that transition at updatedAt.
const activityEntries = computed<ActivityEntry[]>(() => {
  const entries: ActivityEntry[] = []
  for (const u of progressStore.updates) {
    entries.push({
      key: `${u.id}-uploaded`,
      sortAt: u.createdAt,
      taskId: u.taskId,
      taskTitle: u.taskTitle,
      label: 'uploaded',
      dotClass: 'bg-pending',
    })
    if (u.status === 'verified') {
      entries.push({
        key: `${u.id}-verified`,
        sortAt: u.updatedAt,
        taskId: u.taskId,
        taskTitle: u.taskTitle,
        label: 'verified',
        dotClass: 'bg-success',
      })
    } else if (u.status === 'sent_back') {
      entries.push({
        key: `${u.id}-sent_back`,
        sortAt: u.updatedAt,
        taskId: u.taskId,
        taskTitle: u.taskTitle,
        label: 'sent back',
        dotClass: 'bg-error',
      })
    }
  }
  return entries.sort((a, b) => a.sortAt - b.sortAt)
})

type ActivityRowItem =
  | { type: 'divider'; key: string; label: string }
  | { type: 'entry'; key: string; entry: ActivityEntry }

const activityRow = computed<ActivityRowItem[]>(() => {
  const items: ActivityRowItem[] = []
  let lastMonth = ''
  for (const entry of activityEntries.value) {
    const label = monthLabel(entry.sortAt)
    if (label !== lastMonth) {
      items.push({ type: 'divider', key: `divider-${label}`, label })
      lastMonth = label
    }
    items.push({ type: 'entry', key: entry.key, entry })
  }
  return items
})

// ---- Load everything this page needs ----

function load() {
  projectsStore.subscribeToProject(projectId.value)
  tasksStore.subscribeToTasks(projectId.value)
  progressStore.subscribeToUpdates(projectId.value)
}

watch(projectId, load, { immediate: true })

// Homeowner contact and the contractor's public profile depend on who the
// contractor actually is, which only becomes known once the live project
// snapshot arrives — so these re-run whenever that changes, rather than
// living inside load() itself.
watch(
  () => project.value?.contractorUid,
  async (contractorUid) => {
    if (!contractorUid) {
      homeownerContact.value = null
      return
    }
    await loadHomeownerContact()
    if (project.value?.contractorUsername) {
      await publicProfileStore.loadByUsername(project.value.contractorUsername)
    }
  },
  { immediate: true },
)

// Drives the invite countdown display, the "overdue" review badge, and the
// delayed-project tag. Also the clock that triggers the two lazy, no-backend
// checks below — they only ever run when the right person happens to be
// viewing the page, since there's no scheduler to run them in the background.
const now = ref(Date.now())
const DAY_MS = 24 * 60 * 60 * 1000
let clockInterval: ReturnType<typeof setInterval> | null = null

async function checkInvitationExpiry() {
  if (!isHomeowner.value || !project.value?.pendingInvitationUid || !project.value.invitationExpiresAt) return
  if (now.value >= project.value.invitationExpiresAt) {
    await projectsStore.expireInvitation(project.value)
  }
}

async function checkStalledReviews() {
  if (!isHomeowner.value || !project.value) return
  for (const u of progressStore.updates) {
    if (u.status !== 'pending') continue
    const since = u.lastReminderAt ?? u.createdAt
    if (now.value - since >= DAY_MS) {
      // eslint-disable-next-line no-await-in-loop
      await progressStore.sendStalledReminder(projectId.value, u.id, u.taskTitle, project.value.homeownerUid, project.value.name)
    }
  }
}

function tick() {
  now.value = Date.now()
  checkInvitationExpiry()
  checkStalledReviews()
}

onMounted(() => {
  tick()
  clockInterval = setInterval(tick, 60_000)
})

// Delayed once the deadline has actually passed with work still outstanding —
// the harder of the two warnings, so it takes priority over "at risk" below.
const isDelayed = computed(() => {
  if (!project.value || project.value.status !== 'active') return false
  return new Date(project.value.plannedEndDate).getTime() < now.value && !allTasksDone.value
})

// Softer, earlier warning: given the remaining tasks and this project's scope
// (a "Quick fix" paces faster than a "New build" even at the same task
// count), is there realistically enough runway left before the deadline?
// Never fires once isDelayed already has — that's the harder signal.
const isAtRisk = computed(() => {
  if (!project.value || project.value.status !== 'active' || isDelayed.value || allTasksDone.value) return false
  const remainingTasks = tasksStore.tasks.filter((t) => t.status !== 'done').length
  if (remainingTasks === 0) return false
  const expectedDaysNeeded = remainingTasks * DAYS_PER_TASK[project.value.projectType]
  const daysRemaining = (new Date(project.value.plannedEndDate).getTime() - now.value) / DAY_MS
  return daysRemaining > 0 && expectedDaysNeeded > daysRemaining
})

function formatCountdown(expiresAt: number | null): string {
  if (!expiresAt) return ''
  const diff = expiresAt - now.value
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / DAY_MS)
  const hours = Math.floor((diff % DAY_MS) / (60 * 60 * 1000))
  return `Expires in ${days}d ${hours}h`
}

onUnmounted(() => {
  projectsStore.unsubscribeFromProject()
  tasksStore.unsubscribeFromTasks()
  progressStore.unsubscribeFromUpdates()
  if (clockInterval) clearInterval(clockInterval)
})
</script>

<template>
  <div class="w-full px-[15%] py-8">
    <BaseButton variant="ghost" class="mb-4" @click="router.back()">
      ← Back
    </BaseButton>

    <p v-if="projectsStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <p
      v-else-if="!project || !canView"
      class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
    >
      This project doesn't exist, or you don't have access to it.
    </p>

    <template v-else>
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-ink">{{ project.name }}</h1>
        <div class="flex items-center gap-2">
          <button
            v-if="canEditDetails"
            type="button"
            class="text-xs font-medium text-primary underline"
            @click="showEditModal = true"
          >
            Edit
          </button>
          <span
            class="rounded-lg px-2.5 py-1 text-xs font-medium"
            :class="
              statusLabel.variant === 'success'
                ? 'bg-success-bg text-success-text'
                : 'bg-pending-bg text-pending-text'
            "
          >
            {{ statusLabel.text }}
          </span>
          <span v-if="isDelayed" class="rounded-lg bg-error-bg px-2.5 py-1 text-xs font-medium text-error-text">
            Delayed
          </span>
          <span v-else-if="isAtRisk" class="rounded-lg border border-dashed border-muted px-2.5 py-1 text-xs font-medium text-muted">
            At risk
          </span>
        </div>
      </div>

      <div class="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- Column 1: Project info -->
        <div class="h-full rounded-card border border-cream bg-white p-4 text-center">
          <div class="relative mx-auto mb-2.5 h-12 w-12">
            <button
              v-if="project.referenceImages?.length"
              type="button"
              class="h-12 w-12 overflow-hidden rounded-full bg-cream"
              @click="openLightbox(project.referenceImages, 0)"
            >
              <img :src="project.referenceImages[0].thumb" alt="" class="h-full w-full object-cover" />
            </button>
            <div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-cream">
              <svg class="h-5 w-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-1.519-3.75L12 12l1.519 1.5m0 0L15 15l-1.481-1.5" />
              </svg>
            </div>
            <span
              v-if="project.referenceImages && project.referenceImages.length > 1"
              class="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white bg-ink px-1 text-[9px] font-semibold text-white"
            >
              {{ project.referenceImages.length }}
            </span>
          </div>

          <p class="text-sm font-semibold text-ink">{{ project.name }}</p>
          <p
            v-if="project.description"
            ref="descriptionEl"
            class="mb-2 mt-1 text-xs text-ink/90"
            :class="descriptionWraps ? 'text-left' : 'text-center'"
          >
            {{ project.description }}
          </p>
          <p class="mb-1 text-xs text-muted">
            Planned: {{ project.plannedStartDate }} → {{ project.plannedEndDate }}
          </p>
          <p class="text-xs text-ink">
            Homeowner:
            <router-link
              v-if="project.homeownerUsername"
              :to="`/discover/${project.homeownerUsername}`"
              class="font-medium text-primary underline"
            >
              {{ project.homeownerName }}
            </router-link>
            <span v-else class="font-medium">{{ project.homeownerName }}</span>
          </p>
        </div>

        <!-- Column 2: Professional info — whatever the current contractor relationship is -->
        <div class="h-full">
          <div v-if="project.contractorUid" class="h-full rounded-card border border-cream bg-white p-4 text-center">
            <div class="mx-auto mb-2.5 h-12 w-12 overflow-hidden rounded-full bg-cream">
              <img
                v-if="publicProfileStore.profile?.photoURL"
                :src="publicProfileStore.profile.photoURL"
                alt=""
                class="h-full w-full object-cover"
              />
            </div>
            <router-link
              v-if="project.contractorUsername"
              :to="`/discover/${project.contractorUsername}`"
              class="text-sm font-medium text-ink hover:underline"
            >
              {{ project.contractorName }}
            </router-link>
            <p v-else class="text-sm font-medium text-ink">{{ project.contractorName }}</p>
            <StarRating
              v-if="publicProfileStore.profile"
              :rating="publicProfileStore.profile.rating ?? null"
              :count="publicProfileStore.profile.ratingCount ?? 0"
              class="mt-1 justify-center"
            />
            <p v-if="contractorSummary" class="mt-2 text-[11px] text-muted">{{ contractorSummary }}</p>
            <router-link
              v-if="project.contractorUsername"
              :to="`/discover/${project.contractorUsername}`"
              class="mt-3 block text-xs font-semibold text-primary underline"
            >
              View full profile
            </router-link>
          </div>

          <div
            v-else-if="isPendingInvitee"
            class="h-full rounded-card border border-pending-border bg-pending-bg p-4"
          >
            <p class="mb-1 text-xs text-pending-text">
              {{ project.homeownerName }} invited you to this project
            </p>
            <p v-if="project.invitationExpiresAt" class="mb-3 text-[11px] font-semibold text-pending-text">
              {{ formatCountdown(project.invitationExpiresAt) }}
            </p>
            <div class="flex gap-2">
              <BaseButton variant="outline" :disabled="respondLoading" @click="respond('decline')">
                Decline
              </BaseButton>
              <BaseButton variant="primary" :disabled="respondLoading" @click="respond('accept')">
                Accept
              </BaseButton>
            </div>
          </div>

          <div
            v-else-if="project.pendingInvitationUid"
            class="h-full rounded-card border border-pending-border bg-pending-bg p-4"
          >
            <p class="mb-1 text-xs text-pending-text">
              Invitation sent to {{ project.pendingInvitationName }} — waiting for their response
            </p>
            <p v-if="project.invitationExpiresAt" class="text-[11px] font-semibold text-pending-text">
              {{ formatCountdown(project.invitationExpiresAt) }}
            </p>
          </div>

          <div v-else-if="isHomeowner" class="h-full rounded-card border border-dashed border-cream p-4">
            <p class="text-xs text-muted">
              No contractor invited yet. Visit a professional's profile from
              <router-link to="/discover" class="font-medium text-primary underline">Find professionals</router-link>
              to invite them to this project.
            </p>
          </div>
        </div>

        <!-- Column 3: Mark complete / Review -->
        <div
          v-if="isHomeowner && project.status === 'active'"
          class="h-full rounded-card border border-cream bg-white p-4 text-center"
        >
          <div class="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
            <svg class="h-5 w-5 text-success-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p class="mb-1.5 text-sm font-semibold text-ink">Mark complete</p>
          <p class="mb-3 text-left text-xs text-muted">
            {{
              allTasksDone
                ? "All tasks are done. Rate the work and close out this project."
                : "Finish and verify every task before completing this project."
            }}
          </p>
          <BaseButton full-width :disabled="!allTasksDone" @click="showCompleteModal = true">
            Complete project
          </BaseButton>
        </div>

        <div v-else-if="project.status === 'completed' && project.review" class="h-full rounded-card border border-cream bg-white p-4 text-center">
          <div
            class="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full"
            :class="reviewScoreClass(project.review.overall).bg"
          >
            <span class="text-sm font-bold" :class="reviewScoreClass(project.review.overall).text">{{ project.review.overall.toFixed(1) }}</span>
          </div>
          <p class="mb-2 text-sm font-semibold text-ink">Review</p>
          <div class="text-left text-xs text-ink">
            <div class="mb-1 flex items-center justify-between">
              <span>Work quality</span>
              <StarRating :rating="project.review.workQuality" :count="0" />
            </div>
            <div class="mb-1 flex items-center justify-between">
              <span>Communication</span>
              <StarRating :rating="project.review.communication" :count="0" />
            </div>
            <div class="mb-2 flex items-center justify-between">
              <span>Timeliness</span>
              <StarRating :rating="project.review.timeliness" :count="0" />
            </div>
            <p v-if="project.review.comment" class="text-xs italic text-muted">{{ project.review.comment }}</p>
          </div>
        </div>

        <!-- Ghosted preview — anyone viewing a still-pending project (homeowner or
             the professional deciding on an invite) sees what this slot becomes. -->
        <div
          v-else-if="project.status === 'pending'"
          class="h-full rounded-card border border-dashed border-cream bg-surface p-4 text-center opacity-70"
        >
          <div class="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-cream">
            <svg class="h-5 w-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p class="mb-1.5 text-sm font-semibold text-muted">Mark complete</p>
          <p class="text-xs text-muted">Available once a professional is on board and every task is done.</p>
        </div>

        <!-- Informational — the contractor's own view of an active project. Only
             the homeowner marks completion, so this just tells them where things stand. -->
        <div
          v-else-if="isContractor && project.status === 'active'"
          class="h-full rounded-card border border-cream bg-white p-4 text-center"
        >
          <div class="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-pending-bg">
            <svg class="h-5 w-5 text-pending-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2M12 21a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
          </div>
          <p class="mb-1.5 text-sm font-semibold text-ink">Completion</p>
          <p class="text-xs text-muted">The homeowner will mark this complete once every task is verified.</p>
        </div>
      </div>

      <div v-if="isContractor && homeownerContact" class="mb-12 rounded-card border border-cream bg-white p-4">
        <p class="mb-2 text-sm font-semibold text-ink">Homeowner contact</p>
        <p class="text-sm text-ink">{{ homeownerContact.phone }}</p>
        <p v-if="homeownerContact.lineId" class="text-xs text-ink">LINE: {{ homeownerContact.lineId }}</p>
        <p v-if="homeownerContact.facebookId" class="text-xs text-ink">FB: {{ homeownerContact.facebookId }}</p>
      </div>

      <!-- Tasks, as a Kanban board — collapsed rows expand on click. -->
      <template v-if="project.status !== 'pending'">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-ink">Tasks</h2>
        <BaseButton v-if="isHomeowner" @click="openAddTask">+ Add task</BaseButton>
      </div>

      <p
        v-if="!tasksStore.tasks.length"
        class="mb-12 rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
      >
        No tasks yet.
      </p>

      <div v-else class="mb-12 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0">
        <div v-for="column in TASK_COLUMNS" :key="column.status" class="w-full flex-shrink-0 snap-center sm:w-auto">
          <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {{ column.label }} · {{ tasksByStatus[column.status].length }}
          </p>

          <div class="space-y-2">
            <div
              v-for="task in tasksByStatus[column.status]"
              :id="taskCardId(task.id)"
              :key="task.id"
              class="overflow-hidden rounded-lg border bg-white"
              :class="column.status === 'not_started' ? 'border-dashed border-cream' : 'border-cream'"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 p-2.5 text-left"
                @click="toggleTask(task.id)"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-ink">{{ task.title }}</span>
                  <span
                    v-if="task.status === 'awaiting_review' && latestUpdateFor(task.id)"
                    class="mt-1 inline-block rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
                    :class="statusBadge(task.status, latestUpdateFor(task.id)!.createdAt).class"
                  >
                    {{ statusBadge(task.status, latestUpdateFor(task.id)!.createdAt).text }}
                  </span>
                </span>
                <svg
                  class="h-3.5 w-3.5 flex-shrink-0 text-muted transition-transform"
                  :class="{ 'rotate-180': expandedTaskId === task.id }"
                  viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5L10 12.5L15 7.5" />
                </svg>
              </button>

              <div v-if="expandedTaskId === task.id" class="border-t border-cream p-2.5">
                <template v-if="task.status === 'not_started'">
                  <div class="relative mb-2">
                    <button
                      type="button"
                      class="block aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface"
                      @click="task.referenceImages?.length ? openLightbox(task.referenceImages) : undefined"
                    >
                      <img
                        v-if="task.referenceImages?.length"
                        :src="task.referenceImages[0].thumb"
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
                          { label: 'Edit', action: () => openEditTask(task) },
                          { label: 'Delete', action: () => handleTaskDelete(task.id), variant: 'danger' },
                        ]"
                      />
                    </div>
                  </div>
                  <p class="mb-2 text-xs text-ink/90">{{ task.description }}</p>
                  <BaseButton v-if="isContractor" full-width @click="openUploadFor(task.id)">
                    Upload progress
                  </BaseButton>
                </template>

                <template v-else-if="task.status === 'awaiting_review' && latestUpdateFor(task.id)">
                  <button
                    type="button"
                    class="mb-2 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream"
                    @click="openLightbox(latestUpdateFor(task.id)!.images)"
                  >
                    <img :src="latestUpdateFor(task.id)!.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                  </button>
                  <p class="mb-1 text-xs text-ink/90">{{ latestUpdateFor(task.id)!.description }}</p>
                  <p class="mb-2 text-[11px] text-muted">
                    {{ new Date(latestUpdateFor(task.id)!.createdAt).toLocaleDateString() }}
                    <span v-if="latestUpdateFor(task.id)!.exifTimestamp || latestUpdateFor(task.id)!.exifDevice">
                      · {{ formatExif({ timestamp: latestUpdateFor(task.id)!.exifTimestamp, device: latestUpdateFor(task.id)!.exifDevice }) }}
                    </span>
                  </p>

                  <template v-if="isHomeowner">
                    <div v-if="sendBackTargetId === latestUpdateFor(task.id)!.id" class="mt-2">
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
                        <button type="button" class="flex-1 rounded-lg bg-error py-1.5 text-xs font-semibold text-white hover:opacity-90" @click="confirmSendBack(latestUpdateFor(task.id)!.id)">
                          Confirm send back
                        </button>
                      </div>
                    </div>
                    <div v-else class="flex gap-2">
                      <button
                        type="button"
                        class="flex-1 rounded-lg border border-error-border py-1.5 text-xs font-semibold text-error hover:bg-error-bg"
                        @click="startSendBack(latestUpdateFor(task.id)!.id)"
                      >
                        Send back
                      </button>
                      <button
                        type="button"
                        class="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
                        @click="verify(latestUpdateFor(task.id)!.id)"
                      >
                        Confirm
                      </button>
                    </div>
                  </template>
                </template>

                <template v-else-if="task.status === 'sent_back' && latestUpdateFor(task.id)">
                  <button
                    type="button"
                    class="mb-2 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream"
                    @click="openLightbox(latestUpdateFor(task.id)!.images)"
                  >
                    <img :src="latestUpdateFor(task.id)!.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                  </button>
                  <p class="mb-2 rounded-lg bg-error-bg p-2 text-xs text-error-text">
                    {{ latestUpdateFor(task.id)!.sentBackReason }}
                  </p>
                  <BaseButton v-if="isContractor" variant="outline" full-width @click="openUploadFor(task.id)">
                    Retry upload
                  </BaseButton>
                </template>

                <template v-else-if="task.status === 'done' && latestUpdateFor(task.id)">
                  <button
                    type="button"
                    class="mb-2 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream"
                    @click="openLightbox(latestUpdateFor(task.id)!.images)"
                  >
                    <img :src="latestUpdateFor(task.id)!.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                  </button>
                  <p class="text-xs text-ink/90">{{ latestUpdateFor(task.id)!.description }}</p>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
      </template>

      <!-- Activity — a lightweight log, not the interactive surface. Same
           continuous-line visual flow as the old Timeline, but compact
           entries instead of big cards; clicking one expands the task above. -->
      <template v-if="project.status !== 'pending'">
      <h2 class="mb-6 text-lg font-semibold text-ink">Activity</h2>

      <p
        v-if="!activityRow.length"
        class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
      >
        No activity yet.
      </p>

      <div v-else class="sm:overflow-x-auto sm:pb-4">
        <div class="relative flex flex-col gap-6 sm:flex-row sm:w-max sm:items-start sm:gap-6">
        <div
          class="absolute left-[7px] top-0 bottom-0 w-0.5 bg-cream sm:left-3.5 sm:right-3.5 sm:top-[7px] sm:bottom-auto sm:h-0.5 sm:w-auto"
        />

        <template v-for="item in activityRow" :key="item.key">
          <div v-if="item.type === 'divider'" class="relative z-10 flex-shrink-0 sm:flex sm:h-3.5 sm:items-center">
            <span class="inline-block whitespace-nowrap rounded-full border border-cream bg-white px-3 py-1 text-xs font-semibold text-wood-text">
              {{ item.label }}
            </span>
          </div>

          <button
            v-else
            type="button"
            class="relative flex gap-3 text-left sm:w-32 sm:flex-shrink-0 sm:flex-col sm:items-center sm:gap-0"
            @click="jumpToTask(item.entry.taskId)"
          >
            <span
              class="z-10 mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-white sm:mt-0"
              :class="item.entry.dotClass"
            />
            <div class="min-w-0 flex-1 sm:mt-2 sm:w-full sm:text-center">
              <p class="text-[10px] text-muted">
                {{ new Date(item.entry.sortAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
              </p>
              <p class="truncate text-xs font-medium text-ink">{{ item.entry.taskTitle }}</p>
              <p class="text-[10px] text-muted">{{ item.entry.label }}</p>
            </div>
          </button>
        </template>
        </div>
      </div>
      </template>

    </template>

    <CompleteProjectModal
      v-if="showCompleteModal"
      :saving="completing"
      :error="completeError"
      @close="showCompleteModal = false"
      @save="handleComplete"
    />

    <CreateProjectModal
      v-if="showEditModal && project"
      :project="project"
      @close="showEditModal = false"
      @saved="showEditModal = false"
    />

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

    <ConfirmDialog
      v-if="confirmState"
      :title="confirmState.title"
      :message="confirmState.message"
      :danger="confirmState.danger"
      @cancel="confirmState = null"
      @confirm="runConfirmed"
    />

    <PortfolioLightbox
      v-if="lightboxImages"
      :images="lightboxImages"
      :start-index="lightboxStartIndex"
      @close="lightboxImages = null"
    />
  </div>
</template>