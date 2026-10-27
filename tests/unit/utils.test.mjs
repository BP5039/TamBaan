// Generated from the TamBaan Test Plan (Chapter 3.1). Each describe() is one UTC,
// each it() is one test case, with the same wording as the document.
import { fileURLToPath } from 'node:url'
import { utc, expect, rejects, beforeEachCase, resetHooks } from './support/utc.mjs'
import { reset, heicState, file, MB, T0, DAY } from './support/env.mjs'
import { readFileSync } from 'node:fs'

const FX = fileURLToPath(new URL('./fixtures/', import.meta.url))
const fx = (name, type) => new File([readFileSync(FX + name)], name, { type })
const IMG = 'Appendix 4.6 Test image files'

const { isPasswordValid } = await import('@/utils/passwordPolicy')
const { friendlyAuthError, fieldAuthError } = await import('@/utils/authErrors')
const { sanitizePhoneInput, isValidPhone } = await import('@/utils/phone')
const { validateImageFile, imageContentType } = await import('@/constants/fileValidation')
const { isHeic, prepareImageFile } = await import('@/utils/heic')
const exifMod = await import('@/utils/exif')
const { readExif, formatExif } = exifMod
const { createThumbnail } = await import('@/utils/imageResize')
const sp = await import('@/utils/searchParse')
const { snapshotAt } = await import('@/utils/snapshot')
const { buildGalleryAlbums } = await import('@/utils/gallery')
const { getScheduleWarning } = await import('@/utils/scheduleWarnings')
const { formatLastSeen, getActivityTier, activityRingClass } = await import('@/utils/lastSeen')

resetHooks()
beforeEachCase(() => reset({ seed: false }))

const table = (rows) => ({
  data: rows.map((r) => r[0]),
  cases: rows.map((r, i) => ({ desc: r[1], td: [i + 1], expected: r[2], run: r[3] })),
})

// CD-23 PasswordPolicy
utc('CD-23-F01', {
  prereq: '-',
  ...table([
    ['password = "TamBaan88"', 'Check a password with 8+ characters, letters and a number', 'Returns true.', () => expect(isPasswordValid('TamBaan88')).toBe(true)],
    ['password = "abcdefg1" (exactly 8 characters)', 'Check a password at the minimum length', 'Returns true.', () => expect(isPasswordValid('abcdefg1')).toBe(true)],
    ['password = "tambaan"', 'Check a password with no number and under 8 characters', 'Returns false.', () => expect(isPasswordValid('tambaan')).toBe(false)],
    ['password = "TamBaanThai"', 'Check a long password with no number', 'Returns false.', () => expect(isPasswordValid('TamBaanThai')).toBe(false)],
    ['password = "12345678"', 'Check a password with no letter', 'Returns false.', () => expect(isPasswordValid('12345678')).toBe(false)],
    ['password = "Tb8"', 'Check a password that is too short', 'Returns false.', () => expect(isPasswordValid('Tb8')).toBe(false)],
  ]),
})

// CD-24 AuthErrors
utc('CD-24-F02', {
  prereq: '-',
  ...table([
    ['code = "auth/invalid-credential"', 'Route a wrong-credential error to a field', 'Returns { field: "password", message: "Invalid email or password." }', () => expect(fieldAuthError('auth/invalid-credential')).toEqual({ field: 'password', message: 'Invalid email or password.' })],
    ['code = "auth/email-already-in-use"', 'Route a duplicate-email error', 'Returns { field: "email", message: "An account with this email already exists." }', () => expect(fieldAuthError('auth/email-already-in-use')).toEqual({ field: 'email', message: 'An account with this email already exists.' })],
    ['code = "auth/invalid-email"', 'Route an invalid-email error', 'Returns { field: "email", message: "Invalid email." }', () => expect(fieldAuthError('auth/invalid-email')).toEqual({ field: 'email', message: 'Invalid email.' })],
    ['code = "auth/too-many-requests"', 'Route an error that is not about one field', 'Returns { field: "general", message: "Too many attempts. Wait a moment and try again." }', () => expect(fieldAuthError('auth/too-many-requests')).toEqual({ field: 'general', message: 'Too many attempts. Wait a moment and try again.' })],
  ]),
})

