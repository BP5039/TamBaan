<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import { useProgressStore } from '@/stores/progress'
import { usePublicProfileStore } from '@/stores/publicProfile'
import { useNotificationsStore } from '@/stores/notifications'
import { labelForCategory } from '@/constants/workCategories'
import { formatExif } from '@/utils/exif'
import { formatDateRange } from '@/utils/dateFormat'
import BaseButton from '@/components/ui/BaseButton.vue'
import StarRating from '@/components/ui/StarRating.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import ImageCountBadge from '@/components/ui/ImageCountBadge.vue'
import CompleteProjectModal from '@/components/projects/CompleteProjectModal.vue'
import CreateProjectModal from '@/components/projects/CreateProjectModal.vue'
import AddProgressModal from '@/components/projects/AddProgressModal.vue'
import TaskModal from '@/components/projects/TaskModal.vue'
import SnapshotModal from '@/components/projects/SnapshotModal.vue'
import KanbanColumn from '@/components/projects/KanbanColumn.vue'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox.vue'
import CardMenu from '@/components/ui/CardMenu.vue'
import type { ProjectTask, ProgressUpdate, TaskStatus, SnapshotTaskState } from '@/types/project'
import { snapshotAt } from '@/utils/snapshot'
import { buildGalleryAlbums, type GalleryPhoto, type GalleryAlbum } from '@/utils/gallery'
import { getScheduleWarning } from '@/utils/scheduleWarnings'
import type { PortfolioImage, UserProfile } from '@/types'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const progressStore = useProgressStore()
const publicProfileStore = usePublicProfileStore()
const notificationsStore = useNotificationsStore()

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

// Left-rail tab the right panel is currently showing.
const activeTab = ref<'tasks' | 'activity' | 'gallery'>('tasks')

// The contractor's photo comes from publicProfileStore (loaded by username
// below), but nothing fetched the homeowner's — so their avatar never had a
// photo to show, only initials. One lightweight fetch, independent of that
// store (which is already committed to holding the contractor's profile).
const homeownerPhotoURL = ref<string | null>(null)
watch(
  () => project.value?.homeownerUid,
  async (uid) => {
    homeownerPhotoURL.value = null
    if (!uid) return
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      homeownerPhotoURL.value = (snap.data() as UserProfile | undefined)?.photoURL ?? null
    } catch {
      homeownerPhotoURL.value = null
    }
  },
  { immediate: true },
)

const contractorSummary = computed(() => {
  const p = publicProfileStore.profile
  if (!p) return ''
  const parts: string[] = []
  if (p.workCategories[0]) parts.push(labelForCategory(p.workCategories[0]))
  if (p.province) parts.push(p.province)
  return parts.join(' · ')
})


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
      // Same wording as the My Projects card (ProjectCard.vue) — a project
      // doesn't stay un-contextually "Pending" on one surface and
      // contextual on the other.
      return {
        text: project.value?.pendingInvitationUid ? 'Pending approval' : 'Awaiting invite',
        variant: 'pending',
      }
  }
})

const dateRange = computed(() =>
  project.value?.plannedStartDate && project.value?.plannedEndDate
    ? formatDateRange(project.value.plannedStartDate, project.value.plannedEndDate)
    : '',
)

const showAddModal = ref(false)
const uploadTaskId = ref('')
const uploading = ref(false)
const modalUploadError = ref('')

