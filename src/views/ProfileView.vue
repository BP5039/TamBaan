<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePortfolioStore } from '@/stores/portfolio'
import { useProjectsStore } from '@/stores/projects'
import { labelForCategory } from '@/constants/workCategories'
import type { Project } from '@/types/project'
import PortfolioItemCard from '@/components/profile/PortfolioItemCard.vue'
import AddPortfolioModal from '@/components/profile/AddPortfolioModal.vue'
import CreateProjectModal from '@/components/projects/CreateProjectModal.vue'
import StarRating from '@/components/ui/StarRating.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const router = useRouter()
const authStore = useAuthStore()
const portfolioStore = usePortfolioStore()
const projectsStore = useProjectsStore()

const profile = computed(() => authStore.profile!)
const isProfessional = computed(() => profile.value.role === 'professional')

const showAddModal = ref(false)
const uploading = ref(false)
const modalUploadError = ref('')

const showCreateProjectModal = ref(false)

onMounted(async () => {
  if (isProfessional.value && authStore.user) {
    await portfolioStore.fetchItems(authStore.user.uid)
    await projectsStore.fetchPendingInvitations(authStore.user.uid)
  }
  if (!isProfessional.value && authStore.user) {
    await projectsStore.fetchMyProjects(authStore.user.uid, 'homeowner')
  }
})

function openAddModal() {
  modalUploadError.value = ''
  showAddModal.value = true
}

async function handleSavePortfolioItem(payload: {
  files: File[]
  title: string
  description: string
  year: number
  location: string
}) {
  if (!authStore.user) return
  modalUploadError.value = ''
  uploading.value = true
  try {
    await portfolioStore.addItem(
      authStore.user.uid,
      payload.files,
      payload.title,
      payload.description,
      payload.year,
      payload.location,
    )
    showAddModal.value = false
  } catch {
    modalUploadError.value = 'Upload failed. Check your connection and try again.'
  } finally {
    uploading.value = false
  }
}

async function handleDeleteItem(id: string) {
  if (!authStore.user) return
  const item = portfolioStore.items.find((i) => i.id === id)
  if (item) await portfolioStore.removeItem(authStore.user.uid, item)
}

function onProjectCreated(projectId: string) {
  showCreateProjectModal.value = false
  router.push(`/projects/${projectId}`)
}

function projectStatusStyle(status: string) {
  if (status === 'active' || status === 'completed') return 'bg-success-bg text-success-text'
  return 'bg-pending-bg text-pending-text'
}

async function respondToInvitation(project: Project, accept: boolean) {
  if (accept) {
    await projectsStore.acceptInvitation(project)
    router.push(`/projects/${project.id}`)
  } else {
    await projectsStore.declineInvitation(project)
  }
}

async function logout() {
  await authStore.logout()
  router.push('/home')
}
</script>

