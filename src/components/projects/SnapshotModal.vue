<script setup lang="ts">
import { ref } from 'vue'
import type { SnapshotTaskState, TaskStatus } from '@/types/project'

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

function byStatus(status: TaskStatus) {
  return props.tasks.filter((t) => t.status === status)
}

function dateLabel(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <Teleport to="body">
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="w-full max-w-2xl rounded-card bg-surface p-4">
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

      <div class="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible">
        <div
          v-for="col in COLUMNS"
          :key="col.status"
          class="w-[85%] flex-shrink-0 snap-center rounded-lg border border-cream bg-white p-2 sm:w-auto"
        >
          <p class="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
            {{ col.label }} · {{ byStatus(col.status).length }}
          </p>

          <div class="space-y-1.5">
            <div
              v-for="entry in byStatus(col.status)"
              :key="entry.task.id"
              class="overflow-hidden rounded-lg border bg-white"
              :class="
                entry.task.id === highlightTaskId
                  ? 'border-2 border-error'
                  : col.status === 'not_started' ? 'border-dashed border-cream' : 'border-cream'
              "
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left"
                @click="toggle(entry.task.id)"
              >
                <span class="truncate text-[11px] font-semibold text-ink">{{ entry.task.title }}</span>
                <svg
                  class="h-3 w-3 flex-shrink-0 text-muted transition-transform"
                  :class="{ 'rotate-180': expandedTaskId === entry.task.id }"
                  viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5L10 12.5L15 7.5" />
                </svg>
              </button>

              <div v-if="expandedTaskId === entry.task.id" class="border-t border-cream p-2">
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
                    class="mb-1.5 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream"
                    @click="$emit('open-lightbox', entry.update.images, 0)"
                  >
                    <img :src="entry.update.images[0]?.thumb" alt="" class="h-full w-full object-cover" />
                  </button>
                  <p class="mb-1 text-[11px] text-ink/90">{{ entry.update.description }}</p>
                  <p
                    v-if="entry.status === 'sent_back' && entry.update.sentBackReason"
                    class="rounded-lg bg-error-bg p-1.5 text-[10px] text-error-text"
                  >
                    {{ entry.update.sentBackReason }}
                  </p>
                </template>
              </div>
            </div>

            <p v-if="!byStatus(col.status).length" class="text-[10px] text-muted">—</p>
          </div>
        </div>
      </div>

      <p class="mt-3 text-center text-[10px] text-muted">
        Tasks are placed exactly where they stood at this moment — not their current status.
      </p>
    </div>
  </div>
  </Teleport>
</template>