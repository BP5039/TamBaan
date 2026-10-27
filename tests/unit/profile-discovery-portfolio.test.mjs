// Generated from the TamBaan Test Plan (Chapter 3.1). Each describe() is one UTC,
// each it() is one test case, with the same wording as the document.
import { utc, expect, rejects, beforeEachCase, resetHooks, flush } from './support/utc.mjs'
import { reset, fs, st, SIRIPORN, ANUWAT, PRASERT, file, MB, T0, DAY } from './support/env.mjs'

const { useAuthModalStore } = await import('@/stores/authModal')
const { useOnboardingModalStore } = await import('@/stores/onboardingModal')
const { usePublicProfileStore } = await import('@/stores/publicProfile')
const { useDiscoveryStore } = await import('@/stores/discovery')
const { usePortfolioStore } = await import('@/stores/portfolio')
const ACCTS = 'Appendix 4.1 Registered user accounts'

resetHooks()
beforeEachCase(() => reset())

// ---------------- CD-14 AuthModalStore

// ---------------- CD-15 OnboardingModalStore

// ---------------- CD-16 PublicProfileStore
utc('CD-16-F01', {
  prereq: ACCTS + '; Appendix 4.2 Reserved usernames',
  data: ['username = "anuwat-p"', 'username = "nobody-x"', 'username = "ghost-u" (reserved, but its users document is missing)', 'username = "anuwat-p"; Firestore read fails (unavailable)'],
  cases: [
    {
      desc: 'Load an existing professional by username', td: [1],
      expected: 'Resolves. profile.uid = "uid-anuwat", profile.firstName = "Anuwat"; notFound = false; loading = false.',
      run: async () => {
        const s = usePublicProfileStore(); await s.loadByUsername('anuwat-p')
        expect([s.profile.uid, s.profile.firstName, s.notFound, s.loading]).toEqual(['uid-anuwat', 'Anuwat', false, false])
      },
    },
    {
      desc: 'Load a username that is not reserved', td: [2], expected: 'Resolves. profile = null, notFound = true.',
      run: async () => { const s = usePublicProfileStore(); await s.loadByUsername('nobody-x'); expect([s.profile, s.notFound]).toEqual([null, true]) },
    },
    {
      desc: 'Load a reserved username whose profile document is missing', td: [3], expected: 'Resolves. profile = null, notFound = true.',
      run: async () => {
        fs.set('usernames/ghost-u', { uid: 'uid-ghost', createdAt: T0 })
        const s = usePublicProfileStore(); await s.loadByUsername('ghost-u'); expect([s.profile, s.notFound]).toEqual([null, true])
      },
    },
    {
      desc: 'Load when the Firestore read fails', td: [4], expected: 'Resolves (does not throw). profile = null, notFound = true, loading = false.',
      run: async () => {
        fs.fail('getDoc', 'unavailable', 'usernames/')
        const s = usePublicProfileStore(); await s.loadByUsername('anuwat-p'); expect([s.profile, s.notFound, s.loading]).toEqual([null, true, false])
      },
    },
  ],
})

// ---------------- CD-17 DiscoveryStore
const SOMCHAI = { ...ANUWAT, uid: 'uid-somchai', firstName: 'Somchai', lastName: 'Boonmee', username: 'somchai-renovate', createdAt: T0 - 60 * DAY, portfolioCount: 3, rating: 4.2 }
function seedPros() {
  fs.set('users/uid-somchai', SOMCHAI)
  fs.set('users/uid-anuwat', { ...ANUWAT, portfolioCount: 1, rating: 4.67, portfolioPreview: [{ id: 'w1', title: 'Nimman townhouse repaint', thumbUrl: '', description: 'Interior repaint, 3 rooms, 5 days', location: 'Chiang Mai' }] })
}
const names = (list) => list.map((p) => p.username)