// CD-25 Phone
utc('CD-25-F01', {
  prereq: '-',
  ...table([
    ['raw = "081-234-5678"', 'Strip dashes from a typed phone number', 'Returns "0812345678".', () => expect(sanitizePhoneInput('081-234-5678')).toBe('0812345678')],
    ['raw = "08a1b2c3d4e5f6g7h8"', 'Strip letters typed into the field', 'Returns "0812345678".', () => expect(sanitizePhoneInput('08a1b2c3d4e5f6g7h8')).toBe('0812345678')],
    ['raw = "081234567899"', 'Cap a number longer than 10 digits', 'Returns "0812345678" (first 10 digits).', () => expect(sanitizePhoneInput('081234567899')).toBe('0812345678')],
    ['raw = "+-()"', 'Input made only of symbols', 'Returns "".', () => expect(sanitizePhoneInput('+-()')).toBe('')],
  ]),
})
utc('CD-25-F02', {
  prereq: '-',
  ...table([
    ['phone = "0812345678"', 'Check a valid Thai mobile number', 'Returns true.', () => expect(isValidPhone('0812345678')).toBe(true)],
    ['phone = "812345678"', 'Check a number missing the leading 0', 'Returns false.', () => expect(isValidPhone('812345678')).toBe(false)],
    ['phone = "1812345678"', 'Check a 10-digit number that does not start with 0', 'Returns false.', () => expect(isValidPhone('1812345678')).toBe(false)],
    ['phone = "081234567"', 'Check a 9-digit number', 'Returns false.', () => expect(isValidPhone('081234567')).toBe(false)],
  ]),
})

// CD-26 FileValidation
utc('CD-26-F01', {
  prereq: IMG,
  ...table([
    ['file = valid_photo.jpg (image/jpeg, 2 MB)', 'Validate a normal JPG', 'Returns null (accepted).', () => expect(validateImageFile(file('valid_photo.jpg', 'image/jpeg', 2 * MB))).toBeNull()],
    ['file = iphone_photo.heic (type reported as "", 3 MB)', 'Validate a HEIC whose type the browser leaves blank', 'Returns null (accepted on its extension).', () => expect(validateImageFile(file('iphone_photo.heic', '', 3 * MB))).toBeNull()],
    ['file = exactly_8mb.jpg (image/jpeg, 8 MB exactly)', 'Validate a photo at exactly the limit', 'Returns null (accepted).', () => expect(validateImageFile(file('exactly_8mb.jpg', 'image/jpeg', 8 * MB))).toBeNull()],
    ['file = large_photo.jpg (image/jpeg, 9 MB)', 'Validate a photo over 8 MB', 'Returns "That file is too large — max 8MB."', () => expect(validateImageFile(file('large_photo.jpg', 'image/jpeg', 9 * MB))).toBe('That file is too large — max 8MB.')],
    ['file = animation.gif (image/gif)', 'Validate a GIF', 'Returns "PNG, JPG, HEIC/HEIF only."', () => expect(validateImageFile(file('animation.gif', 'image/gif'))).toBe('PNG, JPG, HEIC/HEIF only.')],
    ['file = document.pdf (application/pdf)', 'Validate a PDF', 'Returns "PNG, JPG, HEIC/HEIF only."', () => expect(validateImageFile(file('document.pdf', 'application/pdf'))).toBe('PNG, JPG, HEIC/HEIF only.')],
  ]),
})

