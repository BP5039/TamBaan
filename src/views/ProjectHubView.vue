<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import BaseButton from '@/components/ui/BaseButton.vue'
import StarRating from '@/components/ui/StarRating.vue'
import CompleteProjectModal from '@/components/projects/CompleteProjectModal.vue'
import CreateProjectModal from '@/components/projects/CreateProjectModal.vue'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox.vue'

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

const lightboxIndex = ref<number | null>(null)

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

async function load() {
  await projectsStore.fetchProject(projectId.value)
  if (projectsStore.currentProject) {
    await tasksStore.fetchTasks(projectId.value)
  }
  await loadHomeownerContact()
}

watch(projectId, load, { immediate: true })
</script>

<template>
  <div class="w-full px-[15%] py-8">
    <p v-if="projectsStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <p
      v-else-if="!project || !canView"
      class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
    >
      This project doesn't exist, or you don't have access to it.
    </p>

    <template v-else>
      <div class="mb-4 flex items-center justify-between">
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
        </div>
      </div>

      <div class="rounded-card border border-cream bg-white p-6">
        <p v-if="project.description" class="mb-4 text-sm text-ink/90">{{ project.description }}</p>

        <div v-if="project.referenceImages?.length" class="mb-4 flex gap-1.5">
          <button
            v-for="(img, i) in project.referenceImages"
            :key="i"
            type="button"
            class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-cream"
            @click="lightboxIndex = i"
          >
            <img :src="img.thumb" alt="" class="h-full w-full object-cover" />
          </button>
        </div>

        <p class="mb-1 text-xs text-muted">
          Planned: {{ project.plannedStartDate }} → {{ project.plannedEndDate }}
        </p>
        <p class="mb-4 text-xs text-muted">Homeowner: {{ project.homeownerName }}</p>

        <template v-if="project.contractorUid">
          <div class="mb-4 rounded-lg border border-cream p-3">
            <p class="text-xs text-muted">Contractor</p>
            <router-link
              v-if="project.contractorUsername"
              :to="`/discover/${project.contractorUsername}`"
              class="text-sm font-medium text-primary underline"
            >
              {{ project.contractorName }}
            </router-link>
            <p v-else class="text-sm font-medium text-ink">{{ project.contractorName }}</p>
          </div>
          <div v-if="isContractor && homeownerContact" class="mb-4 rounded-lg border border-cream p-3">
            <p class="mb-1 text-xs text-muted">Homeowner contact</p>
            <p class="text-sm text-ink">{{ homeownerContact.phone }}</p>
            <p v-if="homeownerContact.lineId" class="text-xs text-ink">LINE: {{ homeownerContact.lineId }}</p>
            <p v-if="homeownerContact.facebookId" class="text-xs text-ink">FB: {{ homeownerContact.facebookId }}</p>
          </div>
        </template>
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
            <p class="text-sm font-medium text-ink">Progress timeline</p>
            <p class="text-xs text-muted">
              {{ tasksStore.tasks.filter((t) => t.status === 'done').length }} of
              {{ tasksStore.tasks.length }} tasks done
            </p>
          </div>
          <BaseButton variant="outline" @click="router.push(`/projects/${projectId}/timeline`)">
            View timeline →
          </BaseButton>
        </div>

        <div
          v-if="isHomeowner && project.status === 'active'"
          class="rounded-lg border border-cream p-3"
        >
          <p class="mb-1 text-sm font-medium text-ink">Mark project complete</p>
          <p class="mb-3 text-xs text-muted">
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

        <div v-else-if="project.status === 'completed' && project.review" class="rounded-lg border border-cream p-3">
          <p class="mb-2 text-sm font-medium text-ink">Review</p>
          <div class="mb-1.5 flex items-center justify-between text-xs text-ink">
            <span>Work quality</span>
            <StarRating :rating="project.review.workQuality" :count="0" />
          </div>
          <div class="mb-1.5 flex items-center justify-between text-xs text-ink">
            <span>Communication</span>
            <StarRating :rating="project.review.communication" :count="0" />
          </div>
          <div class="mb-2 flex items-center justify-between text-xs text-ink">
            <span>Timeliness</span>
            <StarRating :rating="project.review.timeliness" :count="0" />
          </div>
          <p v-if="project.review.comment" class="text-xs text-ink/90">{{ project.review.comment }}</p>
        </div>
      </div>
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

    <PortfolioLightbox
      v-if="lightboxIndex !== null && project?.referenceImages"
      :images="project.referenceImages"
      :start-index="lightboxIndex"
      @close="lightboxIndex = null"
    />
  </div>
</template>