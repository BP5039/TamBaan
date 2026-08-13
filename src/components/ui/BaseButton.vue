<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'outline' | 'ghost'
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
    fullWidth?: boolean
  }>(),
  {
    variant: 'primary',
    type: 'button',
    loading: false,
    disabled: false,
    fullWidth: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
    :class="[
      fullWidth && 'w-full',
      variant === 'primary' && 'bg-primary text-white hover:bg-primary-dark',
      variant === 'outline' && 'border border-cream text-ink hover:bg-cream/40',
      variant === 'ghost' && 'text-muted hover:text-ink',
    ]"
  >
    <svg
      v-if="loading"
      class="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
    <slot />
  </button>
</template>
