import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/firebase/config'
import { createThumbnail } from '@/utils/imageResize'
import { useNotificationsStore } from '@/stores/notifications'
import type { ProjectTask, TaskStatus } from '@/types/project'
import type { PortfolioImage } from '@/types'

let unsubscribeTasksFn: Unsubscribe | null = null

interface TasksState {
  tasks: ProjectTask[]
  loading: boolean
  error: string
}

async function uploadTaskReferenceImage(
  projectId: string,
  taskId: string,
  file: File,
  index: number,
): Promise<PortfolioImage> {
  const stamp = `${Date.now()}-${index}`
  const fullRef = ref(storage, `projects/${projectId}/tasks/${taskId}/reference/${stamp}-full-${file.name}`)

  let thumbBlob: Blob | null = null
  try {
    thumbBlob = await createThumbnail(file)
  } catch {
    thumbBlob = null
  }

  if (!thumbBlob) {
    await uploadBytes(fullRef, file)
    const full = await getDownloadURL(fullRef)
    return { full, thumb: full }
  }

  const thumbRef = ref(storage, `projects/${projectId}/tasks/${taskId}/reference/${stamp}-thumb-${file.name}.jpg`)
  await Promise.all([uploadBytes(fullRef, file), uploadBytes(thumbRef, thumbBlob)])
  const [full, thumb] = await Promise.all([getDownloadURL(fullRef), getDownloadURL(thumbRef)])
  return { full, thumb }
}

export const useTasksStore = defineStore('tasks', {
  state: (): TasksState => ({
    tasks: [],
    loading: false,
    error: '',
  }),

  actions: {
    subscribeToTasks(projectId: string) {
      this.unsubscribeFromTasks()
      this.loading = true
      const q = query(collection(db, 'projects', projectId, 'tasks'), orderBy('createdAt', 'asc'))
      unsubscribeTasksFn = onSnapshot(
        q,
        (snap) => {
          this.tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProjectTask)
          this.loading = false
        },
        (err) => {
          console.error('tasks listener failed:', err)
          this.error = "Couldn't load tasks."
          this.loading = false
        },
      )
    },

    unsubscribeFromTasks() {
      if (unsubscribeTasksFn) {
        unsubscribeTasksFn()
        unsubscribeTasksFn = null
      }
    },

    async addTask(
      projectId: string,
      title: string,
      description: string,
      contractorUid: string | null,
      projectName: string,
      files: File[] = [],
    ) {
      const payload = {
        title,
        description,
        status: 'not_started' as TaskStatus,
        hasProgress: false,
        referenceImages: [] as PortfolioImage[],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      const docRef = await addDoc(collection(db, 'projects', projectId, 'tasks'), payload)

      // Uploaded after the doc exists — Storage rules verify hasProgress by
      // reading the Firestore doc, so it has to be there first.
      if (files.length) {
        const referenceImages = await Promise.all(
          files.map((f, i) => uploadTaskReferenceImage(projectId, docRef.id, f, i)),
        )
        await updateDoc(doc(db, 'projects', projectId, 'tasks', docRef.id), {
          referenceImages,
          updatedAt: Date.now(),
        })
      }

      // Not pushed into local state here — the live subscribeToTasks
      // listener already picks this up. Pushing manually raced it and
      // briefly showed the task twice.

      if (contractorUid) {
        const notificationsStore = useNotificationsStore()
        await notificationsStore.notify(
          contractorUid,
          'task_added',
          'New task added',
          `A new task was added: "${title}"`,
          projectId,
          projectName,
          'contractor',
        )
      }
    },

    async editTask(
      projectId: string,
      taskId: string,
      title: string,
      description: string,
      newFiles: File[] = [],
      keepImages: PortfolioImage[] = [],
      removedImages: PortfolioImage[] = [],
    ) {
      const task = this.tasks.find((t) => t.id === taskId)
      if (task?.hasProgress) throw new Error('task-locked')

      const uploaded = newFiles.length
        ? await Promise.all(newFiles.map((f, i) => uploadTaskReferenceImage(projectId, taskId, f, i)))
        : []
      const referenceImages = [...keepImages, ...uploaded]

      await updateDoc(doc(db, 'projects', projectId, 'tasks', taskId), {
        title,
        description,
        referenceImages,
        updatedAt: Date.now(),
      })
      if (task) {
        task.title = title
        task.description = description
        task.referenceImages = referenceImages
      }

      for (const img of removedImages) {
        for (const url of new Set([img.thumb, img.full])) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await deleteObject(ref(storage, url))
          } catch {
            // file may already be gone
          }
        }
      }
    },

    async deleteTask(projectId: string, taskId: string) {
      const task = this.tasks.find((t) => t.id === taskId)
      if (task?.hasProgress) throw new Error('task-locked')
      await deleteDoc(doc(db, 'projects', projectId, 'tasks', taskId))
      this.tasks = this.tasks.filter((t) => t.id !== taskId)
    },
  },
})