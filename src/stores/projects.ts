import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Project, ProjectReview } from '@/types/project'
import type { PortfolioImage, PortfolioItem, UserProfile } from '@/types'
import { useNotificationsStore } from '@/stores/notifications'
import { syncPreview } from '@/stores/portfolio'

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

  getters: {
    groupedByYear(state): { year: number; items: Project[] }[] {
      const map = new Map<number, Project[]>()
      for (const p of state.myProjects) {
        const year = p.plannedStartDate ? new Date(p.plannedStartDate).getFullYear() : 0
        if (!map.has(year)) map.set(year, [])
        map.get(year)!.push(p)
      }
      return Array.from(map.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([year, items]) => ({ year, items }))
    },
  },

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
        lastVerifiedPhotoUrl: null,
        review: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
    const docRef = await addDoc(collection(db, 'projects'), payload)
    const project = { id: docRef.id, ...payload } as Project
    this.myProjects.unshift(project)

    // Shared only with whoever ends up as the accepted contractor — never public.
    await setDoc(doc(db, 'projects', docRef.id, 'private', 'contact'), {
      phone: homeowner.phone,
      lineId: homeowner.lineId ?? null,
      facebookId: homeowner.facebookId ?? null,
    })

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

    /**
     * Homeowner-only, one-time, final action. Locks in the review, marks the
     * project complete, folds the score into the professional's aggregate
     * rating, and auto-publishes every verified progress photo as a
     * portfolio piece — so a finished TamBaan project and a manually
     * curated "past work" entry end up visually indistinguishable.
     */
    async completeProject(
      project: Project,
      reviewInput: { workQuality: number; communication: number; timeliness: number; comment: string },
    ) {
      const overall = (reviewInput.workQuality + reviewInput.communication + reviewInput.timeliness) / 3
      const review: ProjectReview = { ...reviewInput, overall, createdAt: Date.now() }

      await updateDoc(doc(db, 'projects', project.id), {
        status: 'completed',
        review,
        updatedAt: Date.now(),
      })
      if (this.currentProject?.id === project.id) {
        this.currentProject.status = 'completed'
        this.currentProject.review = review
      }
      const listed = this.myProjects.find((p) => p.id === project.id)
      if (listed) {
        listed.status = 'completed'
        listed.review = review
      }

      const contractorUid = project.contractorUid
      if (!contractorUid) return

      // Weighted-average rating update — avoids re-reading every past review just to stay current.
      const profileRef = doc(db, 'users', contractorUid)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(profileRef)
        const data = snap.data() as UserProfile | undefined
        const oldCount = data?.ratingCount ?? 0
        const oldRating = data?.rating ?? 0
        const newCount = oldCount + 1
        const newRating = (oldRating * oldCount + overall) / newCount
        tx.update(profileRef, { rating: newRating, ratingCount: newCount, updatedAt: Date.now() })
      })

      // Gather every verified photo across this project's tasks for the portfolio piece.
      const verifiedSnap = await getDocs(
        query(collection(db, 'projects', project.id, 'updates'), where('status', '==', 'verified')),
      )
      const images = verifiedSnap.docs.flatMap(
        (d) => (d.data().images as PortfolioImage[] | undefined) ?? [],
      )

      if (images.length) {
        await addDoc(collection(db, 'users', contractorUid, 'portfolio'), {
          title: project.name,
          images,
          description: project.description,
          year: project.plannedStartDate ? new Date(project.plannedStartDate).getFullYear() : new Date().getFullYear(),
          location: project.location,
          source: 'collaboration' as const,
          projectId: project.id,
          createdAt: Date.now(),
        })

        // Keep the contractor's denormalized preview/count in sync, same as a manual add would.
        const allSnap = await getDocs(
          query(collection(db, 'users', contractorUid, 'portfolio'), orderBy('createdAt', 'desc')),
        )
        const allItems = allSnap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>
          return {
            id: d.id,
            title: typeof data.title === 'string' ? data.title : 'Untitled work',
            images: Array.isArray(data.images) ? (data.images as PortfolioImage[]) : [],
            description: typeof data.description === 'string' ? data.description : '',
            year: typeof data.year === 'number' ? data.year : new Date().getFullYear(),
            location: typeof data.location === 'string' ? data.location : '',
            source: data.source === 'collaboration' ? 'collaboration' : 'manual',
            projectId: typeof data.projectId === 'string' ? data.projectId : null,
            createdAt: (data.createdAt as number) ?? Date.now(),
          } satisfies PortfolioItem
        })
        await syncPreview(contractorUid, allItems)
      }

      const notificationsStore = useNotificationsStore()
      await notificationsStore.notify(
        contractorUid,
        'project_completed',
        'Project completed',
        `${project.homeownerName} marked "${project.name}" complete and left a review`,
        project.id,
        project.name,
      )
    },
  },
})