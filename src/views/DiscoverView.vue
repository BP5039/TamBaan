<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDiscoveryStore } from '@/stores/discovery'
import { WORK_CATEGORIES } from '@/constants/workCategories'
import { THAI_PROVINCES } from '@/constants/provinces'
import type { WorkCategoryValue } from '@/types'
import ContractorCard from '@/components/discovery/ContractorCard.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const discoveryStore = useDiscoveryStore()

const ALL_PROVINCES = 'All provinces'
const selectedCategories = ref<WorkCategoryValue[]>([])
const selectedProvince = ref(ALL_PROVINCES)

function toggleCategory(value: WorkCategoryValue) {
  const set = new Set(selectedCategories.value)
  set.has(value) ? set.delete(value) : set.add(value)
  selectedCategories.value = Array.from(set)
}

function runSearch() {
  discoveryStore.search({
    categories: selectedCategories.value,
    province: selectedProvince.value === ALL_PROVINCES ? null : selectedProvince.value,
  })
}

watch([selectedCategories, selectedProvince], runSearch, { immediate: true })
</script>

<template>
  <div>
    <div class="border-b border-cream px-4 py-3">
      <div class="mx-auto max-w-4xl">
        <select
          v-model="selectedProvince"
          class="mb-3 w-full max-w-[220px] rounded-lg border border-cream bg-white px-3 py-2 text-sm text-ink focus:outline-none"
        >
          <option>{{ ALL_PROVINCES }}</option>
          <option v-for="p in THAI_PROVINCES" :key="p" :value="p">{{ p }}</option>
        </select>

        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="cat in WORK_CATEGORIES"
            :key="cat.value"
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-medium transition"
            :class="
              selectedCategories.includes(cat.value)
                ? 'border-primary bg-primary text-white'
                : 'border-cream text-muted hover:border-primary/50 hover:text-ink'
            "
            @click="toggleCategory(cat.value)"
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

      <div v-else-if="discoveryStore.results.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ContractorCard v-for="profile in discoveryStore.results" :key="profile.uid" :profile="profile" />
      </div>

      <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
        No contractors match those filters yet.
      </p>
    </div>
  </div>
</template>