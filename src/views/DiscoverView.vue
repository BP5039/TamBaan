<script setup lang="ts">
import { onMounted } from 'vue'
import { useDiscoveryStore } from '@/stores/discovery'
import { WORK_CATEGORIES } from '@/constants/workCategories'
import { THAI_PROVINCES } from '@/constants/provinces'
import ProfessionalCard from '@/components/discovery/ProfessionalCard.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const discoveryStore = useDiscoveryStore()

const ALL_PROVINCES = 'All provinces'

function onProvinceChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  discoveryStore.setProvince(value === ALL_PROVINCES ? null : value)
}

onMounted(() => {
  discoveryStore.runSearch()
})
</script>

<template>
  <div>
    <div class="border-b border-cream px-4 py-3">
      <div class="mx-auto max-w-4xl">
        <select
          :value="discoveryStore.selectedProvince ?? ALL_PROVINCES"
          class="mb-3 w-full max-w-[220px] rounded-lg border border-cream bg-white px-3 py-2 text-sm text-ink focus:outline-none"
          @change="onProvinceChange"
        >
          <option>{{ ALL_PROVINCES }}</option>
          <option v-for="p in THAI_PROVINCES" :key="p" :value="p">{{ p }}</option>
        </select>

        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="cat in WORK_CATEGORIES"
            :key="cat.value"
            type="button"
            class="rounded-lg border px-2.5 py-1 text-xs font-medium transition"
            :class="
              discoveryStore.selectedCategories.includes(cat.value)
                ? 'border-primary bg-primary text-white'
                : 'border-cream text-muted hover:border-primary/50 hover:text-ink'
            "
            @click="discoveryStore.toggleCategory(cat.value)"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-4xl px-4 py-6">
      <AlertBanner
        v-if="discoveryStore.error"
        variant="error"
        title="Couldn't load results"
        :message="discoveryStore.error"
        class="mb-4"
      />

      <p v-if="discoveryStore.loading" class="py-10 text-center text-sm text-muted">Searching…</p>

      <div v-else-if="discoveryStore.filteredResults.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ProfessionalCard v-for="profile in discoveryStore.filteredResults" :key="profile.uid" :profile="profile" />
      </div>

      <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
        No professionals match those filters yet.
      </p>
    </div>
  </div>
</template>