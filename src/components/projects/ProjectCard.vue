<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import CardMenu from '@/components/ui/CardMenu.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { Project } from '@/types/project'

const props = defineProps<{ project: Project }>()

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

function statusLabel(status: string) {
  if (status === 'active') return 'Active'
  if (status === 'completed') return 'Completed'
  return 'Pending'
}
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
      <div v-else class="flex h-full w-full items-center justify-center text-xs text-muted">
        No verified progress yet
      </div>

      <span
        class="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
        :class="statusStyle(project.status)"
      >
        {{ statusLabel(project.status) }}
      </span>
    </div>
    <div class="p-3">
      <p class="mb-0.5 text-xs font-semibold text-ink">{{ project.name }}</p>
      <p v-if="project.description" class="line-clamp-3 text-xs text-ink/90">{{ project.description }}</p>
      <p class="mt-1 text-[11px] text-muted">{{ project.location }}</p>
      <p v-if="project.plannedStartDate" class="mt-0.5 text-[11px] text-muted">
        {{ project.plannedStartDate }} → {{ project.plannedEndDate }}
      </p>
      <div v-if="canDelete" class="mt-1 flex justify-end">
        <CardMenu :items="[{ label: 'Delete project', action: handleDelete, variant: 'danger' }]" />
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