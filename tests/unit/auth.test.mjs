// Generated from the TamBaan Test Plan (Chapter 3.1). Each describe() is one UTC,
// each it() is one test case, with the same wording as the document.
import { utc, expect, rejects, beforeEachCase, resetHooks, flush } from './support/utc.mjs'
import { reset, fs, fa, auth, sent, st, SIRIPORN, ANUWAT, PW, loginAs, file, MB, T0 } from './support/env.mjs'

const { useAuthStore } = await import('@/stores/auth')
const { useNotificationsStore } = await import('@/stores/notifications')
const ACCTS = 'Appendix 4.1 Registered user accounts'
const UN = 'Appendix 4.2 Reserved usernames'

resetHooks()
beforeEachCase(() => reset())

const NEWFORM = {
  firstName: 'Kittipong', lastName: 'Saetang', phone: '0871234567', username: 'kittipong-s',
  lineId: '', facebookId: '', province: 'Chiang Mai', role: 'homeowner', workCategories: [],
}

utc('CD-13-F03', {
  prereq: ACCTS,
  data: [
    'Email = "bhupha.p+new1@gmail.com"\nPassword = "TamBaan88"',
    'Email = "bhupha.p+home1@gmail.com"\nPassword = "TamBaan88"',
    'Email = "bhupha.p+new1gmail.com"\nPassword = "TamBaan88"',
  ],
  cases: [
    {
      desc: 'Register with a new email and a valid password', td: [1],
      expected: 'Returns the new Firebase User { email: "bhupha.p+new1@gmail.com", emailVerified: false }; user is set; a verification email is sent with continue URL "https://tambaan.vercel.app/home".',
      run: async () => {
        const a = useAuthStore()
        const u = await a.register('bhupha.p+new1@gmail.com', PW)
        expect(u.email).toBe('bhupha.p+new1@gmail.com'); expect(u.emailVerified).toBe(false)
        expect(a.user.uid).toBe(u.uid); expect(a.loading).toBe(false)
        await flush()
        expect(sent.verification).toEqual([{ email: 'bhupha.p+new1@gmail.com', settings: { url: 'https://tambaan.vercel.app/home' } }])
      },
    },
    {
      desc: 'Register with an email that already has an account', td: [2],
      expected: 'Rejects with FirebaseError code "auth/email-already-in-use"; user stays null.',
      run: async () => {
        const a = useAuthStore()
        const e = await rejects(a.register('bhupha.p+home1@gmail.com', PW))
        expect(e.code).toBe('auth/email-already-in-use'); expect(a.user).toBeNull(); expect(a.loading).toBe(false)
      },
    },
    {
      desc: 'Register with an invalid email format', td: [3],
      expected: 'Rejects with FirebaseError code "auth/invalid-email"; user stays null.',
      run: async () => {
        const a = useAuthStore()
        const e = await rejects(a.register('bhupha.p+new1gmail.com', PW))
        expect(e.code).toBe('auth/invalid-email'); expect(a.user).toBeNull()
      },
    },
  ],
})

utc('CD-13-F04', {
  prereq: ACCTS,
  data: [
    'Email = "bhupha.p+home1@gmail.com"\nPassword = "TamBaan88"',
    'Email = "bhupha.p+home1@gmail.com"\nPassword = "TamBaan99"',
    'Email = "bhupha.p+nobody@gmail.com"\nPassword = "TamBaan88"',
    'Email = "bhupha.p+home1gmail.com"\nPassword = "TamBaan88"',
  ],
  cases: [
    {
      desc: 'Log in with a registered email and the correct password', td: [1],
      expected: 'Returns the signed-in Firebase User { uid: "uid-siriporn", email: "bhupha.p+home1@gmail.com", emailVerified: true }; profile is loaded (firstName "Siriporn", username "siriporn-k", role "homeowner").',
      run: async () => {
        const a = useAuthStore()
        const u = await a.login('bhupha.p+home1@gmail.com', PW)
        expect(u).toEqual({ uid: 'uid-siriporn', email: 'bhupha.p+home1@gmail.com', emailVerified: true })
        expect([a.profile.firstName, a.profile.username, a.profile.role]).toEqual(['Siriporn', 'siriporn-k', 'homeowner'])
      },
    },
    {
      desc: 'Log in with the wrong password', td: [2],
      expected: 'Rejects with FirebaseError code "auth/invalid-credential"; user and profile stay null.',
      run: async () => {
        const a = useAuthStore()
        const e = await rejects(a.login('bhupha.p+home1@gmail.com', 'TamBaan99'))
        expect(e.code).toBe('auth/invalid-credential'); expect(a.user).toBeNull(); expect(a.profile).toBeNull()
      },
    },
    {
      desc: 'Log in with an email that has no account', td: [3],
      expected: 'Rejects with FirebaseError code "auth/invalid-credential" (the same error as a wrong password).',
      run: async () => {
        const e = await rejects(useAuthStore().login('bhupha.p+nobody@gmail.com', PW))
        expect(e.code).toBe('auth/invalid-credential')
      },
    },
    {
      desc: 'Log in with an invalid email format', td: [4],
      expected: 'Rejects with FirebaseError code "auth/invalid-email".',
      run: async () => {
        const e = await rejects(useAuthStore().login('bhupha.p+home1gmail.com', PW))
        expect(e.code).toBe('auth/invalid-email')
      },
    },
  ],
})

