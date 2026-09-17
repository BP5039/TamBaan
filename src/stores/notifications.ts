import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Notification, NotificationType } from '@/types/notification'

interface NotificationsState {
  items: Notification[]
  loading: boolean
}

// Kept outside reactive state — Pinia doesn't need to track a function reference.
let unsubscribeFn: Unsubscribe | null = null

export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    items: [],
    loading: false,
  }),

  getters: {
    unreadCount(state): number {
      return state.items.filter((n) => !n.read).length
    },
  },

  actions: {
    /** New: subcollection-based, path-scoped — no where() clause needed since the path itself is the filter. Not wired to any UI yet. */
    subscribeToUserNotifications(uid: string) {
      this.unsubscribeAll()
      this.loading = true
      const q = query(
        collection(db, 'users', uid, 'notifications'),
        orderBy('createdAt', 'desc'),
      )
      unsubscribeFn = onSnapshot(
        q,
        (snap) => {
          this.items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification)
          this.loading = false
        },
        (err) => {
          console.error('notifications listener failed:', err)
          this.loading = false
        },
      )
    },

    /** Starts a live listener — items and unreadCount update instantly, app-wide, with no manual refetch needed. */
    subscribe(uid: string) {
      this.unsubscribeAll()
      this.loading = true
      const q = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', uid),
        orderBy('createdAt', 'desc'),
      )
      unsubscribeFn = onSnapshot(
        q,
        (snap) => {
          this.items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification)
          this.loading = false
        },
        (err) => {
          console.error('notifications listener failed:', err)
          this.loading = false
        },
      )
    },

    /** Call on logout so we stop listening and don't leak the previous user's data into the next session. */
    unsubscribeAll() {
      if (unsubscribeFn) {
        unsubscribeFn()
        unsubscribeFn = null
      }
      this.items = []
    },

    async markAsRead(notificationId: string) {
      const n = this.items.find((x) => x.id === notificationId)
      if (!n || n.read) return
      try {
        await updateDoc(doc(db, 'users', n.recipientUid, 'notifications', notificationId), { read: true })
      } catch (err) {
        console.error('markAsRead failed:', err)
      }
    },

    async markAllAsRead() {
      const unread = this.items.filter((n) => !n.read)
      try {
        await Promise.all(
          unread.map((n) => updateDoc(doc(db, 'users', n.recipientUid, 'notifications', n.id), { read: true })),
        )
      } catch (err) {
        console.error('markAllAsRead failed:', err)
      }
    },

    /** Fire-and-forget by design — a failed notification write should never block the real action it's attached to. */
    async notify(
      recipientUid: string,
      type: NotificationType,
      title: string,
      message: string,
      projectId: string,
      projectName: string,
    ) {
      try {
        const payload = {
          recipientUid,
          type,
          title,
          message,
          projectId,
          projectName,
          read: false,
          createdAt: Date.now(),
        }
        await Promise.all([
          addDoc(collection(db, 'notifications'), payload),
          addDoc(collection(db, 'users', recipientUid, 'notifications'), payload),
        ])
      } catch (err) {
        console.error('notify failed:', err)
      }
    },
  },
})