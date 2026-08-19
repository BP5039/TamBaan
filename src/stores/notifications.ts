import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Notification, NotificationType } from '@/types/notification'

interface NotificationsState {
  items: Notification[]
  loading: boolean
}

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
    async fetchNotifications(uid: string) {
      this.loading = true
      try {
        const q = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', uid),
          orderBy('createdAt', 'desc'),
        )
        const snap = await getDocs(q)
        this.items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification)
      } catch (err) {
        console.error('fetchNotifications failed:', err)
      } finally {
        this.loading = false
      }
    },

    async markAsRead(notificationId: string) {
      const n = this.items.find((x) => x.id === notificationId)
      if (!n || n.read) return
      n.read = true
      try {
        await updateDoc(doc(db, 'notifications', notificationId), { read: true })
      } catch (err) {
        console.error('markAsRead failed:', err)
        n.read = false
      }
    },

    async markAllAsRead(uid: string) {
      const unread = this.items.filter((n) => !n.read)
      unread.forEach((n) => (n.read = true))
      try {
        await Promise.all(
          unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })),
        )
      } catch (err) {
        console.error('markAllAsRead failed:', err)
        await this.fetchNotifications(uid)
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
        await addDoc(collection(db, 'notifications'), {
          recipientUid,
          type,
          title,
          message,
          projectId,
          projectName,
          read: false,
          createdAt: Date.now(),
        })
      } catch (err) {
        console.error('notify failed:', err)
      }
    },
  },
})