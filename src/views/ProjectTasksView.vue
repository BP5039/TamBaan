<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { TaskStatus } from '@/types/project'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()

const projectId = computed(() => route.params.id as string)
const project = computed(() => projectsStore.currentProject)

const isHomeowner = computed(() => project.value?.homeownerUid === authStore.user?.uid)

const newTaskTitle = ref('')
const newTaskDescription = ref('')
const addError = ref('')

const editingTaskId = ref<string | null>(null)
const editTitle = ref('')
const editDescription = ref('')
const editError = ref('')

const doneCount = computed(() => tasksStore.tasks.filter((t) => t.status === 'done').length)

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not started',
  awaiting_review: 'Awaiting review',
  sent_back: 'Sent back',
  done: 'Done',
}

function statusStyle(status: TaskStatus) {
  if (status === 'done') return 'bg-success-bg text-success-text'
  if (status === 'awaiting_review') return 'bg-pending-bg text-pending-text'
  if (status === 'sent_back') return 'bg-error-bg text-error-text'
  return 'bg-cream text-muted'
}

async function load() {
  if (!projectsStore.currentProject || projectsStore.currentProject.id !== projectId.value) {
    await projectsStore.fetchProject(projectId.value)
  }
  await tasksStore.fetchTasks(projectId.value)
}

onMounted(load)

async function addTask() {
  addError.value = ''
  if (!newTaskTitle.value.trim()) {
    addError.value = 'Give the task a name.'
    return
  }
  if (!newTaskDescription.value.trim()) {
    addError.value = 'Add a description — this is where the exact spec goes (e.g. "3000K warm white bulbs").'
    return
  }
  try {
    await tasksStore.addTask(projectId.value, newTaskTitle.value.trim(), newTaskDescription.value.trim())
    newTaskTitle.value = ''
    newTaskDescription.value = ''
  } catch (err) {
    console.error('addTask failed:', err)
    addError.value = "Couldn't add that task. Please try again."
  }
}

function startEdit(taskId: string, title: string, description: string) {
  editingTaskId.value = taskId
  editTitle.value = title
  editDescription.value = description
  editError.value = ''
}

function cancelEdit() {
  editingTaskId.value = null
}

async function saveEdit(taskId: string) {
  editError.value = ''
  if (!editTitle.value.trim()) {
    editError.value = 'Task needs a name.'
    return
  }
  if (!editDescription.value.trim()) {
    editError.value = 'Description is required — this is where the exact spec goes.'
    return
  }
  try {
    await tasksStore.editTask(projectId.value, taskId, editTitle.value.trim(), editDescription.value.trim())
    editingTaskId.value = null
  } catch {
    editError.value = "This task can't be edited anymore — progress has already been logged against it."
  }
}

async function deleteTask(taskId: string) {
  try {
    await tasksStore.deleteTask(projectId.value, taskId)
  } catch {
    tasksStore.error = "This task can't be deleted — progress has already been logged against it."
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <BaseButton variant="ghost" class="mb-4" @click="router.push(`/projects/${projectId}`)">
      ← {{ project?.name ?? 'Project' }}
    </BaseButton>

    <div class="mb-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-ink">Tasks</h1>
        <span class="rounded-lg bg-success-bg px-2.5 py-1 text-xs font-semibold text-success-text">
            {{ doneCount }}/{{ tasksStore.tasks.length }} done
        </span>
    </div>

    <p v-if="tasksStore.error" class="mb-4 text-xs text-error-text">{{ tasksStore.error }}</p>

    <div class="space-y-2">
      <div v-for="task in tasksStore.tasks" :key="task.id" class="rounded-lg border border-cream bg-white p-3">
        <div v-if="editingTaskId === task.id">
          <label class="mb-1 block text-[11px] font-medium text-muted">Task name</label>
          <input
            v-model="editTitle"
            placeholder="e.g. Replace bulb"
            class="mb-2 w-full rounded-lg border border-cream px-2.5 py-1.5 text-sm text-ink focus:outline-none"
          />
          <label class="mb-1 block text-[11px] font-medium text-muted">Description</label>
          <textarea
            v-model="editDescription"
            rows="2"
            placeholder="Exact spec, e.g. 3000K warm white bulbs"
            class="mb-2 w-full resize-none rounded-lg border border-cream px-2.5 py-1.5 text-xs text-ink focus:outline-none"
          />
          <p v-if="editError" class="mb-2 text-xs text-error-text">{{ editError }}</p>
          <div class="flex gap-2">
            <BaseButton variant="outline" @click="cancelEdit">Cancel</BaseButton>
            <BaseButton @click="saveEdit(task.id)">Save</BaseButton>
          </div>
        </div>

        <div v-else class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm text-ink">{{ task.title }}</p>
            <p v-if="task.description" class="mt-0.5 text-xs text-muted">{{ task.description }}</p>
          </div>

          <div class="flex flex-shrink-0 items-center gap-2">
            <span class="rounded-lg px-2 py-0.5 text-[10px] font-medium" :class="statusStyle(task.status)">
              {{ STATUS_LABELS[task.status] }}
            </span>

            <template v-if="isHomeowner && !task.hasProgress">
              <button
                type="button"
                class="text-xs text-muted hover:text-ink"
                @click="startEdit(task.id, task.title, task.description)"
              >
                Edit
              </button>
              <button type="button" class="text-xs text-error hover:underline" @click="deleteTask(task.id)">
                Delete
              </button>
            </template>
          </div>
        </div>
      </div>

      <p v-if="tasksStore.tasks.length === 0" class="py-6 text-center text-sm text-muted">No tasks yet.</p>
    </div>

    <div v-if="isHomeowner" class="mt-4 rounded-lg border border-cream bg-white p-3">
      <p class="mb-3 text-sm font-medium text-ink">Add a task</p>
      <label class="mb-1 block text-[11px] font-medium text-muted">Task name</label>
      <input
        v-model="newTaskTitle"
        placeholder="e.g. Replace bulb"
        class="mb-3 w-full rounded-lg border border-cream px-3 py-2 text-sm text-ink focus:outline-none"
        @keyup.enter="addTask"
      />
      <label class="mb-1 block text-[11px] font-medium text-muted">Description</label>
      <textarea
        v-model="newTaskDescription"
        rows="2"
        placeholder="Exact spec, e.g. 3000K warm white bulbs"
        class="mb-2 w-full resize-none rounded-lg border border-cream px-3 py-2 text-xs text-ink focus:outline-none"
      />
      <p v-if="addError" class="mb-2 text-xs text-error-text">{{ addError }}</p>
      <BaseButton full-width @click="addTask">+ Add task</BaseButton>
    </div>
  </div>
</template>