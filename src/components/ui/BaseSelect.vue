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
    <div class="relative">
      <select
        :value="modelValue"
        :aria-invalid="!!error"
        class="w-full appearance-none rounded-lg border bg-white py-2.5 pl-3 pr-8 text-sm text-ink focus:outline-none"
        :class="[error ? 'border-error' : 'border-cream', !modelValue && 'text-muted']"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <svg
        class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
        viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5L10 12.5L15 7.5" />
      </svg>
    </div>
    <span v-if="error" class="mt-1 block text-xs text-error-text">{{ error }}</span>
  </label>
</template>