<template>
  <div v-if="profile" class="mx-auto max-w-4xl px-4 py-8">
    <div class="grid grid-cols-1 gap-6 rounded-card border border-cream bg-white p-6 md:grid-cols-[220px_1px_1fr]">
      <div class="flex flex-col self-start text-center md:sticky md:top-16 md:items-start md:text-left">
        <div class="mb-3 h-20 w-20 overflow-hidden rounded-full bg-cream">
          <img v-if="profile.photoURL" :src="profile.photoURL" alt="" class="h-full w-full object-cover" />
        </div>
        <p class="font-medium text-ink">{{ profile.firstName }} {{ profile.lastName }}</p>
        <p class="text-xs text-muted">@{{ profile.username }}</p>

        <StarRating
          v-if="isProfessional"
          :rating="profile.rating ?? null"
          :count="profile.ratingCount ?? 0"
          class="mt-2 justify-center md:justify-start"
        />

        <p class="mt-2 text-xs text-muted">{{ profile.phone }}</p>
        <p v-if="profile.lineId" class="text-xs text-muted">LINE: {{ profile.lineId }}</p>
        <p v-if="profile.facebookId" class="text-xs text-muted">FB: {{ profile.facebookId }}</p>
        <p class="text-xs text-muted">{{ profile.province }}</p>

        <div v-if="isProfessional && profile.workCategories.length" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="cat in profile.workCategories"
            :key="cat"
            class="rounded-lg bg-cream px-2.5 py-1 text-[11px] font-medium text-ink"
          >
            {{ labelForCategory(cat) }}
          </span>
        </div>

        <div class="mt-6 flex w-full flex-col gap-2">
          <BaseButton variant="outline" full-width @click="router.push(`/discover/${profile.username}`)">
            Preview public profile
          </BaseButton>
          <BaseButton variant="outline" full-width @click="router.push('/profile/edit')">
            Edit profile
          </BaseButton>
          <button
            type="button"
            class="w-full rounded-lg border border-error-border px-4 py-2.5 text-sm font-medium text-error hover:bg-error-bg"
            @click="logout"
          >
            Log out
          </button>
        </div>
      </div>

      <div class="hidden bg-cream md:block" />

      <div>
        <div v-if="isProfessional && projectsStore.pendingInvitations.length" class="mb-6 space-y-2">
          <h2 class="mb-2 text-sm font-medium text-muted">Invitations</h2>
          <div
            v-for="inv in projectsStore.pendingInvitations"
            :key="inv.id"
            class="rounded-lg border border-cream bg-white p-3"
          >
            <p class="text-sm font-medium text-ink">{{ inv.name }}</p>
            <p class="mb-2 text-xs text-muted">{{ inv.homeownerName }} wants to invite you</p>
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 rounded-lg border border-cream py-1.5 text-xs font-medium text-muted hover:bg-cream/40"
                @click="respondToInvitation(inv, false)"
              >
                Decline
              </button>
              <button
                type="button"
                class="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
                @click="respondToInvitation(inv, true)"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-medium text-muted">
            {{ isProfessional ? 'Previous work' : 'My projects' }}
          </h2>
          <BaseButton v-if="isProfessional" @click="openAddModal">+ Add work</BaseButton>
          <BaseButton v-else @click="showCreateProjectModal = true">+ Create project</BaseButton>
        </div>

        <AlertBanner
          v-if="modalUploadError && !showAddModal"
          variant="error"
          title="Upload failed"
          :message="modalUploadError"
          class="mb-4"
        />

        <template v-if="isProfessional">
          <div v-if="portfolioStore.groupedByYear.length">
            <div v-for="group in portfolioStore.groupedByYear" :key="group.year" class="mb-6 last:mb-0">
              <h3 class="mb-3 text-sm font-semibold text-ink">{{ group.year }}</h3>
              <div class="grid grid-cols-2 gap-4">
                <PortfolioItemCard
                  v-for="item in group.items"
                  :key="item.id"
                  :item="item"
                  can-delete
                  @delete="handleDeleteItem(item.id)"
                />
              </div>
            </div>
          </div>
          <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
            No work uploaded yet. Add photos of finished jobs to start building your portfolio.
          </p>
        </template>

        <template v-else>
          <div v-if="projectsStore.myProjects.length" class="space-y-2">
            <button
              v-for="p in projectsStore.myProjects"
              :key="p.id"
              type="button"
              class="flex w-full items-center justify-between rounded-lg border border-cream bg-white p-3 text-left hover:border-primary/50"
              @click="router.push(`/projects/${p.id}`)"
            >
              <span class="text-sm text-ink">{{ p.name }}</span>
              <span class="rounded-lg px-2 py-0.5 text-[10px] font-medium" :class="projectStatusStyle(p.status)">
                {{ p.status === 'active' ? 'Active' : p.status === 'completed' ? 'Completed' : 'Pending' }}
              </span>
            </button>
          </div>
          <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
            No projects yet. Create one to start tracking a renovation.
          </p>
        </template>
      </div>
    </div>

    <AddPortfolioModal
      v-if="showAddModal"
      :saving="uploading"
      :upload-error="modalUploadError"
      @close="showAddModal = false"
      @save="handleSavePortfolioItem"
    />

    <CreateProjectModal
      v-if="showCreateProjectModal"
      @close="showCreateProjectModal = false"
      @created="onProjectCreated"
    />
  </div>
</template>