const showTaskModal = ref(false)
const editingTask = ref<ProjectTask | null>(null)
const taskActionError = ref('')

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
  taskActionError.value = ''
  askConfirm("Delete this task?", "This can't be undone.", true, async () => {
    try {
      await tasksStore.deleteTask(projectId.value, taskId)
    } catch {
      taskActionError.value = "This task can't be deleted — progress has already been logged against it."
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

// Clicking an Activity entry opens the Snapshot modal — the full board
// exactly as it stood at that entry's moment, with that entry's task
// expanded by default. This replaces the old "jump to the live task card"
// behavior, which only showed today's state, not the moment being clicked on.
const showSnapshot = ref(false)
const snapshotHighlightId = ref('')
const snapshotEntryLabel = ref('')
const snapshotTimestamp = ref(0)
const snapshotTasks = computed(() => snapshotAtNow(snapshotTimestamp.value))

function openSnapshot(entry: ActivityEntry) {
  snapshotHighlightId.value = entry.taskId
  snapshotEntryLabel.value = `${entry.taskTitle} — ${entry.label}`
  snapshotTimestamp.value = entry.sortAt
  showSnapshot.value = true
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
  // Left-edge accent color, as a border-* class — kept as one string so the
  // legend swatches and the node's accent bar read from the same source.
  dotClass: string
  thumbUrl?: string
  imageCount?: number
}

// Reconstructed from the task and update docs themselves rather than a
// separate event log — a task's own creation is its first entry, then every
// update starts "uploaded" at createdAt, and if it's since been reviewed, a
// second entry captures that transition at updatedAt. Uploaded/sent-back/
// verified entries carry the update's own first image + count, since a task
// being "created" never has a photo of its own yet.
const activityEntries = computed<ActivityEntry[]>(() => {
  const entries: ActivityEntry[] = []
  for (const t of tasksStore.tasks) {
    entries.push({
      key: `${t.id}-created`,
      sortAt: t.createdAt,
      taskId: t.id,
      taskTitle: t.title,
      label: 'created',
      dotClass: 'border-muted',
    })
  }
  for (const u of progressStore.updates) {
    const thumbUrl = u.images[0]?.thumb
    const imageCount = u.images.length
    entries.push({
      key: `${u.id}-uploaded`,
      sortAt: u.createdAt,
      taskId: u.taskId,
      taskTitle: u.taskTitle,
      label: 'uploaded',
      dotClass: 'border-pending',
      thumbUrl,
      imageCount,
    })
    if (u.status === 'verified') {
      entries.push({
        key: `${u.id}-verified`,
        sortAt: u.updatedAt,
        taskId: u.taskId,
        taskTitle: u.taskTitle,
        label: 'verified',
        dotClass: 'border-success',
        thumbUrl,
        imageCount,
      })
    } else if (u.status === 'sent_back') {
      entries.push({
        key: `${u.id}-sent_back`,
        sortAt: u.updatedAt,
        taskId: u.taskId,
        taskTitle: u.taskTitle,
        label: 'sent back',
        dotClass: 'border-error',
        thumbUrl,
        imageCount,
      })
    }
  }
  return entries.sort((a, b) => a.sortAt - b.sortAt)
})

// '' means "All tasks" — the filter only narrows what's shown in the log
// itself; the Snapshot modal always shows the full board regardless.
const activityTaskFilter = ref('')
const filteredActivityEntries = computed(() =>
  activityTaskFilter.value
    ? activityEntries.value.filter((e) => e.taskId === activityTaskFilter.value)
    : activityEntries.value,
)

// ---- Activity, laid out as a connected node path ----
//
// Entries snake three to a row — left-to-right, then right-to-left, and so
// on — each row's three columns at grid columns 1, 3, 5 (2 and 4 are the
// connector tracks). Built from whatever `filteredActivityEntries` actually
// contains, so a short project naturally gets a short, correctly-terminated
// path instead of a fixed template with empty cells or a dangling line.
interface ActivityNodePos {
  entry: ActivityEntry
  col: number
  row: number
}
interface ActivityConnector {
  key: string
  col: number
  row: number
  kind: 'h' | 'v'
}
interface ActivityMonthPill {
  key: string
  col: number
  row: number
  label: string
}

// Left-edge accent class per status, as full literal strings — not built
// with `.replace()` on dotClass. Tailwind's JIT scanner only generates CSS
// for class names that appear verbatim somewhere in the source; a string
// built at runtime (`dotClass.replace('border-', 'border-l-')`) never
// appears as literal text anywhere, so most of those colors silently never
// got a stylesheet rule. This map's keys are exactly the dotClass values,
// and its values are literal enough for Tailwind to see.
const LEFT_ACCENT_CLASS: Record<string, string> = {
  'border-muted': 'border-l-muted',
  'border-pending': 'border-l-pending',
  'border-error': 'border-l-error',
  'border-success': 'border-l-success',
}

// Row 1 of the grid is reserved for the leading month pill; node rows sit
// at 2, 4, 6…, with a dedicated connector row between each pair (3, 5, 7…).
const activityPath = computed(() => {
  const entries = filteredActivityEntries.value
  if (!entries.length) return { positions: [], connectors: [], pills: [], gridTemplateRows: '' }

  const positions: ActivityNodePos[] = entries.map((entry, idx) => {
    const rowIdx = Math.floor(idx / 3)
    const posInRow = idx % 3
    const leftToRight = rowIdx % 2 === 0
    const col = (leftToRight ? [1, 3, 5] : [5, 3, 1])[posInRow]
    return { entry, col, row: rowIdx * 2 + 2 }
  })

  const connectors: ActivityConnector[] = []
  const pills: ActivityMonthPill[] = []

  // Horizontal connectors within a row never carry a pill — a month change
  // that happens to fall mid-row is picked up by the next row-turn instead,
  // so a pill is never squeezed into the narrow connector track between two
  // nodes (the cause of the overlapping, "odd" placement).
  for (let i = 0; i < positions.length - 1; i++) {
    const a = positions[i]
    const b = positions[i + 1]
    if (a.row === b.row) {
      connectors.push({ key: `h-${a.entry.key}`, col: (a.col + b.col) / 2, row: a.row, kind: 'h' })
    }
  }

  // Row-turn connectors — each gets its own full-width row, so a pill here
  // always has room. Every row before the last is always exactly 3 entries
  // (only the final row can be shorter), so its last position is always at
  // the outer edge column (1 or 5) — exactly where the next row starts too.
  const rowCount = Math.ceil(entries.length / 3)
  for (let r = 0; r < rowCount - 1; r++) {
    const lastOfRow = positions[r * 3 + 2]
    const nextFirst = positions[(r + 1) * 3]
    const turnRow = lastOfRow.row + 1
    connectors.push({ key: `v-row-${r}`, col: lastOfRow.col, row: turnRow, kind: 'v' })
    const thisMonth = monthLabel(positions[r * 3].entry.sortAt)
    const nextMonth = monthLabel(nextFirst.entry.sortAt)
    if (thisMonth !== nextMonth) {
      pills.push({ key: `m-row-${r}`, col: lastOfRow.col, row: turnRow, label: nextMonth })
    }
  }

  // The leading pill — there's no earlier row to diff against, so the
  // project's first month always gets one, instead of never showing at all.
  pills.push({ key: 'm-start', col: 3, row: 1, label: monthLabel(entries[0].sortAt) })

  const rowSizes: string[] = ['34px']
  for (let i = 0; i < rowCount; i++) {
    rowSizes.push('minmax(78px, auto)')
    if (i < rowCount - 1) rowSizes.push('34px')
  }

  return { positions, connectors, pills, gridTemplateRows: rowSizes.join(' ') }
})

// ---- Snapshot: full board state (status + the specific update that was
//      live) as of any past moment — powers the "git history" view when an
//      Activity entry is clicked. ----

function snapshotAtNow(timestamp: number): SnapshotTaskState[] {
  return snapshotAt(tasksStore.tasks, progressStore.updates, timestamp)
}

// ---- Gallery: every photo across the project, flattened ----

// Reference photos have no per-image timestamp of their own, so each one
// borrows its parent doc's createdAt as a reasonable stand-in for sorting.
const galleryReferencePhotos = computed<GalleryPhoto[]>(() => {
  const photos: GalleryPhoto[] = []
  if (project.value) {
    for (const img of project.value.referenceImages ?? []) {
      photos.push({
        thumb: img.thumb,
        full: img.full,
        taskId: null,
        sourceLabel: 'Project reference photos',
        sortAt: project.value.createdAt,
      })
    }
  }
  for (const t of tasksStore.tasks) {
    for (const img of t.referenceImages ?? []) {
      photos.push({
        thumb: img.thumb,
        full: img.full,
        taskId: t.id,
        sourceLabel: t.title,
        sortAt: t.createdAt,
      })
    }
  }
  return photos
})

// Each update's own createdAt is the real moment that photo was added —
// no proxy timestamp needed here, unlike the reference photos above.
const galleryProgressPhotos = computed<GalleryPhoto[]>(() => {
  const photos: GalleryPhoto[] = []
  for (const u of progressStore.updates) {
    for (const img of u.images) {
      photos.push({
        thumb: img.thumb,
        full: img.full,
        taskId: u.taskId,
        sourceLabel: u.taskTitle,
        sortAt: u.createdAt,
      })
    }
  }
  return photos
})

const galleryPhotos = computed<GalleryPhoto[]>(() => [
  ...galleryReferencePhotos.value,
  ...galleryProgressPhotos.value,
])

// '' = flat "All images", 'byTask' = grouped albums (one per task + one for
// project reference photos). Narrowing to a single task is gone — grouping
// covers that case better.
const galleryFilter = ref<'' | 'byTask'>('')

const gallerySort = ref<'newest' | 'oldest'>('newest')
const sortedGalleryPhotos = computed(() => {
  const sorted = [...galleryPhotos.value].sort((a, b) => a.sortAt - b.sortAt)
  return gallerySort.value === 'newest' ? sorted.reverse() : sorted
})

const galleryAlbums = computed<GalleryAlbum[]>(() => buildGalleryAlbums(galleryPhotos.value, gallerySort.value))

// ---- Load everything this page needs ----

function load() {
  projectsStore.subscribeToProject(projectId.value)
  tasksStore.subscribeToTasks(projectId.value)
  progressStore.subscribeToUpdates(projectId.value)
}

watch(projectId, load, { immediate: true })

// The contractor's public profile depends on who the contractor actually is,
// which only becomes known once the live project snapshot arrives — so this
// re-runs whenever that changes, rather than living inside load() itself.
watch(
  () => project.value?.contractorUsername,
  async (contractorUsername) => {
    if (contractorUsername) {
      await publicProfileStore.loadByUsername(contractorUsername)
    }
  },
  { immediate: true },
)

// Opening a project marks it "read" for whoever's viewing it — only once we
// know both which project this is and which role the viewer has.
watch(
  () => project.value?.id,
  (id) => {
    if (!id) return
    if (isHomeowner.value) projectsStore.clearUnreadCount(id, 'homeowner')
    else if (isContractor.value) projectsStore.clearUnreadCount(id, 'contractor')
    notificationsStore.markAllAsReadForProject(id)
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

const scheduleWarning = computed(() => getScheduleWarning(project.value, tasksStore.tasks, now.value))
const isDelayed = computed(() => scheduleWarning.value === 'delayed')
const isAtRisk = computed(() => scheduleWarning.value === 'at_risk')

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
  <div class="flex h-full flex-col sm:overflow-hidden">
    <div class="flex w-full flex-1 flex-col px-4 py-8 sm:overflow-hidden sm:px-[15%]">
    <BaseButton variant="ghost" class="mb-4 flex-shrink-0 self-start" @click="router.back()">
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
      <div class="mb-6 flex flex-shrink-0 items-center justify-between">
        <div class="flex items-center gap-1.5">
          <h1 class="text-xl font-semibold text-ink">{{ project.name }}</h1>
          <button
            v-if="canEditDetails"
            type="button"
            title="Edit project"
            aria-label="Edit project"
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-cream/60 hover:text-ink"
            @click="showEditModal = true"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 3.5a2.121 2.121 0 013 3L6 17l-4 1 1-4 10.5-10.5z" />
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-2">
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

      <div class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-[280px_1fr] sm:overflow-hidden">
        <!-- Left rail: dates, the two parties, scope of work, the
             completion/review slot, and the tab list switching the panel
             on the right. Same information the old three-column row and
             section headers carried — just organized as one persistent
             column instead of being repeated per tab.
             A CSS grid row (not flex) so this and the panel beside it
             stretch to match each other's height by default, each
             scrolling internally instead of either one overflowing past
             the container — same pattern as the public profile page. -->
        <aside class="w-full rounded-card border border-cream bg-white p-4 sm:overflow-y-auto">
          <div v-if="dateRange" class="mb-3 flex items-center gap-1.5 text-xs text-muted">
            <svg class="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
              <path stroke-linecap="round" d="M3 8h14M7 2.5v3M13 2.5v3" />
            </svg>
            <span class="font-semibold text-ink">{{ dateRange }}</span>
          </div>

          <!-- Homeowner — the whole row is clickable, not just the name. -->
          <component
            :is="project.homeownerUsername ? 'router-link' : 'div'"
            :to="project.homeownerUsername ? `/discover/${project.homeownerUsername}` : undefined"
            class="mb-2.5 flex items-center gap-2"
            :class="project.homeownerUsername ? 'group' : ''"
          >
            <div class="h-[26px] w-[26px] flex-shrink-0 overflow-hidden rounded-full bg-cream">
              <UserAvatar :name="project.homeownerName" :photo-url="homeownerPhotoURL" />
            </div>
            <div class="min-w-0">
              <p class="text-[9.5px] uppercase tracking-wide text-muted">Homeowner</p>
              <p
                class="truncate text-xs font-medium text-ink"
                :class="project.homeownerUsername ? 'underline decoration-ink/25 group-hover:decoration-primary' : ''"
              >
                {{ project.homeownerName }}
              </p>
            </div>
          </component>

          <!-- Professional — whatever the current contractor relationship is. -->
          <component
            :is="project.contractorUsername ? 'router-link' : 'div'"
            v-if="project.contractorUid"
            :to="project.contractorUsername ? `/discover/${project.contractorUsername}` : undefined"
            class="mb-3 flex items-center gap-2"
            :class="project.contractorUsername ? 'group' : ''"
          >
            <div class="h-[26px] w-[26px] flex-shrink-0 overflow-hidden rounded-full bg-cream">
              <UserAvatar :name="project.contractorName ?? ''" :photo-url="publicProfileStore.profile?.photoURL ?? null" />
            </div>
            <div class="min-w-0">
              <p class="text-[9.5px] uppercase tracking-wide text-muted">Professional</p>
              <p
                class="truncate text-xs font-medium text-ink"
                :class="project.contractorUsername ? 'underline decoration-ink/25 group-hover:decoration-primary' : ''"
              >
                {{ project.contractorName }}
                <span v-if="publicProfileStore.profile?.rating" class="font-normal text-muted">· ★{{ publicProfileStore.profile.rating.toFixed(1) }}</span>
              </p>
              <p v-if="contractorSummary" class="truncate text-[10.5px] text-muted">{{ contractorSummary }}</p>
            </div>
          </component>

          <div
            v-else-if="isPendingInvitee"
            class="mb-3 rounded-card border border-pending-border bg-pending-bg p-3"
          >
            <p class="mb-1 text-xs text-pending-text">
              {{ project.homeownerName }} invited you to this project
            </p>
            <p v-if="project.invitationExpiresAt" class="mb-2 text-[11px] font-semibold text-pending-text">
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
            class="mb-3 rounded-card border border-pending-border bg-pending-bg p-3"
          >
            <p class="mb-1 text-xs text-pending-text">
              Invitation sent to {{ project.pendingInvitationName }} — waiting for their response
            </p>
            <p v-if="project.invitationExpiresAt" class="text-[11px] font-semibold text-pending-text">
              {{ formatCountdown(project.invitationExpiresAt) }}
            </p>
          </div>

          <div v-else-if="isHomeowner" class="mb-3 flex flex-col items-start gap-2 rounded-card border border-dashed border-cream p-3">
            <p class="text-xs text-muted">No contractor invited yet.</p>
            <router-link
              to="/discover"
              class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
            >
              Find professionals
            </router-link>
          </div>

          <!-- Scope of work — the framed heading treatment, same prose as before. -->
          <div class="mb-3 rounded-card border border-cream bg-surface p-3">
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <span class="text-[9.5px] font-bold uppercase tracking-wide text-muted">Scope of work</span>
              <button
                v-if="project.referenceImages?.length"
                type="button"
                class="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-lg bg-cream"
                @click="openLightbox(project.referenceImages, 0)"
              >
                <img :src="project.referenceImages[0].thumb" alt="" class="h-full w-full object-cover" />
                <span
                  v-if="project.referenceImages.length > 1"
                  class="absolute -bottom-0.5 -right-0.5 rounded-full border border-white bg-ink px-0.5 text-[8px] font-semibold text-white"
                >
                  {{ project.referenceImages.length }}
                </span>
              </button>
            </div>
            <p v-if="project.description" class="text-[11.5px] leading-relaxed text-ink/90">
              {{ project.description }}
            </p>
            <p v-else class="text-[11.5px] italic text-muted">No scope described yet.</p>
          </div>

          <!-- Completion / review slot -->
          <div
            v-if="isHomeowner && project.status === 'active'"
            class="mb-3 rounded-card border border-cream bg-white p-3"
          >
            <p class="mb-1 text-xs font-semibold text-ink">Mark complete</p>
            <p class="mb-2 text-[11px] text-muted">
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

          <div v-else-if="project.status === 'completed' && project.review" class="mb-3 rounded-card border border-cream bg-white p-3">
            <div class="mb-2 flex items-center gap-2">
              <span
                class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="[reviewScoreClass(project.review.overall).bg, reviewScoreClass(project.review.overall).text]"
              >
                {{ project.review.overall.toFixed(1) }}
              </span>
              <p class="text-xs font-semibold text-ink">Review</p>
            </div>
            <div class="text-[11px] text-ink">
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
              <p v-if="project.review.comment" class="text-[11px] italic text-muted">{{ project.review.comment }}</p>
            </div>
          </div>

          <!-- Ghosted preview — anyone viewing a still-pending project (homeowner or
               the professional deciding on an invite) sees what this slot becomes. -->
          <div
            v-else-if="project.status === 'pending'"
            class="mb-3 rounded-card border border-dashed border-cream bg-surface p-3 opacity-70"
          >
            <p class="mb-1 text-xs font-semibold text-muted">Mark complete</p>
            <p class="text-[11px] text-muted">Available once a professional is on board and every task is done.</p>
          </div>

          <!-- Informational — the contractor's own view of an active project. Only
               the homeowner marks completion, so this just tells them where things stand. -->
          <div
            v-else-if="isContractor && project.status === 'active'"
            class="mb-3 rounded-card border border-cream bg-white p-3"
          >
            <p class="mb-1 text-xs font-semibold text-ink">Completion</p>
            <p class="text-[11px] text-muted">The homeowner will mark this complete once every task is verified.</p>
          </div>

          <!-- Tab list — only meaningful once there's a board to show. -->
          <div v-if="project.status !== 'pending'" class="flex flex-col gap-1 border-t border-cream pt-3">
            <button
              type="button"
              class="rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition"
              :class="activeTab === 'tasks' ? 'bg-primary text-white' : 'text-ink hover:bg-cream/60'"
              @click="activeTab = 'tasks'"
            >
              Tasks
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition"
              :class="activeTab === 'activity' ? 'bg-primary text-white' : 'text-ink hover:bg-cream/60'"
              @click="activeTab = 'activity'"
            >
              Activity
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition"
              :class="activeTab === 'gallery' ? 'bg-primary text-white' : 'text-ink hover:bg-cream/60'"
              @click="activeTab = 'gallery'"
            >
              Gallery · {{ galleryPhotos.length }}
            </button>
          </div>
        </aside>

        <!-- Right panel: Tasks / Activity / Gallery, swapped by the tab above. -->
        <div v-if="project.status !== 'pending'" class="w-full min-w-0 rounded-card border border-cream bg-white p-4 sm:overflow-y-auto">
        <template v-if="activeTab === 'tasks'">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-ink">Tasks</h2>
        <BaseButton v-if="isHomeowner" @click="openAddTask">+ Add task</BaseButton>
      </div>

      <AlertBanner
        v-if="tasksStore.error"
        variant="error"
        title="Couldn't load tasks"
        :message="tasksStore.error"
        class="mb-6"
      />
      <AlertBanner
        v-if="taskActionError"
        variant="error"
        title="Can't delete this task"
        :message="taskActionError"
        class="mb-6"
      />

      <p
        v-if="!tasksStore.tasks.length"
        class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
      >
        No tasks yet.
      </p>

      <div
        v-else
        class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-cream sm:overflow-visible sm:pb-2"
      >
        <KanbanColumn
          v-for="column in TASK_COLUMNS"
          :key="column.status"
          :label="column.label"
          :count="tasksByStatus[column.status].length"
          :tasks="tasksByStatus[column.status]"
          :expanded-id="expandedTaskId"
          :id-of="(t: ProjectTask) => t.id"
          :title-of="(t: ProjectTask) => t.title"
          :dashed="() => column.status === 'not_started'"
          :badge="(t: ProjectTask) =>
            t.status === 'awaiting_review' && latestUpdateFor(t.id)
              ? statusBadge(t.status, latestUpdateFor(t.id)!.createdAt)
              : null
          "
          @toggle="toggleTask"
        >
          <template #task="{ task }">
            <div :id="taskCardId(task.id)">
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
                class="relative mb-2 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream"
                @click="openLightbox(latestUpdateFor(task.id)!.images)"
              >
                <img :src="latestUpdateFor(task.id)!.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                <div class="absolute bottom-1.5 right-1.5">
                  <ImageCountBadge :count="latestUpdateFor(task.id)!.images.length" />
                </div>
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
                class="relative mb-2 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream"
                @click="openLightbox(latestUpdateFor(task.id)!.images)"
              >
                <img :src="latestUpdateFor(task.id)!.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                <div class="absolute bottom-1.5 right-1.5">
                  <ImageCountBadge :count="latestUpdateFor(task.id)!.images.length" />
                </div>
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
                class="relative mb-2 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream"
                @click="openLightbox(latestUpdateFor(task.id)!.images)"
              >
                <img :src="latestUpdateFor(task.id)!.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                <div class="absolute bottom-1.5 right-1.5">
                  <ImageCountBadge :count="latestUpdateFor(task.id)!.images.length" />
                </div>
              </button>
              <p class="text-xs text-ink/90">{{ latestUpdateFor(task.id)!.description }}</p>
            </template>
            </div>
          </template>
        </KanbanColumn>
      </div>
      </template>

      <!-- Activity — a connected node path, snaking three-to-a-row. Each
           node is clickable and opens the Snapshot modal at that moment. -->
      <template v-else-if="activeTab === 'activity'">
      <h2 class="mb-3 text-lg font-semibold text-ink">Activity</h2>

      <div class="mb-6 flex flex-wrap items-center gap-4">
        <span class="flex items-center gap-1.5 text-[11px] text-muted">
          <span class="h-2.5 w-2.5 rounded-sm bg-muted" />
          created
        </span>
        <span class="flex items-center gap-1.5 text-[11px] text-muted">
          <span class="h-2.5 w-2.5 rounded-sm bg-pending" />
          uploaded
        </span>
        <span class="flex items-center gap-1.5 text-[11px] text-muted">
          <span class="h-2.5 w-2.5 rounded-sm bg-error" />
          sent back
        </span>
        <span class="flex items-center gap-1.5 text-[11px] text-muted">
          <span class="h-2.5 w-2.5 rounded-sm bg-success" />
          verified
        </span>
        <div class="relative ml-auto">
          <select
            v-model="activityTaskFilter"
            class="appearance-none rounded-lg border border-cream bg-white py-2 pl-3 pr-8 text-sm text-ink focus:outline-none"
          >
            <option value="">All tasks</option>
            <option v-for="t in tasksStore.tasks" :key="t.id" :value="t.id">
              {{ t.title }}
            </option>
          </select>
          <svg
            class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5L10 12.5L15 7.5" />
          </svg>
        </div>
      </div>

      <p
        v-if="!activityPath.positions.length"
        class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
      >
        No activity yet.
      </p>

      <div v-else>
        <div
          class="mx-auto grid w-full max-w-[800px]"
          style="grid-template-columns: 1fr 34px 1fr 34px 1fr"
          :style="{ gridTemplateRows: activityPath.gridTemplateRows }"
        >
          <div
            v-for="c in activityPath.connectors"
            :key="c.key"
            class="bg-sand"
            :class="c.kind === 'h' ? 'h-0.5 self-center' : 'w-0.5 justify-self-center'"
            :style="{ gridColumn: String(c.col), gridRow: String(c.row) }"
          />

          <div
            v-for="p in activityPath.pills"
            :key="p.key"
            class="z-10 flex items-center justify-center"
            :style="{ gridColumn: String(p.col), gridRow: String(p.row) }"
          >
            <span class="whitespace-nowrap rounded-full border border-cream bg-white px-2.5 py-0.5 text-[10px] font-bold text-wood-text">
              {{ p.label }}
            </span>
          </div>

          <button
            v-for="pos in activityPath.positions"
            :key="pos.entry.key"
            type="button"
            class="flex items-center gap-2 overflow-hidden rounded-lg border border-l-4 border-cream bg-white p-2 text-left"
            :class="LEFT_ACCENT_CLASS[pos.entry.dotClass]"
            :style="{ gridColumn: String(pos.col), gridRow: String(pos.row) }"
            @click="openSnapshot(pos.entry)"
          >
            <div v-if="pos.entry.thumbUrl" class="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-cream">
              <img :src="pos.entry.thumbUrl" alt="" class="h-full w-full object-cover" />
              <div v-if="pos.entry.imageCount" class="absolute bottom-0.5 right-0.5 scale-[0.7]">
                <ImageCountBadge :count="pos.entry.imageCount" />
              </div>
            </div>
            <div v-else class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-surface text-muted">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 4.5v11M4.5 10h11" />
              </svg>
            </div>
            <div class="min-w-0">
              <p class="truncate text-xs font-semibold text-ink">{{ pos.entry.taskTitle }}</p>
              <p class="text-[10px] text-muted">
                {{ pos.entry.label }} · {{ new Date(pos.entry.sortAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
              </p>
            </div>
          </button>
        </div>
      </div>
      </template>

      <!-- Gallery — every photo on the project, flattened. No grouping, no
           count badges: each tile already is one photo, so there's nothing
           to count. Filter/sort come in the next two commits. -->
      <template v-else-if="activeTab === 'gallery'">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-ink">
          Gallery · {{ galleryFilter === 'byTask' ? `${galleryAlbums.length} albums` : sortedGalleryPhotos.length }}
        </h2>
        <div class="flex gap-2">
          <div class="relative">
            <select
              v-model="galleryFilter"
              class="appearance-none rounded-lg border border-cream bg-white py-2 pl-3 pr-8 text-sm text-ink focus:outline-none"
            >
              <option value="">All images</option>
              <option value="byTask">By task</option>
            </select>
            <svg
              class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
              viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5L10 12.5L15 7.5" />
            </svg>
          </div>
          <div class="relative">
            <select
              v-model="gallerySort"
              class="appearance-none rounded-lg border border-cream bg-white py-2 pl-3 pr-8 text-sm text-ink focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <svg
              class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
              viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5L10 12.5L15 7.5" />
            </svg>
          </div>
        </div>
      </div>

      <p
        v-if="galleryFilter === 'byTask' ? !galleryAlbums.length : !sortedGalleryPhotos.length"
        class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
      >
        No photos yet.
      </p>

      <div v-else-if="galleryFilter === 'byTask'" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <button
          v-for="album in galleryAlbums"
          :key="album.key"
          type="button"
          class="overflow-hidden rounded-card border border-cream bg-white text-left"
          @click="openLightbox(album.photos.map((p) => ({ thumb: p.thumb, full: p.full })), 0)"
        >
          <div class="relative aspect-[4/3] bg-cream">
            <img :src="album.photos[0].thumb" alt="" class="h-full w-full object-cover" />
            <div class="absolute bottom-1.5 right-1.5">
              <ImageCountBadge :count="album.photos.length" />
            </div>
          </div>
          <p class="truncate p-2 text-xs font-semibold text-ink">{{ album.label }}</p>
        </button>
      </div>

      <div v-else class="rounded-card border border-cream bg-white p-3">
        <div class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          <button
            v-for="(photo, i) in sortedGalleryPhotos"
            :key="i"
            type="button"
            class="aspect-square overflow-hidden rounded-lg bg-cream"
            @click="openLightbox(sortedGalleryPhotos.map((p) => ({ thumb: p.thumb, full: p.full })), i)"
          >
            <img :src="photo.thumb" alt="" class="h-full w-full object-cover" />
          </button>
        </div>
      </div>
      </template>
        </div>
      </div>

    </template>
    </div>

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

    <SnapshotModal
      v-if="showSnapshot"
      :tasks="snapshotTasks"
      :highlight-task-id="snapshotHighlightId"
      :entry-label="snapshotEntryLabel"
      :timestamp="snapshotTimestamp"
      @close="showSnapshot = false"
      @open-lightbox="(images, i) => openLightbox(images, i)"
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