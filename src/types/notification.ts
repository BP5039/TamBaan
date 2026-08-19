export type NotificationType =
  | 'invitation_received'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'progress_submitted'
  | 'progress_verified'
  | 'progress_sent_back'

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