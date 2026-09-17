import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/firebase/config'
import { createThumbnail } from '@/utils/imageResize'
import type { Project, ProjectReview } from '@/types/project'
import type { PortfolioImage, PortfolioItem, UserProfile } from '@/types'

// Kept outside reactive state — Pinia doesn't need to track a function reference.
let unsubscribeProjectFn: Unsubscribe | null = null
import { useNotificationsStore } from '@/stores/notifications'
import { syncPreview } from '@/stores/portfolio'

async function uploadReferenceImage(projectId: string, file: File, index: number): Promise<PortfolioImage> {
  const stamp = `${Date.now()}-${index}`
  const fullRef = ref(storage, `projects/${projectId}/reference/${stamp}-full-${file.name}`)

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

  const thumbRef = ref(storage, `projects/${projectId}/reference/${stamp}-thumb-${file.name}.jpg`)
  await Promise.all([uploadBytes(fullRef, file), uploadBytes(thumbRef, thumbBlob)])
  const [full, thumb] = await Promise.all([getDownloadURL(fullRef), getDownloadURL(thumbRef)])
  return { full, thumb }
}

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

    /** Starts a live listener — the Project Hub reflects changes from the other party instantly, no manual refetch needed. */
    subscribeToProject(id: string) {
      this.unsubscribeFromProject()
      this.loading = true
      this.error = ''
      this.currentProject = null
      unsubscribeProjectFn = onSnapshot(
        doc(db, 'projects', id),
        (snap) => {
          this.currentProject = snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null
          if (!snap.exists()) this.error = 'not-found'
          this.loading = false
        },
        (err) => {
          console.error('project listener failed:', err)
          this.error = "Couldn't load this project."
          this.loading = false
        },
      )
    },

    /** Call when leaving the project's pages, or before subscribing to a different project. */
    unsubscribeFromProject() {
      if (unsubscribeProjectFn) {
        unsubscribeProjectFn()
        unsubscribeProjectFn = null
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
    files: File[] = [],
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
        invitationExpiresAt: null,
        lastVerifiedPhotoUrl: null,
        referenceImages: [] as PortfolioImage[],
        review: null,
        unreadCountHomeowner: 0,
        unreadCountContractor: 0,
        updatedAt: Date.now(),
    }
    const docRef = await addDoc(collection(db, 'projects'), payload)
    let project = { id: docRef.id, ...payload } as Project

    // Shared only with whoever ends up as the accepted contractor — never public.
    await setDoc(doc(db, 'projects', docRef.id, 'private', 'contact'), {
      phone: homeowner.phone,
      lineId: homeowner.lineId ?? null,
      facebookId: homeowner.facebookId ?? null,
    })

    // Uploaded after the doc exists — Storage rules verify the project's
    // status/owner by reading the Firestore doc, so it has to be there first.
    if (files.length) {
      const referenceImages = await Promise.all(
        files.map((f, i) => uploadReferenceImage(docRef.id, f, i)),
      )
      await updateDoc(doc(db, 'projects', docRef.id), { referenceImages, updatedAt: Date.now() })
      project = { ...project, referenceImages }
    }

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
        invitationExpiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
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
     * Homeowner-only, opportunistic cleanup — runs whenever the homeowner's
     * own client notices a pending invite is past its expiry. There's no
     * backend scheduler, so this fires lazily on load rather than exactly
     * at the 3-day mark.
     */
    async expireInvitation(project: Project) {
      const expiredName = project.pendingInvitationName
      await updateDoc(doc(db, 'projects', project.id), {
        pendingInvitationUid: null,
        pendingInvitationName: null,
        pendingInvitationUsername: null,
        invitationExpiresAt: null,
        updatedAt: Date.now(),
      })

      const notificationsStore = useNotificationsStore()
      await notificationsStore.notify(
        project.homeownerUid,
        'invitation_expired',
        'Invitation expired',
        `Your invite to ${expiredName} for "${project.name}" expired without a response`,
        project.id,
        project.name,
      )
    },

    /**
     * Homeowner-only. Only succeeds while the project is still pending with
     * no invite out — the Firestore rule enforces the same lock, so this
     * isn't just a UI-level restriction.
     */
    async editProject(
      project: Project,
      data: {
        name: string
        description: string
        location: string
        plannedStartDate: string
        plannedEndDate: string
      },
      newFiles: File[],
      keepImages: PortfolioImage[],
      removedImages: PortfolioImage[],
    ) {
      const uploaded = newFiles.length
        ? await Promise.all(newFiles.map((f, i) => uploadReferenceImage(project.id, f, i)))
        : []
      const referenceImages = [...keepImages, ...uploaded]

      await updateDoc(doc(db, 'projects', project.id), {
        ...data,
        referenceImages,
        updatedAt: Date.now(),
      })

      if (this.currentProject?.id === project.id) {
        Object.assign(this.currentProject, data, { referenceImages })
      }
      const listed = this.myProjects.find((p) => p.id === project.id)
      if (listed) Object.assign(listed, data, { referenceImages })

      // Best-effort cleanup — a failed delete shouldn't block the save the user is waiting on.
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

    /**
     * Homeowner-only, and only while the project is still in the same
     * pending/no-invite window that governs editing. Clears the tasks and
     * private-contact subcollections too, since Firestore doesn't cascade
     * deletes on its own — there's never any progress-update data to worry
     * about here, since that requires an assigned contractor that this
     * project, by definition, never had.
     */
    async deleteProject(project: Project) {
      const tasksSnap = await getDocs(collection(db, 'projects', project.id, 'tasks'))
      await Promise.all(tasksSnap.docs.map((d) => deleteDoc(d.ref)))
      const privateSnap = await getDocs(collection(db, 'projects', project.id, 'private'))
      await Promise.all(privateSnap.docs.map((d) => deleteDoc(d.ref)))

      await deleteDoc(doc(db, 'projects', project.id))

      this.myProjects = this.myProjects.filter((p) => p.id !== project.id)
      if (this.currentProject?.id === project.id) this.currentProject = null
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