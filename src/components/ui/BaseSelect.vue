<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    options: string[]
    placeholder?: string
    error?: string
    required?: boolean
  }>(),
  {
    placeholder: 'Select…',
    error: '',
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
    <select
      :value="modelValue"
      :aria-invalid="!!error"
      class="w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink focus:outline-none"
      :class="[error ? 'border-error' : 'border-cream', !modelValue && 'text-muted']"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
    </select>
    <span v-if="error" class="mt-1 block text-xs text-error-text">{{ error }}</span>
  </label>
</template>
