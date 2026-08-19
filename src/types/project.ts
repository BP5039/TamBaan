export type ProjectStatus = 'pending' | 'active' | 'completed'

export interface Project {
  id: string
  name: string
  description: string
  plannedStartDate: string
  plannedEndDate: string
  status: ProjectStatus
  homeownerUid: string
  homeownerName: string
  homeownerUsername: string
  contractorUid: string | null
  contractorName: string | null
  contractorUsername: string | null
  pendingInvitationUid: string | null
  pendingInvitationName: string | null
  pendingInvitationUsername: string | null
  createdAt: number
  updatedAt: number
}

export type TaskStatus = 'not_started' | 'in_progress' | 'done'

export interface ProjectTask {
  id: string
  title: string
  description: string
  status: TaskStatus
  hasProgress: boolean
  createdAt: number
  updatedAt: number
}

export type ProgressUpdateStatus = 'pending' | 'verified' | 'sent_back'

export interface ProgressUpdate {
  id: string
  taskId: string
  taskTitle: string
  images: { thumb: string; full: string }[]
  description: string
  status: ProgressUpdateStatus
  sentBackReason: string | null
  exifTimestamp: number | null
  exifDevice: string | null
  createdAt: number
  updatedAt: number
}