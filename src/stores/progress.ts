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
import { useTasksStore } from '@/stores/tasks'
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
      files: File[],
      description: string,
      exifTimestamp: number | null,
      exifDevice: string | null,
      projectName: string,
    ) {
      const stamp = Date.now()
      const images = await Promise.all(
        files.map(async (file, i) => {
          const fullRef = ref(storage, `progress/${projectId}/${stamp}-${i}-full-${file.name}`)
          try {
            const thumbBlob = await createThumbnail(file)
            const thumbRef = ref(storage, `progress/${projectId}/${stamp}-${i}-thumb-${file.name}.jpg`)
            await Promise.all([uploadBytes(fullRef, file), uploadBytes(thumbRef, thumbBlob)])
            const [full, thumb] = await Promise.all([
              getDownloadURL(fullRef),
              getDownloadURL(thumbRef),
            ])
            return { full, thumb }
          } catch {
            await uploadBytes(fullRef, file)
            const full = await getDownloadURL(fullRef)
            return { full, thumb: full }
          }
        }),
      )

      const payload = {
        taskId,
        taskTitle,
        images,
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
        status: 'awaiting_review',
        updatedAt: Date.now(),
      })
      const tasksStore = useTasksStore()
      const task = tasksStore.tasks.find((t) => t.id === taskId)
      if (task) {
        task.status = 'awaiting_review'
        task.hasProgress = true
      }

      const notificationsStore = useNotificationsStore()
      await notificationsStore.notify(
        homeownerUid,
        'progress_submitted',
        'New progress to review',
        `A new update was submitted on "${taskTitle}"`,
        projectId,
        projectName,
      )
    },

    async verifyUpdate(projectId: string, updateId: string, contractorUid: string, taskTitle: string, projectName: string) {
      const u = this.updates.find((x) => x.id === updateId)
      await updateDoc(doc(db, 'projects', projectId, 'updates', updateId), {
        status: 'verified',
        sentBackReason: null,
        updatedAt: Date.now(),
      })
      if (u) {
        u.status = 'verified'
        u.sentBackReason = null
        await updateDoc(doc(db, 'projects', projectId, 'tasks', u.taskId), {
          status: 'done',
          updatedAt: Date.now(),
        })
        const tasksStore = useTasksStore()
        const task = tasksStore.tasks.find((t) => t.id === u.taskId)
        if (task) task.status = 'done'

        const thumbUrl = u.images[0]?.thumb ?? null
        if (thumbUrl) {
          await updateDoc(doc(db, 'projects', projectId), {
            lastVerifiedPhotoUrl: thumbUrl,
            updatedAt: Date.now(),
          })
        }
      }

      const notificationsStore = useNotificationsStore()
      await notificationsStore.notify(
        contractorUid,
        'progress_verified',
        'Update verified',
        `Your update on "${taskTitle}" was confirmed`,
        projectId,
        projectName,
      )
    },

    async sendBackUpdate(
      projectId: string,
      updateId: string,
      reason: string,
      contractorUid: string,
      taskTitle: string,
      projectName: string,
    ) {
      const u = this.updates.find((x) => x.id === updateId)
      await updateDoc(doc(db, 'projects', projectId, 'updates', updateId), {
        status: 'sent_back',
        sentBackReason: reason,
        updatedAt: Date.now(),
      })
      if (u) {
        u.status = 'sent_back'
        u.sentBackReason = reason
        await updateDoc(doc(db, 'projects', projectId, 'tasks', u.taskId), {
          status: 'sent_back',
          updatedAt: Date.now(),
        })
        const tasksStore = useTasksStore()
        const task = tasksStore.tasks.find((t) => t.id === u.taskId)
        if (task) task.status = 'sent_back'
      }

      const notificationsStore = useNotificationsStore()
      await notificationsStore.notify(
        contractorUid,
        'progress_sent_back',
        'Update sent back',
        `Your update on "${taskTitle}" needs changes: ${reason}`,
        projectId,
        projectName,
      )
    },
  },
})