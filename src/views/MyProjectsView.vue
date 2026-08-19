<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'

const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()

onMounted(async () => {
  if (authStore.user && authStore.profile) {
    await projectsStore.fetchMyProjects(authStore.user.uid, authStore.profile.role)
  }
})

function statusStyle(status: string) {
  if (status === 'active' || status === 'completed') return 'bg-success-bg text-success-text'
  return 'bg-pending-bg text-pending-text'
}

function statusLabel(status: string) {
  if (status === 'active') return 'Active'
  if (status === 'completed') return 'Completed'
  return 'Pending'
}

function yearOf(dateStr: string) {
  return dateStr ? new Date(dateStr).getFullYear() : ''
}

const roleLabel = computed(() =>
  authStore.profile?.role === 'homeowner' ? 'homeowner' : 'professional',
)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="mb-1 text-xl font-semibold text-ink">My projects</h1>
    <p class="mb-6 text-xs text-muted">Projects where you're the {{ roleLabel }}.</p>

    <p v-if="projectsStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <div v-else-if="projectsStore.myProjects.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        v-for="p in projectsStore.myProjects"
        :key="p.id"
        type="button"
        class="overflow-hidden rounded-card border border-cream bg-white text-left hover:border-primary/50"
        @click="router.push(`/projects/${p.id}`)"
      >
        <div class="relative aspect-[4/3] w-full bg-cream/60">
          <img
            v-if="p.lastVerifiedPhotoUrl"
            :src="p.lastVerifiedPhotoUrl"
            alt=""
            class="h-full w-full object-cover"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-xs text-muted">
            No verified progress yet
          </div>

          <span
            class="absolute left-2 top-2 rounded-full border border-cream bg-cream/90 px-2 py-0.5 text-[10px] font-medium text-muted"
          >
            {{ yearOf(p.plannedStartDate) }}
          </span>
          <span
            class="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
            :class="statusStyle(p.status)"
          >
            {{ statusLabel(p.status) }}
          </span>
        </div>
        <div class="p-3">
          <p class="mb-0.5 text-xs font-semibold text-ink">{{ p.name }}</p>
          <p class="text-[11px] text-muted">{{ p.location }}</p>
          <p v-if="p.description" class="line-clamp-3 text-xs text-ink/90">{{ p.description }}</p>
          <p class="mt-1.5 text-[11px] text-muted">
            {{ p.plannedStartDate }} → {{ p.plannedEndDate }}
          </p>
        </div>
      </button>
    </div>

    <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
      No projects yet.
    </p>
  </div>
</template>