utc('CD-17-F04', {
  prereq: ACCTS + ' (professionals Anuwat, Prasert, Somchai)',
  data: ['rawQuery = "painter chiang mai"', 'rawQuery = "Nimman"', 'rawQuery = "electrican" (typo)'],
  cases: [
    {
      desc: 'Search with a category and a province in plain words', td: [1],
      expected: 'selectedCategories = ["painter"], selectedProvince = "Chiang Mai", searchQuery = "" (turned into filters); results = [Anuwat, Somchai].',
      run: async () => {
        seedPros(); const d = useDiscoveryStore(); d.submitSearch('painter chiang mai'); await flush()
        expect([d.selectedCategories, d.selectedProvince, d.searchQuery]).toEqual([['painter'], 'Chiang Mai', ''])
        expect(names(d.results).sort()).toEqual(['anuwat-p', 'somchai-renovate'])
      },
    },
    {
      desc: 'Search with free text that is not a category or province', td: [2],
      expected: 'No filter is applied; searchQuery = "Nimman"; filteredResults = [Anuwat] (matched on his past work "Nimman townhouse repaint").',
      run: async () => {
        seedPros(); const d = useDiscoveryStore(); d.submitSearch('Nimman'); await flush()
        expect([d.selectedCategories, d.selectedProvince, d.searchQuery]).toEqual([[], null, 'Nimman'])
        expect(names(d.filteredResults)).toEqual(['anuwat-p'])
      },
    },
    {
      desc: 'Search with a misspelled category', td: [3],
      expected: 'selectedCategories = ["electrician"] (typo tolerated); results = [Prasert].',
      run: async () => { seedPros(); const d = useDiscoveryStore(); d.submitSearch('electrican'); await flush(); expect(d.selectedCategories).toEqual(['electrician']); expect(names(d.results)).toEqual(['prasert-w']) },
    },
  ],
})
utc('CD-17-F05', {
  prereq: ACCTS + ' (professionals Anuwat, Prasert, Somchai; homeowners Siriporn, Kanokwan)',
  data: ['No filters', 'selectedProvince = "Chiang Mai", selectedCategories = ["electrician"]', 'No filters; Firestore query fails (missing index)'],
  cases: [
    {
      desc: 'Run the search with no filters', td: [1],
      expected: 'Resolves. results = the 3 professionals only (homeowners are never returned); error = ""; loading = false.',
      run: async () => { seedPros(); const d = useDiscoveryStore(); await d.runSearch(); expect(names(d.results).sort()).toEqual(['anuwat-p', 'prasert-w', 'somchai-renovate']); expect([d.error, d.loading]).toEqual(['', false]) },
    },
    {
      desc: 'Run the search with filters nobody matches', td: [2], expected: 'Resolves. results = [] (the page shows its empty state).',
      run: async () => { seedPros(); const d = useDiscoveryStore(); d.selectedProvince = 'Chiang Mai'; d.selectedCategories = ['electrician']; await d.runSearch(); expect(d.results).toEqual([]) },
    },
    {
      desc: 'Run the search when the query fails', td: [3],
      expected: 'Resolves. error = "Search failed. If this is the first search with these filters, check the console for a Firestore index link."; loading = false.',
      run: async () => {
        fs.fail('getDocs', 'failed-precondition', 'users'); const d = useDiscoveryStore(); await d.runSearch()
        expect(d.error).toBe('Search failed. If this is the first search with these filters, check the console for a Firestore index link.'); expect(d.loading).toBe(false)
      },
    },
  ],
})
utc('CD-17-F07', {
  prereq: ACCTS + ' (Somchai: created 60 days ago, 3 works, rating 4.2; Anuwat: 29 days ago, 1 work, 4.67; Prasert: 5 days ago, 0 works, no rating)',
  data: ['sortOption = "newest"', 'sortOption = "oldest"', 'sortOption = "mostWork"', 'sortOption = "leastWork"', 'sortOption = "highestRated"'],
  cases: [
    ['newest', ['prasert-w', 'anuwat-p', 'somchai-renovate']],
    ['oldest', ['somchai-renovate', 'anuwat-p', 'prasert-w']],
    ['mostWork', ['somchai-renovate', 'anuwat-p', 'prasert-w']],
    ['leastWork', ['prasert-w', 'anuwat-p', 'somchai-renovate']],
    ['highestRated', ['anuwat-p', 'somchai-renovate', 'prasert-w']],
  ].map(([opt, order], i) => ({
    desc: `Sort by "${opt}"`, td: [i + 1], expected: `Returns [${order.join(', ')}].`,
    run: async () => { seedPros(); const d = useDiscoveryStore(); await d.runSearch(); d.setSortOption(opt); expect(names(d.sortedResults)).toEqual(order) },
  })),
})

