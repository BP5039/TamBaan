<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { SnapshotTaskState, TaskStatus } from '@/types/project'
import KanbanColumn from '@/components/projects/KanbanColumn.vue'
import ImageCountBadge from '@/components/ui/ImageCountBadge.vue'

const props = defineProps<{
  tasks: SnapshotTaskState[]
  highlightTaskId: string
  entryLabel: string
  timestamp: number
}>()

defineEmits<{
  close: []
  'open-lightbox': [images: { thumb: string; full: string }[], startIndex: number]
}>()

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'not_started', label: 'Not started' },
  { status: 'awaiting_review', label: 'Awaiting review' },
  { status: 'sent_back', label: 'Sent back' },
  { status: 'done', label: 'Done' },
]

// Starts open on whichever task the clicked Activity entry belongs to.
const expandedTaskId = ref<string>(props.highlightTaskId)
function toggle(taskId: string) {
  expandedTaskId.value = expandedTaskId.value === taskId ? '' : taskId
}

const highlightedState = computed(() => props.tasks.find((t) => t.task.id === props.highlightTaskId))

// Same color family as the Activity accents and the board's own status
// colors — not_started/created is the one neutral case, the rest map 1:1.
const borderClass = computed(() => {
  switch (highlightedState.value?.status) {
    case 'awaiting_review':
      return 'border-pending'
    case 'sent_back':
      return 'border-error'
    case 'done':
      return 'border-success'
    default:
      return 'border-muted'
  }
})

function byStatus(status: TaskStatus) {
  return props.tasks.filter((t) => t.status === status)
}

function dateLabel(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function columnElId(status: TaskStatus) {
  return `snapshot-col-${status}`
}

// On mobile the columns are a horizontal snap-scroll strip (same as the real
// board) — default to whichever column the highlighted task is actually in,
// rather than always starting at "Not started".
onMounted(() => {
  if (!highlightedState.value) return
  document.getElementById(columnElId(highlightedState.value.status))?.scrollIntoView({
    behavior: 'auto',
    inline: 'center',
    block: 'nearest',
  })
})
</script>

<template>
  <Teleport to="body">
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="w-full max-w-2xl rounded-card bg-surface p-4 sm:max-w-3xl sm:p-5 lg:max-w-4xl">
      <div class="mb-1 flex items-start justify-between">
        <div>
          <p class="text-sm font-bold text-ink">{{ entryLabel }}</p>
          <p class="text-xs text-muted">{{ dateLabel(timestamp) }} · board state at this moment</p>
        </div>
        <button
          type="button"
          class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-cream bg-white text-xs text-muted"
          aria-label="Close"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Same shared column + same divide-x container treatment as the
           live board on the Hub page, instead of this modal keeping its
           own independently-styled copy. -->
      <div
        class="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-card border border-cream bg-white pb-1 sm:grid sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-cream sm:overflow-visible sm:p-2"
      >
        <KanbanColumn
          v-for="col in COLUMNS"
          :key="col.status"
          :id="columnElId(col.status)"
          :label="col.label"
          :count="byStatus(col.status).length"
          :tasks="byStatus(col.status)"
          :expanded-id="expandedTaskId"
          compact
          :id-of="(t: SnapshotTaskState) => t.task.id"
          :title-of="(t: SnapshotTaskState) => t.task.title"
          :highlight-class="(t: SnapshotTaskState) => (t.task.id === highlightTaskId ? borderClass : null)"
          :dashed="(t: SnapshotTaskState) => t.status === 'not_started'"
          @toggle="toggle"
        >
          <template #task="{ task: entry }">
            <template v-if="entry.status === 'not_started'">
              <button
                v-if="entry.task.referenceImages?.length"
                type="button"
                class="mb-1.5 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface"
                @click="$emit('open-lightbox', entry.task.referenceImages, 0)"
              >
                <img :src="entry.task.referenceImages[0].thumb" alt="" class="h-full w-full object-cover" />
              </button>
              <p class="text-[11px] text-ink/90">{{ entry.task.description }}</p>
            </template>

            <template v-else-if="entry.update">
              <button
                type="button"
                class="relative mb-1.5 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream"
                @click="$emit('open-lightbox', entry.update.images, 0)"
              >
                <img :src="entry.update.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                <div class="absolute bottom-1 right-1 scale-[0.8]">
                  <ImageCountBadge :count="entry.update.images.length" />
                </div>
              </button>
              <p class="mb-1 text-[11px] text-ink/90">{{ entry.update.description }}</p>
              <p
                v-if="entry.status === 'sent_back' && entry.update.sentBackReason"
                class="rounded-lg bg-error-bg p-1.5 text-[10px] text-error-text"
              >
                {{ entry.update.sentBackReason }}
              </p>
            </template>
          </template>
        </KanbanColumn>
      </div>

      <p class="mt-3 text-center text-[10px] text-muted">
        Tasks are placed exactly where they stood at this moment — not their current status.
      </p>
    </div>
  </div>
  </Teleport>
</template>