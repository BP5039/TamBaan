// Generated from the TamBaan Test Plan (Chapter 3.1). Each describe() is one UTC,
// each it() is one test case, with the same wording as the document.
import { utc, expect, rejects, beforeEachCase, resetHooks, flush } from './support/utc.mjs'
import { reset, fs, st, SIRIPORN, ANUWAT, KANOKWAN, PRASERT, file, MB, T0, DAY, projectDoc, activeProject, seedProject, taskDoc, updateDoc_ } from './support/env.mjs'

const { useProjectsStore } = await import('@/stores/projects')
const { useTasksStore } = await import('@/stores/tasks')
const { useProgressStore } = await import('@/stores/progress')
const { useNotificationsStore } = await import('@/stores/notifications')
const projMod = await import('@/stores/projects')
const tasksMod = await import('@/stores/tasks')

const PROJ = 'Appendix 4.4 Projects'
const TASKS = 'Appendix 4.5 Tasks and progress updates'
const NOTIF = 'Appendix 4.7 Notifications'
resetHooks()
beforeEachCase(() => reset())

const notifs = (uid) => fs.paths(`users/${uid}/notifications/`).map((p) => fs.get(p))
const KITCHEN = { name: 'Kitchen tap replacement', projectType: 'quick_fix', description: 'Replace the leaking kitchen tap with a single-lever mixer.', location: 'Chiang Mai', plannedStartDate: '2026-11-05', plannedEndDate: '2026-11-06' }
const kitchenDoc = (over = {}) => projectDoc({ ...KITCHEN, homeownerUid: KANOKWAN.uid, homeownerName: 'Kanokwan Srisuk', homeownerUsername: 'kanokwan-s', ...over })
const invited = (over = {}) => kitchenDoc({ pendingInvitationUid: ANUWAT.uid, pendingInvitationName: 'Anuwat Prommanee', pendingInvitationUsername: 'anuwat-p', invitationExpiresAt: T0 + 3 * DAY, ...over })

