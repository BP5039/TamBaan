<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    error?: string
    rows?: number
    maxlength?: number
    required?: boolean
  }>(),
  {
    placeholder: '',
    error: '',
    rows: 4,
    required: false,
  },
)

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-ink">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :aria-invalid="!!error"
      class="w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
      :class="error ? 'border-error' : 'border-cream'"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="mt-1 flex items-center justify-between">
      <span v-if="error" class="text-xs text-error-text">{{ error }}</span>
      <span v-if="maxlength" class="ml-auto text-xs text-muted">
        {{ modelValue.length }}/{{ maxlength }}
      </span>
    </div>
  </label>
</template>
