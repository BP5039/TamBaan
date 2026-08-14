<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePortfolioStore } from '@/stores/portfolio'
import { labelForCategory } from '@/constants/workCategories'
import PortfolioItemCard from '@/components/profile/PortfolioItemCard.vue'
import AddPortfolioModal from '@/components/profile/AddPortfolioModal.vue'
import StarRating from '@/components/ui/StarRating.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const router = useRouter()
const authStore = useAuthStore()
const portfolioStore = usePortfolioStore()

const profile = computed(() => authStore.profile!)
const isProfessional = computed(() => profile.value.role === 'professional')

const showAddModal = ref(false)
const uploading = ref(false)
const modalUploadError = ref('')

onMounted(async () => {
  if (isProfessional.value && authStore.user) {
    await portfolioStore.fetchItems(authStore.user.uid)
  }
})

function openAddModal() {
  modalUploadError.value = ''
  showAddModal.value = true
}

async function handleSavePortfolioItem(payload: {
  files: File[]
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
</script>

<template>
  <div v-if="profile" class="mx-auto max-w-4xl px-4 py-8">
    <div class="mb-4 flex justify-end">
      <BaseButton variant="ghost" @click="router.push('/profile/edit')">Edit profile</BaseButton>
    </div>

    <div class="grid grid-cols-1 gap-6 rounded-card border border-cream bg-white p-6 md:grid-cols-[220px_1px_1fr]">
      <div class="flex flex-col items-center text-center md:items-start md:text-left">
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
            class="rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink"
          >
            {{ labelForCategory(cat) }}
          </span>
        </div>
      </div>

      <div class="hidden bg-cream md:block" />

      <div>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-medium text-muted">
            {{ isProfessional ? 'Previous work' : 'My projects' }}
          </h2>
          <BaseButton v-if="isProfessional" @click="openAddModal">+ Add work</BaseButton>
          <BaseButton v-else disabled title="Coming in a later milestone">
            + Create project
          </BaseButton>
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

        <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
          Project creation is part of the next milestone — check back soon.
        </p>
      </div>
    </div>

    <AddPortfolioModal
      v-if="showAddModal"
      :saving="uploading"
      :upload-error="modalUploadError"
      @close="showAddModal = false"
      @save="handleSavePortfolioItem"
    />
  </div>
</template>