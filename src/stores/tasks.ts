import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { ProjectTask, TaskStatus } from '@/types/project'

interface TasksState {
  tasks: ProjectTask[]
  loading: boolean
  error: string
}

export const useTasksStore = defineStore('tasks', {
  state: (): TasksState => ({
    tasks: [],
    loading: false,
    error: '',
  }),

  actions: {
    async fetchTasks(projectId: string) {
      this.loading = true
      try {
        const q = query(collection(db, 'projects', projectId, 'tasks'), orderBy('createdAt', 'asc'))
        const snap = await getDocs(q)
        this.tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProjectTask)
      } catch (err) {
        console.error('fetchTasks failed:', err)
        this.error = "Couldn't load tasks."
      } finally {
        this.loading = false
      }
    },

    async addTask(projectId: string, title: string, description: string) {
      const payload = {
        title,
        description,
        status: 'not_started' as TaskStatus,
        hasProgress: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      const docRef = await addDoc(collection(db, 'projects', projectId, 'tasks'), payload)
      this.tasks.push({ id: docRef.id, ...payload })
    },

    async updateTaskStatus(projectId: string, taskId: string, status: TaskStatus) {
      await updateDoc(doc(db, 'projects', projectId, 'tasks', taskId), {
        status,
        updatedAt: Date.now(),
      })
      const task = this.tasks.find((t) => t.id === taskId)
      if (task) task.status = status
    },

    async editTask(projectId: string, taskId: string, title: string, description: string) {
      const task = this.tasks.find((t) => t.id === taskId)
      if (task?.hasProgress) throw new Error('task-locked')
      await updateDoc(doc(db, 'projects', projectId, 'tasks', taskId), {
        title,
        description,
        updatedAt: Date.now(),
      })
      if (task) {
        task.title = title
        task.description = description
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