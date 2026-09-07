<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import ProjectCard from '@/components/projects/ProjectCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()

onMounted(async () => {
  if (authStore.user && authStore.profile) {
    await projectsStore.fetchMyProjects(authStore.user.uid, authStore.profile.role)
  }
})

const roleLabel = computed(() =>
  authStore.profile?.role === 'homeowner' ? 'homeowner' : 'professional',
)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <div class="rounded-card border border-cream bg-white p-6">
      <h1 class="mb-1 text-xl font-semibold text-ink">My projects</h1>
      <p class="mb-6 text-xs text-muted">Projects where you're the {{ roleLabel }}.</p>

      <p v-if="projectsStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

      <div v-else-if="projectsStore.groupedByYear.length">
        <div v-for="group in projectsStore.groupedByYear" :key="group.year" class="mb-6 last:mb-0">
          <h3 class="mb-3 text-sm font-semibold text-ink">{{ group.year }}</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div
              v-for="p in group.items"
              :key="p.id"
              role="link"
              tabindex="0"
              class="cursor-pointer text-left hover:opacity-90"
              @click="router.push(`/projects/${p.id}`)"
              @keydown.enter="router.push(`/projects/${p.id}`)"
            >
              <ProjectCard :project="p" />
            </div>
          </div>
        </div>
      </div>

      <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
        No projects yet.
      </p>
    </div>
  </div>
</template>