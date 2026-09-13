export type NotificationType =
  | 'invitation_received'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'invitation_expired'
  | 'task_added'
  | 'progress_submitted'
  | 'progress_verified'
  | 'progress_sent_back'
  | 'project_completed'
  
export interface Notification {
  id: string
  recipientUid: string
  type: NotificationType
  title: string
  message: string
  projectId: string
  projectName: string
  read: boolean
  createdAt: number
}