// ======================= CD-19 ProjectsStore
utc('CD-19-F05', {
  prereq: 'Appendix 4.1 Registered user accounts; Appendix 4.6 Test image files',
  data: [
    'homeowner = Kanokwan\nname = "Kitchen tap replacement", projectType = "quick_fix", description = "Replace the leaking kitchen tap with a single-lever mixer.", location = "Chiang Mai", plannedStartDate = "2026-11-05", plannedEndDate = "2026-11-06"\nfiles = []',
    'Same as TD01 with files = [valid_photo.jpg (2 MB), valid_photo.png (1 MB)]',
    'Same as TD01; Firestore refuses the project write',
  ],
  cases: [
    {
      desc: 'Create a project without photos', td: [1],
      expected: 'Returns the project { id: <new id>, status: "pending", homeownerUid: "uid-kanokwan", homeownerName: "Kanokwan Srisuk", contractorUid: null, pendingInvitationUid: null, referenceImages: [], photoCount: 0, ... }; projects/{id}/private/contact = { phone: "0861234567", lineId: "kanokwan.s", facebookId: "Kanokwan Srisuk" }; myProjects[0] is the new project.',
      run: async () => {
        const s = useProjectsStore(); const p = await s.createProject(KANOKWAN, KITCHEN)
        expect([p.status, p.homeownerUid, p.homeownerName, p.contractorUid, p.pendingInvitationUid, p.photoCount]).toEqual(['pending', 'uid-kanokwan', 'Kanokwan Srisuk', null, null, 0])
        expect(fs.get(`projects/${p.id}`).name).toBe('Kitchen tap replacement')
        expect(fs.get(`projects/${p.id}/private/contact`)).toEqual({ phone: '0861234567', lineId: 'kanokwan.s', facebookId: 'Kanokwan Srisuk' })
        expect(s.myProjects[0].id).toBe(p.id)
      },
    },
    {
      desc: 'Create a project with 2 reference photos', td: [2],
      expected: 'Returns the project with referenceImages of length 2 (stored under projects/{id}/reference/) and photoCount = 2.',
      run: async () => {
        const s = useProjectsStore(); const p = await s.createProject(KANOKWAN, KITCHEN, [file('valid_photo.jpg', 'image/jpeg', 2 * MB), file('valid_photo.png', 'image/png', MB)])
        expect(p.referenceImages).toHaveLength(2); expect(p.photoCount).toBe(2); expect(fs.get(`projects/${p.id}`).photoCount).toBe(2)
        expect(st.paths(`projects/${p.id}/reference/`)).toHaveLength(2)
      },
    },
    {
      desc: 'Create a project when the write is refused', td: [3], expected: 'Rejects with FirebaseError "permission-denied"; myProjects is unchanged.',
      run: async () => { fs.fail('addDoc', 'permission-denied', 'projects'); const s = useProjectsStore(); const e = await rejects(s.createProject(KANOKWAN, KITCHEN)); expect(e.code).toBe('permission-denied'); expect(s.myProjects).toEqual([]) },
    },
  ],
})
utc('CD-19-F06', {
  prereq: PROJ,
  data: ['projectId = "k1" (Kanokwan, pending, no invite), contractorUid = "uid-anuwat", contractorName = "Anuwat Prommanee", contractorUsername = "anuwat-p"', 'Same as TD01; Firestore refuses the update'],
  cases: [
    {
      desc: 'Invite a professional to a project', td: [1],
      expected: 'Resolves. k1.pendingInvitationUid = "uid-anuwat", pendingInvitationName = "Anuwat Prommanee", pendingInvitationUsername = "anuwat-p", invitationExpiresAt = now + 3 days; Anuwat gets an "invitation_received" notification "New project invitation" / "Kanokwan Srisuk invited you to "Kitchen tap replacement""; k1.unreadCountContractor = 1.',
      run: async () => {
        seedProject('k1', kitchenDoc()); const s = useProjectsStore(); await s.fetchMyProjects('uid-kanokwan', 'homeowner')
        const before = Date.now(); await s.inviteContractor('k1', 'uid-anuwat', 'Anuwat Prommanee', 'anuwat-p')
        const k = fs.get('projects/k1')
        expect([k.pendingInvitationUid, k.pendingInvitationName, k.pendingInvitationUsername, k.unreadCountContractor]).toEqual(['uid-anuwat', 'Anuwat Prommanee', 'anuwat-p', 1])
        expect(Math.round((k.invitationExpiresAt - before) / DAY)).toBe(3)
        const n = notifs('uid-anuwat'); expect(n.map((x) => [x.type, x.title, x.message])).toEqual([['invitation_received', 'New project invitation', 'Kanokwan Srisuk invited you to "Kitchen tap replacement"']])
      },
    },
    {
      desc: 'Invite when the update is refused', td: [2], expected: 'Rejects with FirebaseError "permission-denied"; no notification is sent.',
      run: async () => { seedProject('k1', kitchenDoc()); fs.fail('updateDoc', 'permission-denied', 'projects/k1'); const e = await rejects(useProjectsStore().inviteContractor('k1', 'uid-anuwat', 'Anuwat Prommanee', 'anuwat-p')); expect(e.code).toBe('permission-denied'); expect(notifs('uid-anuwat')).toHaveLength(0) },
    },
  ],
})
utc('CD-19-F07', {
  prereq: PROJ,
  data: ['project = k1 with a pending invitation to Anuwat', 'project = k1 whose invitation has expired (Firestore rules refuse the update)'],
  cases: [
    {
      desc: 'Accept an invitation', td: [1],
      expected: 'Resolves. k1.contractorUid = "uid-anuwat", contractorName = "Anuwat Prommanee", status = "active", pendingInvitationUid = null; k1 is removed from pendingInvitations; Kanokwan gets "invitation_accepted" / "Invitation accepted" / "Anuwat Prommanee accepted your invite — "Kitchen tap replacement"".',
      run: async () => {
        seedProject('k1', invited()); const s = useProjectsStore(); await s.fetchPendingInvitations('uid-anuwat')
        await s.acceptInvitation(s.pendingInvitations[0])
        const k = fs.get('projects/k1'); expect([k.contractorUid, k.contractorName, k.status, k.pendingInvitationUid]).toEqual(['uid-anuwat', 'Anuwat Prommanee', 'active', null])
        expect(s.pendingInvitations).toEqual([])
        expect(notifs('uid-kanokwan').map((x) => [x.type, x.title, x.message])).toEqual([['invitation_accepted', 'Invitation accepted', 'Anuwat Prommanee accepted your invite — "Kitchen tap replacement"']])
      },
    },
    {
      desc: 'Accept an invitation that has expired', td: [2], expected: 'Rejects with FirebaseError "permission-denied"; k1 stays pending with no contractor.',
      run: async () => {
        seedProject('k1', invited({ invitationExpiresAt: T0 - DAY })); fs.fail('updateDoc', 'permission-denied', 'projects/k1')
        const s = useProjectsStore(); await s.fetchPendingInvitations('uid-anuwat'); const e = await rejects(s.acceptInvitation(s.pendingInvitations[0]))
        expect(e.code).toBe('permission-denied'); expect([fs.get('projects/k1').status, fs.get('projects/k1').contractorUid]).toEqual(['pending', null])
      },
    },
  ],
})
utc('CD-19-F08', {
  prereq: PROJ,
  data: ['project = k1 with a pending invitation to Anuwat', 'Same; Firestore refuses the update'],
  cases: [
    {
      desc: 'Decline an invitation', td: [1],
      expected: 'Resolves. k1.pendingInvitationUid/Name/Username = null; status stays "pending" and contractorUid stays null; Kanokwan gets "invitation_declined" / "Invitation declined" / "Anuwat Prommanee declined your invite — "Kitchen tap replacement"".',
      run: async () => {
        seedProject('k1', invited()); const s = useProjectsStore(); await s.fetchPendingInvitations('uid-anuwat'); await s.declineInvitation(s.pendingInvitations[0])
        const k = fs.get('projects/k1'); expect([k.pendingInvitationUid, k.pendingInvitationName, k.pendingInvitationUsername, k.status, k.contractorUid]).toEqual([null, null, null, 'pending', null])
        expect(s.pendingInvitations).toEqual([])
        expect(notifs('uid-kanokwan').map((x) => [x.type, x.title, x.message])).toEqual([['invitation_declined', 'Invitation declined', 'Anuwat Prommanee declined your invite — "Kitchen tap replacement"']])
      },
    },
    { desc: 'Decline when the update is refused', td: [2], expected: 'Rejects with FirebaseError "permission-denied"; no notification is sent.', run: async () => { seedProject('k1', invited()); fs.fail('updateDoc', 'permission-denied', 'projects/k1'); const e = await rejects(useProjectsStore().declineInvitation({ id: 'k1', ...invited() })); expect(e.code).toBe('permission-denied'); expect(notifs('uid-kanokwan')).toHaveLength(0) } },
  ],
})
utc('CD-19-F09', {
  prereq: PROJ,
  data: ['project = k1, invitation to Anuwat expired 1 day ago'],
  cases: [{
    desc: 'Expire an invitation nobody answered', td: [1],
    expected: 'Resolves. k1.pendingInvitationUid/Name/Username = null and invitationExpiresAt = null; Kanokwan gets "invitation_expired" / "Invitation expired" / "Your invite to Anuwat Prommanee for "Kitchen tap replacement" expired without a response".',
    run: async () => {
      seedProject('k1', invited({ invitationExpiresAt: T0 - DAY })); await useProjectsStore().expireInvitation({ id: 'k1', ...invited({ invitationExpiresAt: T0 - DAY }) })
      const k = fs.get('projects/k1'); expect([k.pendingInvitationUid, k.pendingInvitationName, k.pendingInvitationUsername, k.invitationExpiresAt]).toEqual([null, null, null, null])
      expect(notifs('uid-kanokwan').map((x) => [x.type, x.title, x.message])).toEqual([['invitation_expired', 'Invitation expired', 'Your invite to Anuwat Prommanee for "Kitchen tap replacement" expired without a response']])
    },
  }],
})
const REF1 = { thumb: 'https://storage.test/projects/k1/reference/1-0-thumb-a.jpg.jpg', full: 'https://storage.test/projects/k1/reference/1-0-full-a.jpg' }
utc('CD-19-F10', {
  prereq: PROJ + '; Appendix 4.6 Test image files',
  data: [
    'project = k1 (1 reference photo, photoCount 1); data = KITCHEN with name "Kitchen and bathroom taps", plannedEndDate "2026-11-07"; newFiles = [valid_photo.png]; keepImages = []; removedImages = [the old photo]',
    'project = k1 after Anuwat was invited (Firestore rules refuse the edit)',
  ],
  cases: [
    {
      desc: 'Edit details and replace the reference photo', td: [1],
      expected: 'Resolves. k1.name = "Kitchen and bathroom taps", plannedEndDate = "2026-11-07", referenceImages = [the new photo] (length 1), photoCount stays 1 (+1 -1); both files of the removed photo are deleted from Storage; currentProject and myProjects show the same values.',
      run: async () => {
        st.put('projects/k1/reference/1-0-thumb-a.jpg.jpg'); st.put('projects/k1/reference/1-0-full-a.jpg')
        seedProject('k1', kitchenDoc({ referenceImages: [REF1], photoCount: 1 }))
        const s = useProjectsStore(); await s.fetchMyProjects('uid-kanokwan', 'homeowner'); s.subscribeToProject('k1'); s.unsubscribeFromProject()
        await s.editProject(s.myProjects[0], { ...KITCHEN, name: 'Kitchen and bathroom taps', plannedEndDate: '2026-11-07' }, [file('valid_photo.png', 'image/png', MB)], [], [REF1])
        const k = fs.get('projects/k1'); expect([k.name, k.plannedEndDate, k.referenceImages.length, k.photoCount]).toEqual(['Kitchen and bathroom taps', '2026-11-07', 1, 1])
        expect(k.referenceImages[0].full).toMatch(/valid_photo\.png$/)
        expect(st.has('projects/k1/reference/1-0-full-a.jpg') || st.has('projects/k1/reference/1-0-thumb-a.jpg.jpg')).toBe(false)
        expect([s.currentProject.name, s.myProjects[0].name, s.currentProject.photoCount]).toEqual(['Kitchen and bathroom taps', 'Kitchen and bathroom taps', 1])
      },
    },
    {
      desc: 'Edit after an invitation was sent', td: [2], expected: 'Rejects with FirebaseError "permission-denied"; k1 is unchanged.',
      run: async () => { seedProject('k1', invited()); fs.fail('updateDoc', 'permission-denied', 'projects/k1'); const e = await rejects(useProjectsStore().editProject({ id: 'k1', ...invited() }, { ...KITCHEN, name: 'X' }, [], [], [])); expect(e.code).toBe('permission-denied'); expect(fs.get('projects/k1').name).toBe('Kitchen tap replacement') },
    },
  ],
})
utc('CD-19-F11', {
  prereq: PROJ,
  data: ['project = k1 (pending, no invite) with 1 task and private/contact', 'Same; Firestore refuses deleting the project document'],
  cases: [
    {
      desc: 'Delete a pending project', td: [1], expected: 'Resolves. projects/k1, its tasks and projects/k1/private/contact are all deleted; k1 is removed from myProjects; currentProject = null if it was k1.',
      run: async () => {
        seedProject('k1', kitchenDoc()); fs.set('projects/k1/tasks/t1', taskDoc()); fs.set('projects/k1/private/contact', { phone: '0861234567' })
        const s = useProjectsStore(); await s.fetchMyProjects('uid-kanokwan', 'homeowner'); s.subscribeToProject('k1'); s.unsubscribeFromProject()
        await s.deleteProject(s.myProjects[0])
        expect(fs.paths('projects/k1')).toEqual([]); expect(s.myProjects).toEqual([]); expect(s.currentProject).toBeNull()
      },
    },
    { desc: 'Delete when the project write is refused', td: [2], expected: 'Rejects with FirebaseError "permission-denied"; projects/k1 still exists.', run: async () => { seedProject('k1', kitchenDoc()); fs.fail('deleteDoc', 'permission-denied', 'projects/k1'); const e = await rejects(useProjectsStore().deleteProject({ id: 'k1', ...kitchenDoc() })); expect(e.code).toBe('permission-denied'); expect(fs.has('projects/k1')).toBe(true) } },
  ],
})
function seedP1ForCompletion({ withPhotos = true, rating = null, ratingCount = 0 } = {}) {
  seedProject('p1', activeProject({ referenceImages: withPhotos ? [{ thumb: 'r-t', full: 'r-f' }] : [] }))
  fs.set('users/uid-anuwat', { ...ANUWAT, rating, ratingCount })
  fs.set('projects/p1/tasks/t1', taskDoc({ status: 'done', hasProgress: true }))
  fs.set('projects/p1/tasks/t2', taskDoc({ title: 'Retile kitchen floor', status: 'done', hasProgress: true, referenceImages: withPhotos ? [{ thumb: 't2-t', full: 't2-f' }] : [] }))
  fs.set('projects/p1/updates/u1', updateDoc_({ status: 'verified', images: withPhotos ? [{ thumb: 'u1-t', full: 'u1-f' }, { thumb: 'u1b-t', full: 'u1b-f' }] : [] }))
}
const REVIEW = { workQuality: 5, communication: 4, timeliness: 5, comment: 'Clean work and finished on time.' }
utc('CD-19-F12', {
  prereq: PROJ + '; ' + TASKS,
  data: [
    'project = p1 (active, Siriporn + Anuwat, every task done; 1 project photo, 1 task photo, 2 progress photos); Anuwat has no rating yet\nreview = { workQuality: 5, communication: 4, timeliness: 5, comment: "Clean work and finished on time." }',
    'Same project; Anuwat already has rating 4.0 from 1 review; same review',
    'Same project but it has no photos at all; same review',
    'Same as TD01; Firestore refuses the status update',
  ],
  cases: [
    {
      desc: 'Complete a project and submit the review', td: [1],
      expected: 'Resolves. p1.status = "completed", p1.review = { workQuality: 5, communication: 4, timeliness: 5, overall: 4.67 (14/3), comment: "Clean work and finished on time." }; Anuwat\'s rating = 4.67, ratingCount = 1; a portfolio item with source "collaboration", projectId "p1", title "Townhouse renovation" and all 4 photos is added to Anuwat; Anuwat gets "project_completed" / "Project completed" / "Siriporn Kaewkla marked "Townhouse renovation" complete and left a review".',
      run: async () => {
        seedP1ForCompletion(); const s = useProjectsStore(); await s.completeProject({ id: 'p1', ...activeProject({ referenceImages: [{ thumb: 'r-t', full: 'r-f' }] }) }, REVIEW)
        const p = fs.get('projects/p1'); expect(p.status).toBe('completed'); expect(p.review.overall).toBeCloseTo(14 / 3, 6); expect(p.review.comment).toBe('Clean work and finished on time.')
        const a = fs.get('users/uid-anuwat'); expect(a.rating).toBeCloseTo(4.67, 2); expect(a.ratingCount).toBe(1)
        const items = fs.paths('users/uid-anuwat/portfolio/').map((x) => fs.get(x)); expect(items).toHaveLength(1)
        expect([items[0].source, items[0].projectId, items[0].title, items[0].images.length]).toEqual(['collaboration', 'p1', 'Townhouse renovation', 4])
        expect(a.portfolioCount).toBe(1)
        expect(notifs('uid-anuwat').map((x) => [x.type, x.title, x.message])).toEqual([['project_completed', 'Project completed', 'Siriporn Kaewkla marked "Townhouse renovation" complete and left a review']])
      },
    },
    {
      desc: 'Complete when the professional already has a rating', td: [2], expected: 'Resolves. Anuwat\'s rating = (4.0 × 1 + 4.67) / 2 = 4.33, ratingCount = 2.',
      run: async () => { seedP1ForCompletion({ rating: 4, ratingCount: 1 }); await useProjectsStore().completeProject({ id: 'p1', ...activeProject() }, REVIEW); const a = fs.get('users/uid-anuwat'); expect(a.rating).toBeCloseTo(4.33, 2); expect(a.ratingCount).toBe(2) },
    },
    {
      desc: 'Complete a project that has no photos', td: [3], expected: 'Resolves. p1 is completed and rated, but no portfolio item is created.',
      run: async () => { seedP1ForCompletion({ withPhotos: false }); await useProjectsStore().completeProject({ id: 'p1', ...activeProject() }, REVIEW); expect(fs.get('projects/p1').status).toBe('completed'); expect(fs.paths('users/uid-anuwat/portfolio/')).toEqual([]) },
    },
    {
      desc: 'Complete when the status update is refused', td: [4], expected: 'Rejects with FirebaseError "permission-denied"; p1 stays "active" and Anuwat\'s rating is unchanged.',
      run: async () => { seedP1ForCompletion(); fs.fail('updateDoc', 'permission-denied', 'projects/p1'); const e = await rejects(useProjectsStore().completeProject({ id: 'p1', ...activeProject() }, REVIEW)); expect(e.code).toBe('permission-denied'); expect(fs.get('projects/p1').status).toBe('active'); expect(fs.get('users/uid-anuwat').ratingCount).toBe(0) },
    },
  ],
})