// ---------------- CD-18 PortfolioStore
const W1 = { title: 'Nimman townhouse repaint', description: 'Interior repaint, 3 rooms, 5 days', year: 2025, location: 'Chiang Mai', source: 'manual', projectId: null, images: [{ thumb: 'https://storage.test/portfolio/uid-anuwat/1-thumb-a.jpg.jpg', full: 'https://storage.test/portfolio/uid-anuwat/1-full-a.jpg' }], createdAt: T0 - 10 * DAY }
function seedWork() {
  fs.set('users/uid-anuwat/portfolio/w1', W1)
  fs.set('users/uid-anuwat/portfolio/w2', { imageURL: 'https://storage.test/old.jpg', description: 'Old-format entry from before titles existed', createdAt: new Date(2024, 4, 1).getTime() })
  st.put('portfolio/uid-anuwat/1-thumb-a.jpg.jpg'); st.put('portfolio/uid-anuwat/1-full-a.jpg')
}
utc('CD-18-F02', {
  prereq: 'Appendix 4.3 Past work; Appendix 4.6 Test image files',
  data: [
    'uid = "uid-prasert", files = [valid_photo.jpg (2 MB)], title = "Lamphun shophouse rewiring", description = "Full rewiring of a two-storey shophouse", year = 2025, location = "Lamphun"',
    'Same as TD01; Storage upload is refused',
  ],
  cases: [
    {
      desc: 'Add a past-work entry with one photo', td: [1],
      expected: 'Resolves. A users/uid-prasert/portfolio document is created with source "manual", projectId null and images [{ full, thumb }] (thumb = full when no thumbnail can be made); items[0].title = "Lamphun shophouse rewiring"; users/uid-prasert.portfolioCount = 1 and portfolioPreview[0].title = "Lamphun shophouse rewiring".',
      run: async () => {
        const p = usePortfolioStore()
        await p.addItem('uid-prasert', [file('valid_photo.jpg', 'image/jpeg', 2 * MB)], 'Lamphun shophouse rewiring', 'Full rewiring of a two-storey shophouse', 2025, 'Lamphun')
        const docs = fs.paths('users/uid-prasert/portfolio/'); expect(docs).toHaveLength(1)
        const d = fs.get(docs[0]); expect([d.source, d.projectId]).toEqual(['manual', null]); expect(d.images[0].full).toMatch(/^https:\/\/storage\.test\/portfolio\/uid-prasert\//)
        expect(d.images[0].thumb).toBe(d.images[0].full)
        expect(p.items[0].title).toBe('Lamphun shophouse rewiring')
        const u = fs.get('users/uid-prasert'); expect(u.portfolioCount).toBe(1); expect(u.portfolioPreview[0].title).toBe('Lamphun shophouse rewiring')
      },
    },
    {
      desc: 'Add a past-work entry when the upload fails', td: [2],
      expected: 'Rejects with the Storage error (storage/unauthorized); no portfolio document is created and items stays empty.',
      run: async () => {
        st.fail('uploadBytes', 'storage/unauthorized'); const p = usePortfolioStore()
        const e = await rejects(p.addItem('uid-prasert', [file('valid_photo.jpg', 'image/jpeg', 2 * MB)], 'Lamphun shophouse rewiring', 'x', 2025, 'Lamphun'))
        expect(e.code).toBe('storage/unauthorized'); expect(fs.paths('users/uid-prasert/portfolio/')).toHaveLength(0); expect(p.items).toEqual([])
      },
    },
  ],
})
utc('CD-18-F03', {
  prereq: 'Appendix 4.3 Past work (portfolio)',
  data: ['uid = "uid-anuwat", item = "Nimman townhouse repaint" (w1, 2 stored files)', 'Same item; its photo files were already deleted from Storage'],
  cases: [
    {
      desc: 'Remove a past-work entry', td: [1],
      expected: 'Resolves. users/uid-anuwat/portfolio/w1 is deleted, both its Storage files are deleted, items no longer contains it, and portfolioCount = 1.',
      run: async () => {
        seedWork(); const p = usePortfolioStore(); await p.fetchItems('uid-anuwat')
        await p.removeItem('uid-anuwat', p.items[0])
        expect(fs.has('users/uid-anuwat/portfolio/w1')).toBe(false); expect(st.paths('portfolio/')).toHaveLength(0)
        expect(p.items.map((i) => i.id)).toEqual(['w2']); expect(fs.get('users/uid-anuwat').portfolioCount).toBe(1)
      },
    },
    {
      desc: 'Remove an entry whose files are already gone', td: [2],
      expected: 'Resolves (missing files are ignored); the document is deleted.',
      run: async () => {
        seedWork(); st.reset(); const p = usePortfolioStore(); await p.fetchItems('uid-anuwat')
        await p.removeItem('uid-anuwat', p.items[0]); expect(fs.has('users/uid-anuwat/portfolio/w1')).toBe(false)
      },
    },
  ],
})
const { syncPreview, __test } = await import('@/stores/portfolio')
