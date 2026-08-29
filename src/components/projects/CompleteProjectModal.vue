<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import StarRatingInput from '@/components/ui/StarRatingInput.vue'

defineProps<{
  saving: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { workQuality: number; communication: number; timeliness: number; comment: string }]
}>()

const workQuality = ref(0)
const communication = ref(0)
const timeliness = ref(0)
const comment = ref('')
const validationError = ref('')

function submit() {
  validationError.value = ''
  if (!workQuality.value || !communication.value || !timeliness.value) {
    validationError.value = 'Rate all three categories before completing the project.'
    return
  }
  emit('save', {
    workQuality: workQuality.value,
    communication: communication.value,
    timeliness: timeliness.value,
    comment: comment.value.trim(),
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
    <div class="relative w-full max-w-sm rounded-card bg-white p-5">
      <div v-if="saving" class="absolute inset-0 z-10 rounded-card bg-white/60" />

      <h2 class="mb-1 text-lg font-semibold text-ink">Complete project</h2>
      <p class="mb-4 text-xs text-muted">
        Rate the work, then confirm. This can't be edited afterward.
      </p>

      <AlertBanner
        v-if="validationError"
        variant="error"
        title="Can't complete this yet"
        :message="validationError"
        class="mb-4"
      />
      <AlertBanner
        v-else-if="error"
        variant="error"
        title="Something went wrong"
        :message="error"
        class="mb-4"
      />

      <fieldset :disabled="saving" class="border-0 p-0">
        <div class="mb-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-ink">Work quality</span>
            <StarRatingInput v-model="workQuality" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-ink">Communication</span>
            <StarRatingInput v-model="communication" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-ink">Timeliness</span>
            <StarRatingInput v-model="timeliness" />
          </div>
        </div>

        <BaseTextarea
          v-model="comment"
          label="Comment"
          hint="Optional — anything future homeowners should know."
          placeholder="How did it go overall?"
          :rows="3"
          class="mb-5"
        />

        <div class="flex gap-2">
          <BaseButton variant="outline" full-width @click="$emit('close')">Cancel</BaseButton>
          <BaseButton full-width :loading="saving" @click="submit">Mark complete</BaseButton>
        </div>
      </fieldset>
    </div>
  </div>
</template>