// ======================= CD-20 TasksStore
function seedActiveK1() { seedProject('p1', activeProject()) }
utc('CD-20-F03', {
  prereq: PROJ + '; Appendix 4.6 Test image files',
  data: [
    'projectId = "p1", title = "Fix bathroom tap", description = "Replace with a single-lever chrome mixer", contractorUid = "uid-anuwat", projectName = "Townhouse renovation", files = []',
    'Same with files = [valid_photo.jpg]',
    'Same as TD01 with contractorUid = null (no contractor yet)',
    'Same as TD01; Firestore refuses the task write',
  ],
  cases: [
    {
      desc: 'Add a task to an active project', td: [1],
      expected: 'Resolves. A task { title: "Fix bathroom tap", status: "not_started", hasProgress: false, referenceImages: [] } is created; Anuwat gets "task_added" / "New task added" / "A new task was added: "Fix bathroom tap""; p1.unreadCountContractor = 1.',
      run: async () => {
        seedActiveK1(); await useTasksStore().addTask('p1', 'Fix bathroom tap', 'Replace with a single-lever chrome mixer', 'uid-anuwat', 'Townhouse renovation')
        const t = fs.get(fs.paths('projects/p1/tasks/')[0]); expect([t.title, t.status, t.hasProgress, t.referenceImages]).toEqual(['Fix bathroom tap', 'not_started', false, []])
        expect(notifs('uid-anuwat').map((x) => [x.type, x.title, x.message])).toEqual([['task_added', 'New task added', 'A new task was added: "Fix bathroom tap"']]); expect(fs.get('projects/p1').unreadCountContractor).toBe(1)
      },
    },
    { desc: 'Add a task with a reference photo', td: [2], expected: 'Resolves. The task has 1 reference image (stored under projects/p1/tasks/{taskId}/reference/); p1.photoCount = 1.', run: async () => { seedActiveK1(); await useTasksStore().addTask('p1', 'Fix bathroom tap', 'd', 'uid-anuwat', 'Townhouse renovation', [file('valid_photo.jpg', 'image/jpeg', 2 * MB)]); const id = fs.paths('projects/p1/tasks/')[0]; expect(fs.get(id).referenceImages).toHaveLength(1); expect(st.paths(`${id}/reference/`)).toHaveLength(1); expect(fs.get('projects/p1').photoCount).toBe(1) } },
    { desc: 'Add a task before a professional has joined', td: [3], expected: 'Resolves. The task is created; no notification is sent.', run: async () => { seedProject('k1', kitchenDoc()); await useTasksStore().addTask('k1', 'Fix bathroom tap', 'd', null, 'Kitchen tap replacement'); expect(fs.paths('projects/k1/tasks/')).toHaveLength(1); expect(fs.paths('users/', '').filter((p) => p.includes('/notifications/'))).toEqual([]) } },
    { desc: 'Add a task when the write is refused', td: [4], expected: 'Rejects with FirebaseError "permission-denied"; no task and no notification.', run: async () => { seedActiveK1(); fs.fail('addDoc', 'permission-denied', 'tasks'); const e = await rejects(useTasksStore().addTask('p1', 'Fix bathroom tap', 'd', 'uid-anuwat', 'Townhouse renovation')); expect(e.code).toBe('permission-denied'); expect(notifs('uid-anuwat')).toHaveLength(0) } },
  ],
})
const TREF = { thumb: 'https://storage.test/projects/p1/tasks/t1/reference/1-0-thumb-a.jpg.jpg', full: 'https://storage.test/projects/p1/tasks/t1/reference/1-0-full-a.jpg' }
utc('CD-20-F04', {
  prereq: TASKS,
  data: [
    'Task t1 "Repaint living room walls" (no progress yet, 1 reference photo; p1.photoCount = 1); title = "Repaint living room and hallway", description = "Two coats, cream white", removedImages = [its photo]',
    'Task t1 after a progress update was uploaded (hasProgress = true); same edit',
  ],
  cases: [
    {
      desc: 'Edit a task that has no progress yet', td: [1], expected: 'Resolves. t1.title = "Repaint living room and hallway", description = "Two coats, cream white", referenceImages = []; p1.photoCount = 0; the removed photo\'s files are deleted.',
      run: async () => {
        seedProject('p1', activeProject({ photoCount: 1 })); st.put('projects/p1/tasks/t1/reference/1-0-thumb-a.jpg.jpg'); st.put('projects/p1/tasks/t1/reference/1-0-full-a.jpg'); fs.set('projects/p1/tasks/t1', taskDoc({ referenceImages: [TREF] }))
        const s = useTasksStore(); s.subscribeToTasks('p1'); await s.editTask('p1', 't1', 'Repaint living room and hallway', 'Two coats, cream white', [], [], [TREF])
        const t = fs.get('projects/p1/tasks/t1'); expect([t.title, t.description, t.referenceImages]).toEqual(['Repaint living room and hallway', 'Two coats, cream white', []]); expect(fs.get('projects/p1').photoCount).toBe(0); expect(st.paths('projects/p1/tasks/')).toEqual([])
      },
    },
    {
      desc: 'Edit a task that already has progress', td: [2], expected: 'Rejects with Error("task-locked"); nothing is written.',
      run: async () => { seedActiveK1(); fs.set('projects/p1/tasks/t1', taskDoc({ hasProgress: true, status: 'awaiting_review' })); const s = useTasksStore(); s.subscribeToTasks('p1'); const e = await rejects(s.editTask('p1', 't1', 'X', 'Y')); expect(e.message).toBe('task-locked'); expect(fs.get('projects/p1/tasks/t1').title).toBe('Repaint living room walls') },
    },
  ],
})
utc('CD-20-F05', {
  prereq: TASKS,
  data: ['Task t1 with no progress and 1 reference photo (p1.photoCount = 1)', 'Task t1 with hasProgress = true'],
  cases: [
    { desc: 'Delete a task that has no progress', td: [1], expected: 'Resolves. projects/p1/tasks/t1 is deleted and removed from tasks; p1.photoCount = 0.', run: async () => { seedProject('p1', activeProject({ photoCount: 1 })); fs.set('projects/p1/tasks/t1', taskDoc({ referenceImages: [TREF] })); const s = useTasksStore(); s.subscribeToTasks('p1'); await s.deleteTask('p1', 't1'); expect(fs.has('projects/p1/tasks/t1')).toBe(false); expect(s.tasks).toEqual([]); expect(fs.get('projects/p1').photoCount).toBe(0) } },
    { desc: 'Delete a task that has progress', td: [2], expected: 'Rejects with Error("task-locked"); the task still exists.', run: async () => { seedActiveK1(); fs.set('projects/p1/tasks/t1', taskDoc({ hasProgress: true })); const s = useTasksStore(); s.subscribeToTasks('p1'); const e = await rejects(s.deleteTask('p1', 't1')); expect(e.message).toBe('task-locked'); expect(fs.has('projects/p1/tasks/t1')).toBe(true) } },
  ],
})