// CD-27 Heic
utc('CD-27-F02', {
  prereq: IMG,
  ...table([
    ['file = valid_photo.jpg (image/jpeg)', 'Prepare a JPG', 'Returns { file: the same File, error: null } (no conversion).', async () => { const f = file('valid_photo.jpg', 'image/jpeg'); const r = await prepareImageFile(f); expect(r.file === f && r.error === null).toBe(true); expect(heicState.calls).toBe(0) }],
    ['file = iphone_photo.heic (3 MB); converts to a 1 MB JPEG', 'Prepare a HEIC that converts normally', 'Returns { file: File "iphone_photo.jpg" (type "image/jpeg"), error: null }.', async () => { const r = await prepareImageFile(file('iphone_photo.heic', 'image/heic', 3 * MB)); expect([r.file.name, r.file.type, r.error]).toEqual(['iphone_photo.jpg', 'image/jpeg', null]) }],
    ['file = huge_photo.heic; converts to a 9 MB JPEG', 'Prepare a HEIC that is too large once converted', 'Returns { file: null, error: "That photo is too large once converted — max 8MB." }', async () => { heicState.size = 9 * MB; const r = await prepareImageFile(file('huge_photo.heic', 'image/heic', 7 * MB)); expect(r).toEqual({ file: null, error: 'That photo is too large once converted — max 8MB.' }) }],
    ['file = broken.heic; the converter cannot read it', 'Prepare a HEIC that cannot be decoded', 'Returns { file: null, error: "Couldn\'t read this HEIC photo. Try a JPG or PNG instead." }', async () => { heicState.mode = 'fail'; const r = await prepareImageFile(file('broken.heic', 'image/heic')); expect(r).toEqual({ file: null, error: "Couldn't read this HEIC photo. Try a JPG or PNG instead." }) }],
  ]),
})

// CD-28 Exif
const OCT27_1415 = new Date(2026, 9, 27, 14, 15, 0).getTime()
const bufOf = (name) => { const b = readFileSync(FX + name); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }
utc('CD-28-F01', {
  prereq: IMG,
  ...table([
    ['file = exif_photo.jpg (taken 27 Oct 2026 14:15 on Apple iPhone 13)', 'Read EXIF from a JPEG', 'Returns { timestamp: 27 Oct 2026 14:15:00 local, device: "Apple iPhone 13" }.', async () => expect(await readExif(fx('exif_photo.jpg', 'image/jpeg'))).toEqual({ timestamp: OCT27_1415, device: 'Apple iPhone 13' })],
    ['file = exif_photo.heic (same EXIF, type "")', 'Read EXIF from a HEIC', 'Returns { timestamp: 27 Oct 2026 14:15:00 local, device: "Apple iPhone 13" }.', async () => expect(await readExif(fx('exif_photo.heic', ''))).toEqual({ timestamp: OCT27_1415, device: 'Apple iPhone 13' })],
    ['file = no_exif.jpg (metadata stripped)', 'Read a JPEG without EXIF', 'Returns { timestamp: null, device: null }.', async () => expect(await readExif(fx('no_exif.jpg', 'image/jpeg'))).toEqual({ timestamp: null, device: null })],
    ['file = valid_photo.png', 'Read a PNG', 'Returns { timestamp: null, device: null } without reading the file.', async () => expect(await readExif(fx('valid_photo.png', 'image/png'))).toEqual({ timestamp: null, device: null })],
  ]),
})
utc('CD-28-F02', {
  prereq: '-',
  ...table([
    ['exif = { timestamp: 27 Oct 2026 14:15, device: "Apple iPhone 13" }', 'Format full camera info', 'Returns "Oct 27, 2:15 PM · Apple iPhone 13" (en-US browser locale).', () => expect(formatExif({ timestamp: OCT27_1415, device: 'Apple iPhone 13' })).toBe('Oct 27, 2:15 PM · Apple iPhone 13')],
    ['exif = { timestamp: null, device: "Apple iPhone 13" }', 'Format with only the device', 'Returns "Apple iPhone 13".', () => expect(formatExif({ timestamp: null, device: 'Apple iPhone 13' })).toBe('Apple iPhone 13')],
    ['exif = { timestamp: null, device: null }', 'Format with no camera info', 'Returns "No camera info found".', () => expect(formatExif({ timestamp: null, device: null })).toBe('No camera info found')],
  ]),
})

// CD-29 ImageResize

