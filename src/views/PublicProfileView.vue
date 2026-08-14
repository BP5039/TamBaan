<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePublicProfileStore } from '@/stores/publicProfile'
import { usePortfolioStore } from '@/stores/portfolio'
import { labelForCategory } from '@/constants/workCategories'
import PortfolioItemCard from '@/components/profile/PortfolioItemCard.vue'
import StarRating from '@/components/ui/StarRating.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const publicProfileStore = usePublicProfileStore()
const portfolioStore = usePortfolioStore()

const username = computed(() => route.params.username as string)
const isProfessional = computed(() => publicProfileStore.profile?.role === 'professional')

async function load() {
  await publicProfileStore.loadByUsername(username.value)
  if (publicProfileStore.profile?.role === 'professional') {
    await portfolioStore.fetchItems(publicProfileStore.profile.uid)
  }
}

onMounted(load)
watch(username, load)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <BaseButton variant="ghost" class="mb-4" @click="router.push('/contractors')">
      ← Back to search
    </BaseButton>

    <p v-if="publicProfileStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <p
      v-else-if="publicProfileStore.notFound"
      class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
    >
      This profile doesn't exist.
    </p>

    <div
      v-else-if="publicProfileStore.profile"
      class="grid grid-cols-1 gap-6 rounded-card border border-cream bg-white p-6 md:grid-cols-[220px_1px_1fr]"
    >
      <div class="flex flex-col items-center text-center md:items-start md:text-left">
        <div class="mb-3 h-20 w-20 overflow-hidden rounded-full bg-cream">
          <img
            v-if="publicProfileStore.profile.photoURL"
            :src="publicProfileStore.profile.photoURL"
            alt=""
            class="h-full w-full object-cover"
          />
        </div>
        <p class="font-medium text-ink">
          {{ publicProfileStore.profile.firstName }} {{ publicProfileStore.profile.lastName }}
        </p>
        <p class="text-xs text-muted">@{{ publicProfileStore.profile.username }}</p>

        <StarRating
          v-if="isProfessional"
          :rating="publicProfileStore.profile.rating ?? null"
          :count="publicProfileStore.profile.ratingCount ?? 0"
          class="mt-2 justify-center md:justify-start"
        />

        <p class="mt-2 text-xs text-muted">{{ publicProfileStore.profile.province }}</p>

        <div v-if="isProfessional && publicProfileStore.profile.workCategories.length" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="cat in publicProfileStore.profile.workCategories"
            :key="cat"
            class="rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink"
          >
            {{ labelForCategory(cat) }}
          </span>
        </div>
      </div>

      <div class="hidden bg-cream md:block" />

      <div>
        <h2 class="mb-4 text-sm font-medium text-muted">
          {{ isProfessional ? 'Previous work' : 'Homeowner' }}
        </h2>

        <template v-if="isProfessional">
          <div v-if="portfolioStore.groupedByYear.length">
            <div v-for="group in portfolioStore.groupedByYear" :key="group.year" class="mb-6 last:mb-0">
              <h3 class="mb-3 text-sm font-semibold text-ink">{{ group.year }}</h3>
              <div class="grid grid-cols-2 gap-4">
                <PortfolioItemCard v-for="item in group.items" :key="item.id" :item="item" />
              </div>
            </div>
          </div>
          <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
            No work uploaded yet.
          </p>
        </template>

        <p v-else class="text-sm text-muted">
          This is a homeowner profile — nothing to show here yet.
        </p>
      </div>
    </div>
  </div>
</template>