// ======================= CD-21 ProgressStore
function seedBoard() {
  seedProject('p1', activeProject())
  fs.set('projects/p1/tasks/t1', taskDoc({ status: 'awaiting_review', hasProgress: true }))
  fs.set('projects/p1/updates/u1', updateDoc_({}))
}
utc('CD-21-F03', {
  prereq: TASKS + '; Appendix 4.6 Test image files',
  data: [
    'projectId = "p1", homeownerUid = "uid-siriporn", taskId = "t1", taskTitle = "Repaint living room walls", files = [exif_photo.jpg, valid_photo.png], description = "First coat done on all walls.", exifTimestamp = 27 Oct 2026 14:15, exifDevice = "Apple iPhone 13", projectName = "Townhouse renovation"',
    'Same as TD01; Storage refuses the upload',
  ],
  cases: [
    {
      desc: 'Upload a progress update with 2 photos', td: [1],
      expected: 'Resolves. A projects/p1/updates document is created { taskId: "t1", status: "pending", sentBackReason: null, images: 2 items, exifDevice: "Apple iPhone 13", lastReminderAt: null }; p1.photoCount += 2; t1.hasProgress = true and t1.status = "awaiting_review"; Siriporn gets "progress_submitted" / "New progress to review" / "A new update was submitted on "Repaint living room walls"".',
      run: async () => {
        seedProject('p1', activeProject()); fs.set('projects/p1/tasks/t1', taskDoc())
        const ts = new Date(2026, 9, 27, 14, 15).getTime()
        await useProgressStore().addUpdate('p1', 'uid-siriporn', 't1', 'Repaint living room walls', [file('exif_photo.jpg', 'image/jpeg', 2 * MB), file('valid_photo.png', 'image/png', MB)], 'First coat done on all walls.', ts, 'Apple iPhone 13', 'Townhouse renovation')
        const u = fs.get(fs.paths('projects/p1/updates/')[0]); expect([u.taskId, u.status, u.sentBackReason, u.images.length, u.exifDevice, u.exifTimestamp, u.lastReminderAt]).toEqual(['t1', 'pending', null, 2, 'Apple iPhone 13', ts, null])
        expect(fs.get('projects/p1').photoCount).toBe(2); const t = fs.get('projects/p1/tasks/t1'); expect([t.hasProgress, t.status]).toEqual([true, 'awaiting_review'])
        expect(notifs('uid-siriporn').map((x) => [x.type, x.title, x.message])).toEqual([['progress_submitted', 'New progress to review', 'A new update was submitted on "Repaint living room walls"']])
      },
    },
    { desc: 'Upload when Storage refuses the photo', td: [2], expected: 'Rejects with the Storage error; no update document; t1 is unchanged (not_started, hasProgress false).', run: async () => { seedProject('p1', activeProject()); fs.set('projects/p1/tasks/t1', taskDoc()); st.fail('uploadBytes', 'storage/unauthorized', '', 2); const e = await rejects(useProgressStore().addUpdate('p1', 'uid-siriporn', 't1', 'Repaint living room walls', [file('exif_photo.jpg', 'image/jpeg')], 'x', null, null, 'Townhouse renovation')); expect(e.code).toBe('storage/unauthorized'); expect(fs.paths('projects/p1/updates/')).toEqual([]); expect(fs.get('projects/p1/tasks/t1').hasProgress).toBe(false) } },
  ],
})
utc('CD-21-F04', {
  prereq: TASKS,
  data: ['projectId = "p1", updateId = "u1" (pending, on t1), contractorUid = "uid-anuwat", taskTitle = "Repaint living room walls", projectName = "Townhouse renovation"', 'Same; Firestore refuses the update'],
  cases: [
    {
      desc: 'Confirm a pending progress update', td: [1],
      expected: 'Resolves. u1.status = "verified", sentBackReason = null; t1.status = "done"; p1.lastVerifiedPhotoUrl = u1\'s first thumbnail; Anuwat gets "progress_verified" / "Update verified" / "Your update on "Repaint living room walls" was confirmed".',
      run: async () => {
        seedBoard(); const s = useProgressStore(); s.subscribeToUpdates('p1'); await s.verifyUpdate('p1', 'u1', 'uid-anuwat', 'Repaint living room walls', 'Townhouse renovation')
        expect([fs.get('projects/p1/updates/u1').status, fs.get('projects/p1/updates/u1').sentBackReason, fs.get('projects/p1/tasks/t1').status]).toEqual(['verified', null, 'done'])
        expect(fs.get('projects/p1').lastVerifiedPhotoUrl).toBe('https://storage.test/progress/p1/a-thumb.jpg')
        expect(notifs('uid-anuwat').map((x) => [x.type, x.title, x.message])).toEqual([['progress_verified', 'Update verified', 'Your update on "Repaint living room walls" was confirmed']])
      },
    },
    { desc: 'Confirm when the update is refused', td: [2], expected: 'Rejects with FirebaseError "permission-denied"; u1 stays "pending"; no notification.', run: async () => { seedBoard(); const s = useProgressStore(); s.subscribeToUpdates('p1'); fs.fail('updateDoc', 'permission-denied', 'updates/u1'); const e = await rejects(s.verifyUpdate('p1', 'u1', 'uid-anuwat', 'Repaint living room walls', 'Townhouse renovation')); expect(e.code).toBe('permission-denied'); expect(fs.get('projects/p1/updates/u1').status).toBe('pending'); expect(notifs('uid-anuwat')).toHaveLength(0) } },
  ],
})
utc('CD-21-F05', {
  prereq: TASKS,
  data: ['projectId = "p1", updateId = "u1" (pending on t1 "Retile kitchen floor"), reason = "Two tiles near the door are uneven, please re-lay them.", contractorUid = "uid-anuwat", taskTitle = "Retile kitchen floor", projectName = "Townhouse renovation"', 'Same; Firestore refuses the update'],
  cases: [
    {
      desc: 'Send a progress update back with a reason', td: [1],
      expected: 'Resolves. u1.status = "sent_back", sentBackReason = "Two tiles near the door are uneven, please re-lay them."; t1.status = "sent_back"; Anuwat gets "progress_sent_back" / "Update sent back" / "Your update on "Retile kitchen floor" needs changes: Two tiles near the door are uneven, please re-lay them.".',
      run: async () => {
        seedBoard(); const s = useProgressStore(); s.subscribeToUpdates('p1'); const R = 'Two tiles near the door are uneven, please re-lay them.'
        await s.sendBackUpdate('p1', 'u1', R, 'uid-anuwat', 'Retile kitchen floor', 'Townhouse renovation')
        const u = fs.get('projects/p1/updates/u1'); expect([u.status, u.sentBackReason, fs.get('projects/p1/tasks/t1').status]).toEqual(['sent_back', R, 'sent_back'])
        expect(notifs('uid-anuwat').map((x) => [x.type, x.title, x.message])).toEqual([['progress_sent_back', 'Update sent back', 'Your update on "Retile kitchen floor" needs changes: ' + R]])
      },
    },
    { desc: 'Send back when the update is refused', td: [2], expected: 'Rejects with FirebaseError "permission-denied"; u1 stays "pending".', run: async () => { seedBoard(); const s = useProgressStore(); s.subscribeToUpdates('p1'); fs.fail('updateDoc', 'permission-denied', 'updates/u1'); const e = await rejects(s.sendBackUpdate('p1', 'u1', 'r', 'uid-anuwat', 'x', 'y')); expect(e.code).toBe('permission-denied'); expect(fs.get('projects/p1/updates/u1').status).toBe('pending') } },
  ],
})
utc('CD-21-F06', {
  prereq: TASKS,
  data: ['projectId = "p1", updateId = "u1" (pending for over 24 hours), taskTitle = "Repaint living room walls", homeownerUid = "uid-siriporn", projectName = "Townhouse renovation"', 'Same; Firestore refuses the update'],
  cases: [
    {
      desc: 'Send a reminder for an update waiting over 24 hours', td: [1],
      expected: 'Resolves. u1.lastReminderAt = now; Siriporn gets "progress_submitted" / "Still waiting for your review" / "Reminder: "Repaint living room walls" has been waiting for your review".',
      run: async () => {
        seedBoard(); const s = useProgressStore(); s.subscribeToUpdates('p1'); const before = Date.now()
        await s.sendStalledReminder('p1', 'u1', 'Repaint living room walls', 'uid-siriporn', 'Townhouse renovation')
        expect(fs.get('projects/p1/updates/u1').lastReminderAt >= before).toBe(true)
        expect(notifs('uid-siriporn').map((x) => [x.type, x.title, x.message])).toEqual([['progress_submitted', 'Still waiting for your review', 'Reminder: "Repaint living room walls" has been waiting for your review']])
      },
    },
    { desc: 'Send a reminder when the write is refused', td: [2], expected: 'Rejects with FirebaseError "permission-denied"; no notification.', run: async () => { seedBoard(); fs.fail('updateDoc', 'permission-denied', 'updates/u1'); const e = await rejects(useProgressStore().sendStalledReminder('p1', 'u1', 'x', 'uid-siriporn', 'y')); expect(e.code).toBe('permission-denied'); expect(notifs('uid-siriporn')).toHaveLength(0) } },
  ],
})

