<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import type { Notification } from '@/types/notification'

const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

onMounted(async () => {
  if (authStore.user) await notificationsStore.fetchNotifications(authStore.user.uid)
})

async function openNotification(n: Notification) {
  await notificationsStore.markAsRead(n.id)
  router.push(`/projects/${n.projectId}`)
}

async function markAll() {
  if (authStore.user) await notificationsStore.markAllAsRead(authStore.user.uid)
}

function borderColor(type: string) {
  if (type === 'progress_sent_back' || type === 'invitation_declined') return 'border-l-error'
  if (type === 'progress_verified') return 'border-l-success-border'
  return 'border-l-primary'
}

const hasUnread = computed(() => notificationsStore.unreadCount > 0)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-ink">Inbox</h1>
      <button
        v-if="hasUnread"
        type="button"
        class="text-xs font-medium text-primary underline"
        @click="markAll"
      >
        Mark all as read
      </button>
    </div>

    <p v-if="notificationsStore.loading" class="py-10 text-center text-sm text-muted">Loading…</p>

    <div v-else-if="notificationsStore.items.length" class="space-y-2">
      <button
        v-for="n in notificationsStore.items"
        :key="n.id"
        type="button"
        class="flex w-full items-start justify-between gap-2 rounded-r-lg border-l-[3px] bg-white p-3 text-left transition"
        :class="[borderColor(n.type), n.read ? 'opacity-60' : '']"
        @click="openNotification(n)"
      >
        <div class="min-w-0">
          <p class="text-sm text-ink" :class="n.read ? 'font-medium' : 'font-bold'">{{ n.title }}</p>
          <p class="text-xs text-muted">{{ n.message }}</p>
          <p class="mt-0.5 text-[11px] text-muted/70">{{ new Date(n.createdAt).toLocaleDateString() }}</p>
        </div>
        <span v-if="!n.read" class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
      </button>
    </div>

    <p v-else class="rounded-lg border border-dashed border-cream py-10 text-center text-sm text-muted">
      Nothing here yet.
    </p>
  </div>
</template>