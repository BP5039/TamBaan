import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/firebase/config'
import { createThumbnail } from '@/utils/imageResize'
import { useNotificationsStore } from '@/stores/notifications'
import type { ProgressUpdate } from '@/types/project'

interface ProgressState {
  updates: ProgressUpdate[]
  loading: boolean
  error: string
}

export const useProgressStore = defineStore('progress', {
  state: (): ProgressState => ({
    updates: [],
    loading: false,
    error: '',
  }),

  actions: {
    async fetchUpdates(projectId: string) {
      this.loading = true
      this.error = ''
      try {
        const q = query(
          collection(db, 'projects', projectId, 'updates'),
          orderBy('createdAt', 'desc'),
        )
        const snap = await getDocs(q)
        this.updates = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProgressUpdate)
      } catch (err) {
        console.error('fetchUpdates failed:', err)
        this.error = "Couldn't load the timeline."
      } finally {
        this.loading = false
      }
    },

    async addUpdate(
      projectId: string,
      homeownerUid: string,
      taskId: string,
      taskTitle: string,
      file: File,
      description: string,
      exifTimestamp: number | null,
      exifDevice: string | null,
    ) {
      const stamp = Date.now()
      const fullRef = ref(storage, `progress/${projectId}/${stamp}-full-${file.name}`)

      let thumbUrl: string
      let fullUrl: string
      try {
        const thumbBlob = await createThumbnail(file)
        const thumbRef = ref(storage, `progress/${projectId}/${stamp}-thumb-${file.name}.jpg`)
        await Promise.all([uploadBytes(fullRef, file), uploadBytes(thumbRef, thumbBlob)])
        ;[fullUrl, thumbUrl] = await Promise.all([
          getDownloadURL(fullRef),
          getDownloadURL(thumbRef),
        ])
      } catch {
        await uploadBytes(fullRef, file)
        fullUrl = await getDownloadURL(fullRef)
        thumbUrl = fullUrl
      }

      const payload = {
        taskId,
        taskTitle,
        images: [{ thumb: thumbUrl, full: fullUrl }],
        description,
        status: 'pending' as const,
        sentBackReason: null,
        exifTimestamp,
        exifDevice,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const docRef = await addDoc(collection(db, 'projects', projectId, 'updates'), payload)
      this.updates.unshift({ id: docRef.id, ...payload })

      await updateDoc(doc(db, 'projects', projectId, 'tasks', taskId), {
        hasProgress: true,
        updatedAt: Date.now(),
      })

      const notificationsStore = useNotificationsStore()
      await notificationsStore.notify(
        homeownerUid,
        'progress_submitted',
        'New progress to review',
        `A new update was submitted on "${taskTitle}"`,
        projectId,
        '',
      )
    },

    async verifyUpdate(projectId: string, updateId: string, contractorUid: string, taskTitle: string) {
      await updateDoc(doc(db, 'projects', projectId, 'updates', updateId), {
        status: 'verified',
        sentBackReason: null,
        updatedAt: Date.now(),
      })
      const u = this.updates.find((x) => x.id === updateId)
      if (u) {
        u.status = 'verified'
        u.sentBackReason = null
      }

      const notificationsStore = useNotificationsStore()
      await notificationsStore.notify(
        contractorUid,
        'progress_verified',
        'Update verified',
        `Your update on "${taskTitle}" was confirmed`,
        projectId,
        '',
      )
    },

    async sendBackUpdate(
      projectId: string,
      updateId: string,
      reason: string,
      contractorUid: string,
      taskTitle: string,
    ) {
      await updateDoc(doc(db, 'projects', projectId, 'updates', updateId), {
        status: 'sent_back',
        sentBackReason: reason,
        updatedAt: Date.now(),
      })
      const u = this.updates.find((x) => x.id === updateId)
      if (u) {
        u.status = 'sent_back'
        u.sentBackReason = reason
      }

      const notificationsStore = useNotificationsStore()
      await notificationsStore.notify(
        contractorUid,
        'progress_sent_back',
        'Update sent back',
        `Your update on "${taskTitle}" needs changes: ${reason}`,
        projectId,
        '',
      )
    },
  },
})