// CD-30 SearchParse
utc('CD-30-F01', {
  prereq: '-',
  ...table([
    ['raw = "painter chiang mai"', 'Parse a category plus a two-word province', 'Returns { categories: ["painter"], province: "Chiang Mai" }.', () => expect(sp.parseSearchQuery('painter chiang mai')).toEqual({ categories: ['painter'], province: 'Chiang Mai' })],
    ['raw = "plumbr lampun"', 'Parse with typos in both words', 'Returns { categories: ["plumber"], province: "Lamphun" }.', () => expect(sp.parseSearchQuery('plumbr lampun')).toEqual({ categories: ['plumber'], province: 'Lamphun' })],
    ['raw = "Nimman"', 'Parse a word that is neither', 'Returns { categories: [], province: null }.', () => expect(sp.parseSearchQuery('Nimman')).toEqual({ categories: [], province: null })],
    ['raw = "   "', 'Parse an empty query', 'Returns { categories: [], province: null }.', () => expect(sp.parseSearchQuery('   ')).toEqual({ categories: [], province: null })],
  ]),
})

// CD-31 Snapshot
const H = 60 * 60 * 1000
const sT = (id, createdAt) => ({ id, title: id, description: '', status: 'not_started', hasProgress: false, referenceImages: [], createdAt, updatedAt: createdAt })
const sU = (id, taskId, status, createdAt, updatedAt) => ({ id, taskId, taskTitle: taskId, images: [], description: '', status, sentBackReason: null, exifTimestamp: null, exifDevice: null, lastReminderAt: null, createdAt, updatedAt })
const TASKS3 = [sT('t1', T0 - 3 * DAY), sT('t2', T0 - 2 * DAY), sT('t3', T0 + DAY)]
const UPD = [sU('u1', 't1', 'verified', T0 - DAY, T0 - 12 * H), sU('u2', 't2', 'sent_back', T0 - DAY, T0 - 6 * H)]
const states = (r) => r.map((s) => [s.task.id, s.status, s.update?.id ?? null])
utc('CD-31-F01', {
  prereq: '-',
  data: [
    'tasks = t1 (created T-3d), t2 (T-2d), t3 (T+1d); updates = u1 on t1 (created T-1d, verified at T-12h), u2 on t2 (created T-1d, sent back at T-6h); timestamp = T (27 Oct 2026 09:00)',
    'Same lists; timestamp = T-18h (after the uploads, before either review)',
    'Same lists; timestamp = T-2.5d',
  ],
  cases: [
    { desc: 'Board after both reviews', td: [1], expected: 'Returns [t1 "done" (u1), t2 "sent_back" (u2)]; t3 is left out because it did not exist yet.', run: () => expect(states(snapshotAt(TASKS3, UPD, T0))).toEqual([['t1', 'done', 'u1'], ['t2', 'sent_back', 'u2']]) },
    { desc: 'Board between the uploads and the reviews', td: [2], expected: 'Returns [t1 "awaiting_review" (u1), t2 "awaiting_review" (u2)].', run: () => expect(states(snapshotAt(TASKS3, UPD, T0 - 18 * H))).toEqual([['t1', 'awaiting_review', 'u1'], ['t2', 'awaiting_review', 'u2']]) },
    { desc: 'Board before any upload', td: [3], expected: 'Returns [t1 "not_started" (no update)].', run: () => expect(states(snapshotAt(TASKS3, UPD, T0 - 2.5 * DAY))).toEqual([['t1', 'not_started', null]]) },
  ],
})

