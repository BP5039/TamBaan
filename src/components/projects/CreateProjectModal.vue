<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { THAI_PROVINCES } from '@/constants/provinces'

const emit = defineEmits<{ close: []; created: [projectId: string] }>()

const authStore = useAuthStore()
const projectsStore = useProjectsStore()

const name = ref('')
const description = ref('')
const plannedStartDate = ref('')
const plannedEndDate = ref('')
const error = ref('')
const saving = ref(false)
const location = ref('')

async function submit() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = 'Give the project a name.'
    return
  }
  if (!location.value) {
    error.value = 'Select a location for the project.'
    return
  }
  if (!plannedStartDate.value || !plannedEndDate.value) {
    error.value = 'Pick a planned start and end date.'
    return
  }
  if (plannedEndDate.value < plannedStartDate.value) {
    error.value = 'End date must be after the start date.'
    return
  }
  if (!authStore.profile) return

  saving.value = true
  try {
    const project = await projectsStore.createProject(authStore.profile, {
      name: name.value.trim(),
      description: description.value.trim(),
      location: location.value,
      plannedStartDate: plannedStartDate.value,
      plannedEndDate: plannedEndDate.value,
    })
    emit('created', project.id)
  } catch (err) {
    console.error('createProject failed:', err)
    error.value = "Couldn't create the project. Please try again."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="relative w-full max-w-sm rounded-card bg-white p-5">
      <h2 class="mb-4 text-lg font-semibold text-ink">Create project</h2>

      <AlertBanner v-if="error" variant="error" title="Can't create this yet" :message="error" class="mb-4" />

      <fieldset :disabled="saving" class="border-0 p-0">
        <BaseInput
        v-model="name"
        label="Project name"
        hint="A name you and your contractor will both recognize."
        placeholder="e.g. Kitchen renovation"
        required
        class="mb-4"
        />
        <BaseSelect
        v-model="location"
        label="Location"
        :options="THAI_PROVINCES"
        hint="Where the work is happening."
        required
        class="mb-4"
        />
        <BaseTextarea
        v-model="description"
        label="Description"
        hint="Optional — any context that helps your contractor understand the scope."
        placeholder="What's this project about?"
        :rows="3"
        class="mb-4"
        />
        <div class="mb-5 grid grid-cols-2 gap-3">
          <BaseInput v-model="plannedStartDate" type="date" label="Planned start" required />
          <BaseInput v-model="plannedEndDate" type="date" label="Planned end" required />
        </div>
        <div class="flex gap-2">
          <BaseButton variant="outline" full-width @click="$emit('close')">Cancel</BaseButton>
          <BaseButton full-width :loading="saving" @click="submit">Create</BaseButton>
        </div>
      </fieldset>
    </div>
  </div>
</template>