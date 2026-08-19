import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Project } from '@/types/project'
import type { UserProfile } from '@/types'
import { useNotificationsStore } from '@/stores/notifications'

interface ProjectsState {
  myProjects: Project[]
  pendingInvitations: Project[]
  currentProject: Project | null
  loading: boolean
  error: string
}

export const useProjectsStore = defineStore('projects', {
  state: (): ProjectsState => ({
    myProjects: [],
    pendingInvitations: [],
    currentProject: null,
    loading: false,
    error: '',
  }),

  actions: {
    async fetchMyProjects(uid: string, role: 'homeowner' | 'professional') {
      this.loading = true
      this.error = ''
      try {
        const field = role === 'homeowner' ? 'homeownerUid' : 'contractorUid'
        const q = query(collection(db, 'projects'), where(field, '==', uid))
        const snap = await getDocs(q)
        this.myProjects = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Project)
          .sort((a, b) => b.createdAt - a.createdAt)
      } catch (err) {
        console.error('fetchMyProjects failed:', err)
        this.error = "Couldn't load projects. Please try again."
      } finally {
        this.loading = false
      }
    },

    async fetchPendingInvitations(uid: string) {
      try {
        const q = query(collection(db, 'projects'), where('pendingInvitationUid', '==', uid))
        const snap = await getDocs(q)
        this.pendingInvitations = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Project)
          .sort((a, b) => b.createdAt - a.createdAt)
      } catch (err) {
        console.error('fetchPendingInvitations failed:', err)
      }
    },

    async fetchProject(id: string) {
      this.loading = true
      this.error = ''
      this.currentProject = null
      try {
        const snap = await getDoc(doc(db, 'projects', id))
        if (snap.exists()) {
          this.currentProject = { id: snap.id, ...snap.data() } as Project
        } else {
          this.error = 'not-found'
        }
      } catch (err) {
        console.error('fetchProject failed:', err)
        this.error = "Couldn't load this project."
      } finally {
        this.loading = false
      }
    },

    async createProject(
    homeowner: UserProfile,
    data: {
        name: string
        description: string
        location: string
        plannedStartDate: string
        plannedEndDate: string
    },
    ) {
    const payload = {
        ...data,
        status: 'pending' as const,
        homeownerUid: homeowner.uid,
        homeownerName: `${homeowner.firstName} ${homeowner.lastName}`,
        homeownerUsername: homeowner.username,
        contractorUid: null,
        contractorName: null,
        contractorUsername: null,
        pendingInvitationUid: null,
        pendingInvitationName: null,
        pendingInvitationUsername: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
    const docRef = await addDoc(collection(db, 'projects'), payload)
    const project = { id: docRef.id, ...payload } as Project
    this.myProjects.unshift(project)
    return project
    },

    async inviteContractor(
    projectId: string,
    contractorUid: string,
    contractorName: string,
    contractorUsername: string,
    ) {
    await updateDoc(doc(db, 'projects', projectId), {
        pendingInvitationUid: contractorUid,
        pendingInvitationName: contractorName,
        pendingInvitationUsername: contractorUsername,
        updatedAt: Date.now(),
    })

    const project = this.myProjects.find((p) => p.id === projectId) ?? this.currentProject
    if (project) {
        const notificationsStore = useNotificationsStore()
        await notificationsStore.notify(
        contractorUid,
        'invitation_received',
        'New project invitation',
        `${project.homeownerName} invited you to "${project.name}"`,
        projectId,
        project.name,
        )
    }
    },

    async acceptInvitation(project: Project) {
    await updateDoc(doc(db, 'projects', project.id), {
        contractorUid: project.pendingInvitationUid,
        contractorName: project.pendingInvitationName,
        contractorUsername: project.pendingInvitationUsername,
        pendingInvitationUid: null,
        pendingInvitationName: null,
        pendingInvitationUsername: null,
        status: 'active',
        updatedAt: Date.now(),
    })
    this.pendingInvitations = this.pendingInvitations.filter((p) => p.id !== project.id)

    const notificationsStore = useNotificationsStore()
    await notificationsStore.notify(
        project.homeownerUid,
        'invitation_accepted',
        'Invitation accepted',
        `${project.pendingInvitationName} accepted your invite — "${project.name}"`,
        project.id,
        project.name,
    )
    },

    async declineInvitation(project: Project) {
    await updateDoc(doc(db, 'projects', project.id), {
        pendingInvitationUid: null,
        pendingInvitationName: null,
        pendingInvitationUsername: null,
        updatedAt: Date.now(),
    })
    this.pendingInvitations = this.pendingInvitations.filter((p) => p.id !== project.id)

    const notificationsStore = useNotificationsStore()
    await notificationsStore.notify(
        project.homeownerUid,
        'invitation_declined',
        'Invitation declined',
        `${project.pendingInvitationName} declined your invite — "${project.name}"`,
        project.id,
        project.name,
    )
    },
  },
})