// CD-32 Gallery
const gp = (taskId, label, sortAt, n) => ({ thumb: `t-${n}`, full: `f-${n}`, taskId, sourceLabel: label, sortAt })
const PHOTOS = [gp(null, 'Project reference photos', 100, 1), gp('t1', 'Repaint living room walls', 300, 2), gp('t1', 'Repaint living room walls', 200, 3), gp('t2', 'Retile kitchen floor', 400, 4)]
utc('CD-32-F01', {
  prereq: '-',
  data: ['photos = 1 project reference photo (time 100), 2 photos on t1 (times 300 and 200), 1 photo on t2 (time 400); sort = "newest"', 'Same photos; sort = "oldest"'],
  cases: [
    { desc: 'Build albums, newest album first', td: [1], expected: 'Returns 3 albums in the order t2 "Retile kitchen floor" (latestAt 400), t1 "Repaint living room walls" (300), "project" "Project reference photos" (100); t1\'s photos are ordered oldest → newest (200, 300).', run: () => { const a = buildGalleryAlbums(PHOTOS, 'newest'); expect(a.map((x) => [x.key, x.label, x.latestAt])).toEqual([['t2', 'Retile kitchen floor', 400], ['t1', 'Repaint living room walls', 300], ['project', 'Project reference photos', 100]]); expect(a[1].photos.map((p) => p.sortAt)).toEqual([200, 300]) } },
    { desc: 'Build albums, oldest album first', td: [2], expected: 'Returns albums in the order "project", t1, t2.', run: () => expect(buildGalleryAlbums(PHOTOS, 'oldest').map((x) => x.key)).toEqual(['project', 't1', 't2']) },
  ],
})

// CD-33 ScheduleWarnings
const proj = (status, end, projectType = 'renovation') => ({ status, plannedEndDate: end, projectType })
const iso = (ms) => new Date(ms).toISOString().slice(0, 10)
const todo = (n, done = 0) => [...Array(n).fill({ status: 'not_started' }), ...Array(done).fill({ status: 'done' })]
utc('CD-33-F01', {
  prereq: '-',
  ...table([
    ['project = pending (no contractor yet), end date passed; tasks = 2 not started', 'Project that is not active', 'Returns null.', () => expect(getScheduleWarning(proj('pending', iso(T0 - 5 * DAY)), todo(2), T0)).toBeNull()],
    ['project = active renovation, end date 2 days ago; tasks = 1 not started, 2 done', 'Deadline passed with work left', 'Returns "delayed".', () => expect(getScheduleWarning(proj('active', iso(T0 - 2 * DAY)), todo(1, 2), T0)).toBe('delayed')],
    ['project = active renovation, end date 2 days ago; tasks = 3 done', 'Deadline passed but every task is done', 'Returns null.', () => expect(getScheduleWarning(proj('active', iso(T0 - 2 * DAY)), todo(0, 3), T0)).toBeNull()],
    ['project = active renovation (1.5 days per task), end date in 3 days; tasks = 3 not started (needs 4.5 days)', 'Not enough days left for the remaining tasks', 'Returns "at_risk".', () => expect(getScheduleWarning(proj('active', iso(T0 + 3 * DAY)), todo(3), T0)).toBe('at_risk')],
    ['project = active quick_fix (0.5 days per task), end date in 3 days; tasks = 3 not started (needs 1.5 days)', 'Enough days left', 'Returns null.', () => expect(getScheduleWarning(proj('active', iso(T0 + 3 * DAY), 'quick_fix'), todo(3), T0)).toBeNull()],
  ]),
})

// CD-34 LastSeen
const ago = (ms) => Date.now() - ms
utc('CD-34-F01', {
  prereq: '-',
  ...table([
    ['timestamp = 2 hours ago', 'Last seen today', 'Returns "Active today".', () => expect(formatLastSeen(ago(2 * H))).toBe('Active today')],
    ['timestamp = 1.5 days ago', 'Last seen yesterday', 'Returns "Active yesterday".', () => expect(formatLastSeen(ago(1.5 * DAY))).toBe('Active yesterday')],
    ['timestamp = 4 days ago', 'Last seen this week', 'Returns "Active this week".', () => expect(formatLastSeen(ago(4 * DAY))).toBe('Active this week')],
    ['timestamp = 12 days ago', 'Last seen within a month', 'Returns "Active 12 days ago".', () => expect(formatLastSeen(ago(12 * DAY + H))).toBe('Active 12 days ago')],
    ['timestamp = 45 days ago', 'Last seen over a month ago', 'Returns "Active over a month ago".', () => expect(formatLastSeen(ago(45 * DAY))).toBe('Active over a month ago')],
    ['timestamp = undefined', 'No activity recorded', 'Returns "".', () => expect(formatLastSeen(undefined)).toBe('')],
  ]),
})
