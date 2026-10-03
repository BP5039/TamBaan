<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import CardMenu from '@/components/ui/CardMenu.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import ImageCountBadge from '@/components/ui/ImageCountBadge.vue'
import { formatDateRange } from '@/utils/dateFormat'
import type { Project } from '@/types/project'
import type { UserProfile } from '@/types'

const props = defineProps<{ project: Project; unreadCount?: number }>()

const authStore = useAuthStore()
const projectsStore = useProjectsStore()

const canDelete = computed(
  () =>
    props.project.homeownerUid === authStore.user?.uid &&
    props.project.status === 'pending' &&
    !props.project.pendingInvitationUid &&
    !props.project.contractorUid,
)

const showDeleteConfirm = ref(false)

function handleDelete() {
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  showDeleteConfirm.value = false
  await projectsStore.deleteProject(props.project)
}

function statusStyle(status: string) {
  if (status === 'active' || status === 'completed') return 'bg-success-bg text-success-text'
  return 'bg-pending-bg text-pending-text'
}

function statusLabel(project: Project) {
  if (project.status === 'active') return 'Active'
  if (project.status === 'completed') return 'Completed'
  return project.pendingInvitationUid ? 'Pending approval' : 'Awaiting invite'
}

// Whichever side the current viewer ISN'T: a homeowner sees the contractor
// (or whoever's pending an invite, or nobody yet); a professional always
// sees the homeowner, since every project has one from creation.
const otherParty = computed(() => {
  if (authStore.profile?.role === 'homeowner') {
    return props.project.contractorName ?? props.project.pendingInvitationName ?? null
  }
  return props.project.homeownerName
})

// The project doc only ever denormalizes the other party's name, never
// their photo, so this card always showed initials regardless of whether
// they actually had one uploaded. One small live fetch keyed off whichever
// uid otherParty resolves to — same pattern already used for the Project
// Hub rail's homeowner avatar.
const otherPartyUid = computed(() => {
  if (authStore.profile?.role === 'homeowner') {
    return props.project.contractorUid ?? props.project.pendingInvitationUid ?? null
  }
  return props.project.homeownerUid
})

const otherPartyPhotoURL = ref<string | null>(null)
watch(
  otherPartyUid,
  async (uid) => {
    otherPartyPhotoURL.value = null
    if (!uid) return
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      otherPartyPhotoURL.value = (snap.data() as UserProfile | undefined)?.photoURL ?? null
    } catch {
      otherPartyPhotoURL.value = null
    }
  },
  { immediate: true },
)

const dateRange = computed(() =>
  props.project.plannedStartDate && props.project.plannedEndDate
    ? formatDateRange(props.project.plannedStartDate, props.project.plannedEndDate)
    : '',
)
</script>

<template>
  <div class="overflow-hidden rounded-card border border-cream bg-white">
    <div class="relative aspect-[4/3] w-full bg-cream/60">
      <img
        v-if="project.lastVerifiedPhotoUrl"
        :src="project.lastVerifiedPhotoUrl"
        alt=""
        class="h-full w-full object-cover"
      />
      <div v-else class="flex h-full w-full flex-col items-center justify-center gap-1.5">
        <svg class="h-7 w-7 text-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 4.5h18v15H3v-15z" />
        </svg>
        <span class="text-[11px] text-muted">No progress updates yet</span>
      </div>

      <span
        class="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
        :class="statusStyle(project.status)"
      >
        {{ statusLabel(project) }}
      </span>

      <span
        v-if="unreadCount && unreadCount > 0"
        class="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-error px-1 text-[10px] font-bold text-white"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>

      <div class="absolute bottom-2 right-2">
        <ImageCountBadge :count="project.photoCount" />
      </div>

      <div v-if="canDelete" class="absolute right-2 top-2">
        <CardMenu :items="[{ label: 'Delete project', action: handleDelete, variant: 'danger' }]" />
      </div>
    </div>

    <div class="flex flex-col gap-1 p-3">
      <div v-if="otherParty" class="flex items-center gap-1.5">
        <div class="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full bg-cream">
          <UserAvatar :name="otherParty" :photo-url="otherPartyPhotoURL" />
        </div>
        <span class="text-[11px] text-muted">{{ otherParty }}</span>
      </div>
      <p v-else class="text-[11px] italic text-muted/70">No professional invited yet</p>

      <p class="text-xs font-semibold text-ink">{{ project.name }}</p>

      <p v-if="project.description" class="line-clamp-2 text-xs text-ink/90">{{ project.description }}</p>

      <div class="flex items-center gap-1.5 text-[11px] text-muted">
        <svg class="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 18s6-5.686 6-10a6 6 0 10-12 0c0 4.314 6 10 6 10z" />
          <circle cx="10" cy="8" r="2" />
        </svg>
        {{ project.location }}
      </div>

      <div class="flex items-center justify-between">
        <div v-if="dateRange" class="flex items-center gap-1.5 text-[11px] text-muted">
          <svg class="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
            <path stroke-linecap="round" d="M3 8h14M7 2.5v3M13 2.5v3" />
          </svg>
          {{ dateRange }}
        </div>
        <div v-else></div>
        <div class="flex items-center gap-0.5 text-[10px] font-semibold text-primary">
          View details
          <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 4.5l6 5.5-6 5.5" />
          </svg>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="showDeleteConfirm"
      title="Delete this project?"
      message="This can't be undone."
      danger
      @cancel="showDeleteConfirm = false"
      @confirm="confirmDelete"
    />
  </div>
</template>