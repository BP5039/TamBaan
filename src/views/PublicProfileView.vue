<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePublicProfileStore } from '@/stores/publicProfile'
import { usePortfolioStore } from '@/stores/portfolio'
import { labelForCategory } from '@/constants/workCategories'
import PortfolioItemCard from '@/components/profile/PortfolioItemCard.vue'
import StarRating from '@/components/ui/StarRating.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import InviteToProjectModal from '@/components/projects/InviteToProjectModal.vue'
import { formatLastSeen } from '@/utils/lastSeen'
import { activityRingClass } from '@/utils/lastSeen'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const publicProfileStore = usePublicProfileStore()
const portfolioStore = usePortfolioStore()

const username = computed(() => route.params.username as string)
const isProfessional = computed(() => publicProfileStore.profile?.role === 'professional')
const isOwnProfile = computed(
  () => authStore.isLoggedIn && authStore.profile?.username === username.value,
)

const showInviteModal = ref(false)
const canInvite = computed(
  () =>
    authStore.isLoggedIn &&
    authStore.profile?.role === 'homeowner' &&
    isProfessional.value &&
    !isOwnProfile.value,
)

function onInviteSent() {
  showInviteModal.value = false
}

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
  <div class="flex h-full flex-col overflow-hidden">
    <div class="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-8">
      <BaseButton variant="ghost" class="mb-4 flex-shrink-0 self-start" @click="router.push('/discover')">
        ← Back to search
      </BaseButton>

      <p v-if="publicProfileStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

      <p
        v-else-if="publicProfileStore.notFound"
        class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted"
      >
        This profile doesn't exist.
      </p>

      <template v-else-if="publicProfileStore.profile">
        <div
          v-if="isOwnProfile"
          class="mb-4 flex flex-shrink-0 items-center gap-2 rounded-lg border border-pending-border bg-pending-bg px-3 py-2.5"
        >
          <svg class="h-4 w-4 flex-shrink-0 text-pending" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4c0 .3.1.5.3.7l3 3a1 1 0 001.4-1.4L11 9.6V6z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="text-xs text-pending-text">
            You're viewing your own profile — this is what everyone else sees.
            <router-link to="/profile" class="font-medium underline">Go to your profile</router-link>
          </p>
        </div>

        <div
          class="grid flex-1 grid-cols-1 gap-6 overflow-hidden rounded-card border border-cream bg-white p-6 md:grid-cols-[220px_1px_1fr]"
        >
          <div class="flex flex-col overflow-y-auto text-center md:items-start md:text-left">
            <div
              class="mb-3 h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-[3px] bg-cream"
              :class="isProfessional ? activityRingClass(publicProfileStore.profile.lastActiveAt) : 'border-cream'"
            >
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
            <p v-if="isProfessional" class="mt-1 text-xs text-muted">
              {{ formatLastSeen(publicProfileStore.profile.lastActiveAt) }}
            </p>

            <template v-if="isProfessional">
              <p class="mt-2 text-xs text-muted">{{ publicProfileStore.profile.phone }}</p>
              <p v-if="publicProfileStore.profile.lineId" class="text-xs text-muted">
                LINE: {{ publicProfileStore.profile.lineId }}
              </p>
              <p v-if="publicProfileStore.profile.facebookId" class="text-xs text-muted">
                FB: {{ publicProfileStore.profile.facebookId }}
              </p>
            </template>
            <p class="text-xs text-muted">{{ publicProfileStore.profile.province }}</p>

            <div
              v-if="isProfessional && publicProfileStore.profile.workCategories.length"
              class="mt-3 flex flex-wrap gap-1.5"
            >
              <span
                v-for="cat in publicProfileStore.profile.workCategories"
                :key="cat"
                class="rounded-lg bg-cream px-2.5 py-1 text-[11px] font-medium text-ink"
              >
                {{ labelForCategory(cat) }}
              </span>
            </div>

            <BaseButton v-if="canInvite" class="mt-3 w-full flex-shrink-0" @click="showInviteModal = true">
              Invite to project
            </BaseButton>
          </div>

          <div class="hidden bg-cream md:block" />

          <div class="flex flex-col overflow-hidden">
            <h2 class="mb-4 flex-shrink-0 text-sm font-medium text-muted">
              {{ isProfessional ? 'Previous work' : 'Homeowner' }}
            </h2>

            <div class="flex-1 overflow-y-auto pr-1">
              <template v-if="isProfessional">
                <div v-if="portfolioStore.groupedByYear.length">
                  <div v-for="group in portfolioStore.groupedByYear" :key="group.year" class="mb-6 last:mb-0">
                    <h3 class="mb-3 text-sm font-semibold text-ink">{{ group.year }}</h3>
                    <div class="grid grid-cols-2 gap-4">
                      <PortfolioItemCard
                        v-for="item in group.items"
                        :key="item.id"
                        :item="item"
                        @open-project="(id) => router.push(`/projects/${id}`)"
                      />
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
    </div>

    <InviteToProjectModal
      v-if="showInviteModal && publicProfileStore.profile"
      :professional="publicProfileStore.profile"
      @close="showInviteModal = false"
      @sent="onInviteSent"
    />
  </div>
</template>