utc('CD-13-F05', {
  prereq: ACCTS,
  data: ['Logged in as Siriporn (bhupha.p+home1@gmail.com)'],
  cases: [
    {
      desc: 'Log out while logged in', td: [1],
      expected: 'Resolves. user = null, profile = null, emailVerified = false; Firebase currentUser = null.',
      run: async () => {
        const a = await loginAs(SIRIPORN)
        await a.logout()
        expect(a.user).toBeNull(); expect(a.profile).toBeNull(); expect(a.emailVerified).toBe(false); expect(auth.currentUser).toBeNull()
      },
    },
  ],
})

utc('CD-13-F09', {
  prereq: ACCTS,
  data: [
    'Logged in as Siriporn; form data = her profile with phone = "0811112222"',
    'Nobody logged in; same form data',
    'Logged in as Siriporn; Firestore answers "permission-denied"',
  ],
  cases: [
    {
      desc: 'Save edited profile details', td: [1],
      expected: 'Resolves. users/uid-siriporn.phone = "0811112222" and updatedAt is refreshed; createdAt is unchanged; profile is reloaded with the new phone.',
      run: async () => {
        const a = await loginAs(SIRIPORN)
        const { uid, createdAt, updatedAt, photoURL, ...form } = SIRIPORN
        await a.saveProfile({ ...form, phone: '0811112222' })
        const d = fs.get('users/uid-siriporn')
        expect(d.phone).toBe('0811112222'); expect(d.createdAt).toBe(SIRIPORN.createdAt); expect(d.updatedAt).toBeGreaterThan(T0)
        expect(a.profile.phone).toBe('0811112222')
      },
    },
    {
      desc: 'Save while not logged in', td: [2],
      expected: 'Rejects with Error("Not authenticated"); nothing is written.',
      run: async () => {
        const e = await rejects(useAuthStore().saveProfile({ ...NEWFORM }))
        expect(e.message).toBe('Not authenticated')
        expect(fs.calls.some((c) => c[0] === 'setDoc')).toBe(false)
      },
    },
    {
      desc: 'Save when Firestore rules refuse the write', td: [3],
      expected: 'Rejects with FirebaseError code "permission-denied"; the stored profile is unchanged.',
      run: async () => {
        const a = await loginAs(SIRIPORN)
        fs.fail('setDoc', 'permission-denied', 'users/')
        const { uid, createdAt, updatedAt, photoURL, ...form } = SIRIPORN
        const e = await rejects(a.saveProfile({ ...form, phone: '0811112222' }))
        expect(e.code).toBe('permission-denied'); expect(fs.get('users/uid-siriporn').phone).toBe('0812345678')
      },
    },
  ],
})

utc('CD-13-F10', {
  prereq: ACCTS + '; Appendix 4.6 Test image files',
  data: [
    'Logged in as Siriporn; file = avatar.jpg (image/jpeg, 2 MB)',
    'Logged in as Siriporn; file = large_photo.jpg (image/jpeg, 9 MB)',
    'Nobody logged in; file = avatar.jpg',
  ],
  cases: [
    {
      desc: 'Upload a valid profile photo', td: [1],
      expected: 'Returns the download URL "https://storage.test/avatars/uid-siriporn/{timestamp}-avatar.jpg" (uploaded with contentType "image/jpeg"); users/uid-siriporn.photoURL and profile.photoURL = that URL.',
      run: async () => {
        const a = await loginAs(SIRIPORN)
        const url = await a.uploadAvatar(file('avatar.jpg', 'image/jpeg', 2 * MB))
        expect(url).toMatch(/^https:\/\/storage\.test\/avatars\/uid-siriporn\/\d+-avatar\.jpg$/)
        expect(fs.get('users/uid-siriporn').photoURL).toBe(url); expect(a.profile.photoURL).toBe(url)
        expect(st.calls[0][2]).toBe('image/jpeg')
      },
    },
    {
      desc: 'Upload a photo larger than 8 MB', td: [2],
      expected: 'Rejects with Error("Photo must be under 8MB. Try a smaller image or a screenshot instead."); nothing is uploaded.',
      run: async () => {
        const a = await loginAs(SIRIPORN)
        const e = await rejects(a.uploadAvatar(file('large_photo.jpg', 'image/jpeg', 9 * MB)))
        expect(e.message).toBe('Photo must be under 8MB. Try a smaller image or a screenshot instead.')
        expect(st.paths()).toHaveLength(0)
      },
    },
    {
      desc: 'Upload while not logged in', td: [3],
      expected: 'Rejects with Error("Not authenticated").',
      run: async () => {
        const e = await rejects(useAuthStore().uploadAvatar(file('avatar.jpg', 'image/jpeg', 2 * MB)))
        expect(e.message).toBe('Not authenticated')
      },
    },
  ],
})

