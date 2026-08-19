<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import BaseButton from '@/components/ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()

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

const isHomeowner = computed(() => project.value?.homeownerUid === authStore.user?.uid)

const isPendingInvitee = computed(
  () => !!project.value?.pendingInvitationUid && project.value.pendingInvitationUid === authStore.user?.uid,
)

const respondLoading = computed(() => projectsStore.loading)

async function respond(action: 'accept' | 'decline') {
  if (!project.value) return
  if (action === 'accept') {
    await projectsStore.acceptInvitation(project.value)
  } else {
    await projectsStore.declineInvitation(project.value)
  }
  await load()
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

async function load() {
  await projectsStore.fetchProject(projectId.value)
  if (projectsStore.currentProject) {
    await tasksStore.fetchTasks(projectId.value)
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <p v-if="projectsStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <p
      v-else-if="!project || !isParticipant"
      class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
    >
      This project doesn't exist, or you don't have access to it.
    </p>

    <template v-else>
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-ink">{{ project.name }}</h1>
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
      </div>

      <div class="rounded-card border border-cream bg-white p-6">
        <p v-if="project.description" class="mb-4 text-sm text-ink/90">{{ project.description }}</p>
        <p class="mb-1 text-xs text-muted">
          Planned: {{ project.plannedStartDate }} → {{ project.plannedEndDate }}
        </p>
        <p class="mb-4 text-xs text-muted">Homeowner: {{ project.homeownerName }}</p>

        <div v-if="project.contractorUid" class="mb-4 rounded-lg border border-cream p-3">
          <p class="text-xs text-muted">Contractor</p>
          <p class="text-sm font-medium text-ink">{{ project.contractorName }}</p>
        </div>
        <div
          v-else-if="isPendingInvitee"
          class="mb-4 rounded-lg border border-pending-border bg-pending-bg p-3"
        >
          <p class="mb-3 text-xs text-pending-text">
            {{ project.homeownerName }} invited you to this project
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
          class="mb-4 rounded-lg border border-pending-border bg-pending-bg p-3"
        >
          <p class="text-xs text-pending-text">
            Invitation sent to {{ project.pendingInvitationName }} — waiting for their response
          </p>
        </div>
        <div v-else-if="isHomeowner" class="mb-4 rounded-lg border border-dashed border-cream p-3">
          <p class="text-xs text-muted">
            No contractor invited yet. Visit a professional's profile from
            <router-link to="/discover" class="font-medium text-primary underline">Find professionals</router-link>
            to invite them to this project.
          </p>
        </div>

        <div class="mb-4 flex items-center justify-between rounded-lg border border-cream p-3">
          <div>
            <p class="text-sm font-medium text-ink">Tasks</p>
            <p class="text-xs text-muted">
              {{ tasksStore.tasks.filter((t) => t.status === 'done').length }} of
              {{ tasksStore.tasks.length }} done
            </p>
          </div>
          <BaseButton variant="outline" @click="router.push(`/projects/${projectId}/tasks`)">
            View tasks →
          </BaseButton>
        </div>

        <div class="flex items-center justify-between rounded-lg border border-cream p-3">
        <p class="text-sm font-medium text-ink">Progress timeline</p>
        <BaseButton variant="outline" @click="router.push(`/projects/${projectId}/timeline`)">
            View timeline →
        </BaseButton>
        </div>
      </div>
    </template>
  </div>
</template>