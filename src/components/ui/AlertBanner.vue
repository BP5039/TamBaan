<script setup lang="ts">
withDefaults(
  defineProps<{
    variant: 'success' | 'pending' | 'error'
    title: string
    message?: string
  }>(),
  { message: '' },
)
</script>

<template>
  <div
    class="flex items-start gap-2 rounded-lg border p-3"
    :class="{
      'border-success-border bg-success-bg': variant === 'success',
      'border-pending-border bg-pending-bg': variant === 'pending',
      'border-error-border bg-error-bg': variant === 'error',
    }"
  >
    <svg
      v-if="variant === 'success'"
      class="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L8.3 11.6l6.3-6.3a1 1 0 011.4 0z"
        clip-rule="evenodd"
      />
    </svg>
    <svg
      v-else-if="variant === 'pending'"
      class="mt-0.5 h-4 w-4 flex-shrink-0 text-pending"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4c0 .3.1.5.3.7l3 3a1 1 0 001.4-1.4L11 9.6V6z"
        clip-rule="evenodd"
      />
    </svg>
    <svg
      v-else
      class="mt-0.5 h-4 w-4 flex-shrink-0 text-error"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 7a1 1 0 100 2 1 1 0 000-2z"
        clip-rule="evenodd"
      />
    </svg>
    <div>
      <p
        class="text-sm font-medium"
        :class="{
          'text-success-text': variant === 'success',
          'text-pending-text': variant === 'pending',
          'text-error-text': variant === 'error',
        }"
      >
        {{ title }}
      </p>
      <p v-if="message" class="text-xs" :class="{
        'text-success-text/80': variant === 'success',
        'text-pending-text/80': variant === 'pending',
        'text-error-text/80': variant === 'error',
      }">
        {{ message }}
      </p>
    </div>
  </div>
</template>