utc('CD-13-F11', {
  prereq: UN,
  data: ['username = "siriporn-k"', 'username = "kittipong-s"'],
  cases: [
    {
      desc: 'Check a username that is already reserved', td: [1], expected: 'Returns false.',
      run: async () => expect(await useAuthStore().isUsernameAvailable('siriporn-k')).toBe(false),
    },
    {
      desc: 'Check a username nobody has reserved', td: [2], expected: 'Returns true.',
      run: async () => expect(await useAuthStore().isUsernameAvailable('kittipong-s')).toBe(true),
    },
  ],
})

utc('CD-13-F12', {
  prereq: UN + ' (plus usernames/siriporn-k-1 reserved)',
  data: ['base = "siriporn-k", count = 4 (default)', 'base = "kittipong-s", count = 2'],
  cases: [
    {
      desc: 'Suggest free usernames when the first numbered one is taken', td: [1],
      expected: 'Returns ["siriporn-k-2", "siriporn-k-3", "siriporn-k-4", "siriporn-k-5"] (siriporn-k-1 is skipped).',
      run: async () => {
        fs.set('usernames/siriporn-k-1', { uid: 'uid-x', createdAt: T0 })
        expect(await useAuthStore().suggestUsernames('siriporn-k')).toEqual(['siriporn-k-2', 'siriporn-k-3', 'siriporn-k-4', 'siriporn-k-5'])
      },
    },
    {
      desc: 'Ask for a smaller number of suggestions', td: [2],
      expected: 'Returns ["kittipong-s-1", "kittipong-s-2"].',
      run: async () => expect(await useAuthStore().suggestUsernames('kittipong-s', 2)).toEqual(['kittipong-s-1', 'kittipong-s-2']),
    },
  ],
})

utc('CD-13-F13', {
  prereq: ACCTS + '; ' + UN,
  data: [
    'Logged in as new account bhupha.p+new1@gmail.com (no profile yet)\nfirstName = "Kittipong", lastName = "Saetang", phone = "0871234567", username = "kittipong-s", province = "Chiang Mai", role = "homeowner"',
    'Same account; username = "siriporn-k" (already reserved)',
    'Nobody logged in; same data as TD01',
  ],
  cases: [
    {
      desc: 'Create the profile with a free username', td: [1],
      expected: 'Resolves. usernames/kittipong-s = { uid: <new uid> } and users/<new uid> exist; profile.username = "kittipong-s".',
      run: async () => {
        const a = useAuthStore()
        const u = await a.register('bhupha.p+new1@gmail.com', PW)
        await a.createProfileWithUsername({ ...NEWFORM })
        expect(fs.get('usernames/kittipong-s').uid).toBe(u.uid)
        expect(fs.get(`users/${u.uid}`).firstName).toBe('Kittipong'); expect(a.profile.username).toBe('kittipong-s')
      },
    },
    {
      desc: 'Create the profile with a username someone else holds', td: [2],
      expected: 'Rejects with Error("username-taken"); no users document is created for the new account.',
      run: async () => {
        const a = useAuthStore()
        const u = await a.register('bhupha.p+new1@gmail.com', PW)
        const e = await rejects(a.createProfileWithUsername({ ...NEWFORM, username: 'siriporn-k' }))
        expect(e.message).toBe('username-taken'); expect(fs.has(`users/${u.uid}`)).toBe(false)
      },
    },
    {
      desc: 'Create the profile while not logged in', td: [3],
      expected: 'Rejects with Error("Not authenticated").',
      run: async () => {
        const e = await rejects(useAuthStore().createProfileWithUsername({ ...NEWFORM }))
        expect(e.message).toBe('Not authenticated')
      },
    },
  ],
})

