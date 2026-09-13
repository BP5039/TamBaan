export type ProjectStatus = 'pending' | 'active' | 'completed'

export interface ProjectReview {
  workQuality: number
  communication: number
  timeliness: number
  overall: number
  comment: string
  createdAt: number
}

export interface Project {
  id: string
  name: string
  description: string
  location: string
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
  invitationExpiresAt: number | null
  lastVerifiedPhotoUrl: string | null
  referenceImages: { thumb: string; full: string }[]
  review: ProjectReview | null
  createdAt: number
  updatedAt: number
}

export type TaskStatus = 'not_started' | 'awaiting_review' | 'sent_back' | 'done'

export interface ProjectTask {
  id: string
  title: string
  description: string
  status: TaskStatus
  hasProgress: boolean
  referenceImages: { thumb: string; full: string }[]
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
  lastReminderAt: number | null
  createdAt: number
  updatedAt: number
}