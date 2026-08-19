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

const roleLabel = computed(() =>
  authStore.profile?.role === 'homeowner' ? 'homeowner' : 'contractor',
)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="mb-1 text-xl font-semibold text-ink">My projects</h1>
    <p class="mb-6 text-xs text-muted">Projects where you're the {{ roleLabel }}.</p>

    <p v-if="projectsStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <div v-else-if="projectsStore.myProjects.length" class="space-y-2">
      <button
        v-for="p in projectsStore.myProjects"
        :key="p.id"
        type="button"
        class="flex w-full items-center justify-between rounded-lg border border-cream bg-white p-3 text-left hover:border-primary/50"
        @click="router.push(`/projects/${p.id}`)"
      >
        <div>
          <p class="text-sm text-ink">{{ p.name }}</p>
          <p class="text-xs text-muted">{{ p.location }}</p>
        </div>
        <span class="rounded-lg px-2 py-0.5 text-[10px] font-medium" :class="statusStyle(p.status)">
          {{ p.status === 'active' ? 'Active' : p.status === 'completed' ? 'Completed' : 'Pending' }}
        </span>
      </button>
    </div>

    <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
      No projects yet.
    </p>
  </div>
</template>