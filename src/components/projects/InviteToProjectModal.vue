<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import type { UserProfile } from '@/types'

const props = defineProps<{ professional: UserProfile }>()
const emit = defineEmits<{ close: []; sent: [] }>()

const authStore = useAuthStore()
const projectsStore = useProjectsStore()

const selectedProjectId = ref('')
const hasDiscussed = ref(false)
const error = ref('')
const sending = ref(false)

const invitableProjects = computed(() =>
  projectsStore.myProjects.filter((p) => !p.contractorUid && !p.pendingInvitationUid),
)

onMounted(async () => {
  if (authStore.user) {
    await projectsStore.fetchMyProjects(authStore.user.uid, 'homeowner')
  }
})

async function submit() {
  error.value = ''
  if (!selectedProjectId.value) {
    error.value = 'Choose a project to invite them to.'
    return
  }
  if (!hasDiscussed.value) {
    error.value = "Confirm you've already discussed this project with them first."
    return
  }
  sending.value = true
  try {
    await projectsStore.inviteContractor(
      selectedProjectId.value,
      props.professional.uid,
      `${props.professional.firstName} ${props.professional.lastName}`,
      props.professional.username,
    )
    emit('sent')
  } catch (err) {
    console.error('inviteContractor failed:', err)
    error.value = "Couldn't send the invitation. Please try again."
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="w-full max-w-sm rounded-card bg-white p-5">
      <h2 class="mb-1 text-lg font-semibold text-ink">Invite to project</h2>
      <p class="mb-4 text-xs text-muted">Inviting {{ professional.firstName }} {{ professional.lastName }}</p>

      <AlertBanner v-if="error" variant="error" title="Can't send this yet" :message="error" class="mb-4" />

      <div
        v-if="invitableProjects.length === 0"
        class="mb-4 rounded-lg border border-dashed border-cream p-4 text-center"
      >
        <p class="text-xs text-muted">
          You don't have a project ready to invite them to yet. Create one from your profile first.
        </p>
      </div>

      <template v-else>
        <p class="mb-1.5 text-sm font-medium text-ink">Choose project</p>
        <div class="relative mb-4">
          <select
            v-model="selectedProjectId"
            class="w-full appearance-none rounded-lg border border-cream bg-white py-2.5 pl-3 pr-8 text-sm text-ink focus:outline-none"
          >
            <option value="" disabled>Select a project…</option>
            <option v-for="p in invitableProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <svg
            class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5L10 12.5L15 7.5" />
          </svg>
        </div>

        <label class="mb-5 flex items-start gap-2 text-xs text-ink">
          <input v-model="hasDiscussed" type="checkbox" class="mt-0.5 flex-shrink-0" />
          I've already discussed this project with them (LINE, Facebook, or phone) before inviting.
        </label>
      </template>

      <div class="flex gap-2">
        <BaseButton variant="outline" full-width @click="$emit('close')">Cancel</BaseButton>
        <BaseButton v-if="invitableProjects.length > 0" full-width :disabled="!hasDiscussed" :loading="sending" @click="submit">
          Send invitation
        </BaseButton>
      </div>
    </div>
  </div>
  </Teleport>
</template>