<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { usePortfolioStore } from '@/stores/portfolio'
import ProjectCard from '@/components/projects/ProjectCard.vue'
import PortfolioItemCard from '@/components/profile/PortfolioItemCard.vue'
import { useMergedWork } from '@/utils/mergedWork'

const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const portfolioStore = usePortfolioStore()

const isProfessional = computed(() => authStore.profile?.role === 'professional')

// Same merge as ProfileView's own grid — a professional's past-work entries
// belong here too, not just on their profile page.
const manualPastWork = computed(() => portfolioStore.items.filter((i) => i.source === 'manual'))
const mergedWorkByYear = useMergedWork(manualPastWork, computed(() => projectsStore.myProjects))

onMounted(async () => {
  if (!authStore.user || !authStore.profile) return
  if (isProfessional.value) {
    await portfolioStore.fetchItems(authStore.user.uid)
  }
  await projectsStore.fetchMyProjects(authStore.user.uid, authStore.profile.role)
})

async function handleDeleteItem(id: string) {
  if (!authStore.user) return
  const item = portfolioStore.items.find((i) => i.id === id)
  if (item) await portfolioStore.removeItem(authStore.user.uid, item)
}
</script>

<template>
  <div class="w-full px-4 py-8 sm:px-[15%]">
    <div class="rounded-card border border-cream bg-white p-6">
      <h1 class="mb-1 text-xl font-semibold text-ink">My projects</h1>
      <p class="mb-6 text-xs text-muted">
        Projects where you're the {{ isProfessional ? 'professional' : 'homeowner' }}{{ isProfessional ? ', plus the past work you\'ve uploaded' : '' }}.
      </p>

      <p v-if="projectsStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

      <template v-else-if="isProfessional">
        <div v-if="mergedWorkByYear.length">
          <div v-for="group in mergedWorkByYear" :key="group.year" class="mb-6 last:mb-0">
            <h3 class="mb-3 text-sm font-semibold text-ink">{{ group.year }}</h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <template v-for="entry in group.items" :key="entry.key">
                <PortfolioItemCard
                  v-if="entry.type === 'manual'"
                  :item="entry.item"
                  can-delete
                  @delete="handleDeleteItem(entry.item.id)"
                />
                <ProjectCard
                  v-else
                  :project="entry.project"
                  :unread-count="entry.project.unreadCountContractor"
                  class="cursor-pointer"
                  @click="router.push(`/projects/${entry.project.id}`)"
                />
              </template>
            </div>
          </div>
        </div>
        <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
          No work yet. Active projects and finished work will show up here.
        </p>
      </template>

      <template v-else>
        <div v-if="projectsStore.groupedByYear.length">
          <div v-for="group in projectsStore.groupedByYear" :key="group.year" class="mb-6 last:mb-0">
            <h3 class="mb-3 text-sm font-semibold text-ink">{{ group.year }}</h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="p in group.items"
                :key="p.id"
                role="link"
                tabindex="0"
                class="cursor-pointer text-left hover:opacity-90"
                @click="router.push(`/projects/${p.id}`)"
                @keydown.enter="router.push(`/projects/${p.id}`)"
              >
                <ProjectCard :project="p" :unread-count="p.unreadCountHomeowner" />
              </div>
            </div>
          </div>
        </div>
        <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
          No projects yet.
        </p>
      </template>
    </div>
  </div>
</template>