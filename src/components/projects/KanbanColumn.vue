<script setup lang="ts" generic="T">
// One Kanban column's shell: header + count, the collapsed/expanded task
// rows, and the border treatment (plain / dashed "not started" / highlighted,
// for the Snapshot modal's one highlighted task). Shared by the live board
// on the Hub page and the read-only Snapshot modal, which used to duplicate
// this markup independently and had already drifted apart once.
//
// Generic over whatever task shape the caller has (ProjectTask on the live
// board, SnapshotTaskState in the modal) — the accessor props pull out just
// what this shell needs to render the collapsed row, and the scoped slot
// gets the original object back untouched for the expanded detail body,
// which differs enough between the two callers that sharing it isn't worth
// forcing.
withDefaults(
  defineProps<{
    label: string
    count: number
    tasks: T[]
    expandedId: string | null
    idOf: (t: T) => string
    titleOf: (t: T) => string
    dashed?: (t: T) => boolean
    highlightClass?: (t: T) => string | null | undefined
    badge?: (t: T) => { text: string; class: string } | null | undefined
    compact?: boolean
  }>(),
  { compact: false, dashed: undefined, highlightClass: undefined, badge: undefined },
)

defineEmits<{ toggle: [id: string] }>()
</script>

<template>
  <div
    class="w-full flex-shrink-0 snap-center sm:w-auto"
    :class="compact ? 'p-2' : 'rounded-card border border-cream bg-white p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-4 sm:pb-2 sm:pt-0 sm:first:pl-0'"
  >
    <p
      class="font-semibold uppercase tracking-wide text-muted"
      :class="compact ? 'mb-1.5 text-[9px]' : 'mb-2 text-[11px]'"
    >
      {{ label }} · {{ count }}
    </p>

    <div :class="compact ? 'space-y-1.5' : 'space-y-2'">
      <div
        v-for="task in tasks"
        :key="idOf(task)"
        class="overflow-hidden rounded-lg border bg-white"
        :class="highlightClass?.(task) ? `border-2 ${highlightClass(task)}` : dashed?.(task) ? 'border-dashed border-cream' : 'border-cream'"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between text-left"
          :class="compact ? 'gap-1 px-2 py-1.5' : 'gap-2 p-2.5'"
          @click="$emit('toggle', idOf(task))"
        >
          <span class="min-w-0 flex-1">
            <span
              class="block truncate font-semibold text-ink"
              :class="compact ? 'text-[11px]' : 'text-sm'"
            >
              {{ titleOf(task) }}
            </span>
            <span
              v-if="badge?.(task)"
              class="mt-1 inline-block rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
              :class="badge(task)!.class"
            >
              {{ badge(task)!.text }}
            </span>
          </span>
          <svg
            class="flex-shrink-0 text-muted transition-transform"
            :class="[compact ? 'h-3 w-3' : 'h-3.5 w-3.5', { 'rotate-180': expandedId === idOf(task) }]"
            viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5L10 12.5L15 7.5" />
          </svg>
        </button>

        <div v-if="expandedId === idOf(task)" class="border-t border-cream" :class="compact ? 'p-2' : 'p-2.5'">
          <slot name="task" :task="task" />
        </div>
      </div>

      <p v-if="!tasks.length" class="text-[10px] text-muted">—</p>
    </div>
  </div>
</template>