// ======================= CD-22 NotificationsStore
function seedNotifs() {
  seedProject('p1', activeProject()); seedProject('k1', invited())
  fs.set('users/uid-anuwat/notifications/n1', { recipientUid: 'uid-anuwat', type: 'invitation_received', title: 'New project invitation', message: 'Kanokwan Srisuk invited you to "Kitchen tap replacement"', projectId: 'k1', projectName: 'Kitchen tap replacement', read: false, createdAt: T0 })
  fs.set('users/uid-anuwat/notifications/n2', { recipientUid: 'uid-anuwat', type: 'task_added', title: 'New task added', message: 'A new task was added: "Fix bathroom tap"', projectId: 'p1', projectName: 'Townhouse renovation', read: false, createdAt: T0 - DAY })
  fs.set('users/uid-anuwat/notifications/n3', { recipientUid: 'uid-anuwat', type: 'progress_verified', title: 'Update verified', message: 'Your update on "Repaint living room walls" was confirmed', projectId: 'p1', projectName: 'Townhouse renovation', read: true, createdAt: T0 - 2 * DAY })
}
const reads = () => ['n1', 'n2', 'n3'].map((id) => fs.get(`users/uid-anuwat/notifications/${id}`).read)
utc('CD-22-F03', {
  prereq: NOTIF,
  data: ['notificationId = "n1" (unread)', 'notificationId = "n3" (already read)', 'notificationId = "n1"; the update fails'],
  cases: [
    { desc: 'Mark an unread notification as read', td: [1], expected: 'Resolves. n1.read = true; n2 is unchanged.', run: async () => { seedNotifs(); const s = useNotificationsStore(); s.subscribeToUserNotifications('uid-anuwat'); await s.markAsRead('n1'); expect(reads()).toEqual([true, false, true]) } },
    { desc: 'Mark an already-read notification', td: [2], expected: 'Resolves without writing anything.', run: async () => { seedNotifs(); const s = useNotificationsStore(); s.subscribeToUserNotifications('uid-anuwat'); fs.calls.length = 0; await s.markAsRead('n3'); expect(fs.calls.filter((c) => c[0] === 'updateDoc')).toEqual([]) } },
    { desc: 'Mark as read when the write fails', td: [3], expected: 'Resolves anyway (error only logged); n1.read stays false.', run: async () => { seedNotifs(); const s = useNotificationsStore(); s.subscribeToUserNotifications('uid-anuwat'); fs.fail('updateDoc', 'permission-denied'); await s.markAsRead('n1'); expect(reads()[0]).toBe(false) } },
  ],
})
utc('CD-22-F04', {
  prereq: NOTIF, data: ['Anuwat\'s notifications: n1 and n2 unread, n3 read'],
  cases: [{ desc: 'Mark all notifications as read', td: [1], expected: 'Resolves. n1, n2 and n3 are all read = true; unreadCount = 0.', run: async () => { seedNotifs(); const s = useNotificationsStore(); s.subscribeToUserNotifications('uid-anuwat'); await s.markAllAsRead(); expect(reads()).toEqual([true, true, true]); expect(s.unreadCount).toBe(0) } }],
})
utc('CD-22-F06', {
  prereq: PROJ,
  data: [
    'recipientUid = "uid-siriporn", type = "progress_submitted", title = "New progress to review", message = "A new update was submitted on "Fix bathroom tap"", projectId = "p1", projectName = "Townhouse renovation", recipientRole = "homeowner"',
    'Same as TD01 without recipientRole',
    'Same as TD01; the notification write fails',
  ],
  cases: [
    { desc: 'Notify a homeowner about a project event', td: [1], expected: 'Resolves. users/uid-siriporn/notifications gets { type: "progress_submitted", title: "New progress to review", read: false, projectId: "p1", ... }; p1.unreadCountHomeowner = 1.', run: async () => { seedProject('p1', activeProject()); await useNotificationsStore().notify('uid-siriporn', 'progress_submitted', 'New progress to review', 'A new update was submitted on "Fix bathroom tap"', 'p1', 'Townhouse renovation', 'homeowner'); const n = notifs('uid-siriporn'); expect([n.length, n[0].type, n[0].read, n[0].projectId]).toEqual([1, 'progress_submitted', false, 'p1']); expect(fs.get('projects/p1').unreadCountHomeowner).toBe(1) } },
    { desc: 'Notify without a recipient role', td: [2], expected: 'Resolves. The notification is written; no unread counter on p1 changes.', run: async () => { seedProject('p1', activeProject()); await useNotificationsStore().notify('uid-siriporn', 'progress_submitted', 't', 'm', 'p1', 'Townhouse renovation'); expect(notifs('uid-siriporn')).toHaveLength(1); expect([fs.get('projects/p1').unreadCountHomeowner, fs.get('projects/p1').unreadCountContractor]).toEqual([0, 0]) } },
    { desc: 'Notify when the write fails', td: [3], expected: 'Resolves without throwing (fire-and-forget); nothing is written.', run: async () => { seedProject('p1', activeProject()); fs.fail('addDoc', 'permission-denied', 'notifications'); await useNotificationsStore().notify('uid-siriporn', 'progress_submitted', 't', 'm', 'p1', 'Townhouse renovation', 'homeowner'); expect(notifs('uid-siriporn')).toHaveLength(0) } },
  ],
})
