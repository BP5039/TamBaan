<script setup lang="ts">
import { useAuthModalStore } from '@/stores/authModal'

const authModalStore = useAuthModalStore()

const steps = [
  { title: 'Discover contractors', description: 'Browse real portfolios by trade and province' },
  { title: 'Invite them to your project', description: 'Create a renovation project and bring them on board' },
  { title: 'Track real progress', description: 'Dated photo updates you confirm as work happens' },
]
</script>

<template>
  <div>
    <div class="px-4 py-14 text-center sm:py-16">
      <h1 class="mx-auto mb-2.5 max-w-md font-display text-2xl font-semibold text-ink sm:text-3xl">
        Find contractors. See their real work.
      </h1>
      <p class="mx-auto mb-6 max-w-sm text-sm text-muted">
        TamBaan helps Thai homeowners hire with confidence — verified portfolios, tracked
        progress, no more guessing.
      </p>
      <div class="flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          @click="authModalStore.openRegister()"
        >
          Get started
        </button>
        <router-link
          to="/contractors"
          class="rounded-lg border border-cream bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-cream/40"
        >
          Find a contractor
        </router-link>
      </div>
    </div>

    <div class="border-t border-cream bg-white px-4 py-9">
      <p class="mb-6 text-center text-xs font-semibold uppercase tracking-wide text-muted">
        How it works
      </p>
      <div class="mx-auto grid max-w-xl grid-cols-1 gap-6 sm:grid-cols-3">
        <div v-for="(step, i) in steps" :key="step.title" class="text-center">
          <div class="mx-auto mb-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            {{ i + 1 }}
          </div>
          <p class="mb-1 text-sm font-semibold text-ink">{{ step.title }}</p>
          <p class="text-xs text-muted">{{ step.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>