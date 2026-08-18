<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    hint?: string
    type?: string
    placeholder?: string
    error?: string
    required?: boolean
    autocomplete?: string
  }>(),
  {
    type: 'text',
    placeholder: '',
    error: '',
    required: false,
    autocomplete: 'off',
  },
)

defineEmits<{ 'update:modelValue': [value: string] }>()

const visible = ref(false)
const isPassword = computed(() => props.type === 'password')
const resolvedType = computed(() => (isPassword.value && visible.value ? 'text' : props.type))
</script>

<template>
  <label class="block">
    <span v-if="label" class="block text-sm font-medium text-ink" :class="hint ? 'mb-0.5' : 'mb-1.5'">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>
    <span v-if="hint" class="mb-1.5 block text-xs leading-snug text-muted">{{ hint }}</span>
    <div class="relative">
      <input
        :type="resolvedType"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :aria-invalid="!!error"
        class="w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
        :class="[error ? 'border-error' : 'border-cream', isPassword && 'pr-10']"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="isPassword"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-ink"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      >
        <svg v-if="!visible" class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" />
          <circle cx="10" cy="10" r="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" />
          <circle cx="10" cy="10" r="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path stroke-linecap="round" d="M3 3l14 14" />
        </svg>
      </button>
    </div>
    <span v-if="error" class="mt-1 block text-xs text-error-text">{{ error }}</span>
  </label>
</template>