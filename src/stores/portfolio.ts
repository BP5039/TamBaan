import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/firebase/config'
import { createThumbnail } from '@/utils/imageResize'
import type { PortfolioImage, PortfolioItem } from '@/types'

interface PortfolioState {
  items: PortfolioItem[]
  loading: boolean
}

function normalizeImages(data: Record<string, unknown>): PortfolioImage[] {
  if (Array.isArray(data.images)) {
    return (data.images as unknown[]).map((img) =>
      typeof img === 'string' ? { thumb: img, full: img } : (img as PortfolioImage),
    )
  }
  if (typeof data.imageURL === 'string') {
    return [{ thumb: data.imageURL, full: data.imageURL }]
  }
  return []
}

function normalizeTitle(data: Record<string, unknown>): string {
  if (typeof data.title === 'string' && data.title.trim()) return data.title
  if (typeof data.description === 'string' && data.description.trim()) {
    return data.description.slice(0, 40)
  }
  return 'Untitled work'
}

async function uploadOneImage(uid: string, file: File, index: number): Promise<PortfolioImage> {
  const stamp = `${Date.now()}-${index}`
  const fullRef = ref(storage, `portfolio/${uid}/${stamp}-full-${file.name}`)

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

  const thumbRef = ref(storage, `portfolio/${uid}/${stamp}-thumb-${file.name}.jpg`)
  await Promise.all([uploadBytes(fullRef, file), uploadBytes(thumbRef, thumbBlob)])
  const [full, thumb] = await Promise.all([
    getDownloadURL(fullRef),
    getDownloadURL(thumbRef),
  ])
  return { full, thumb }
}

async function syncSearchText(uid: string, items: PortfolioItem[]) {
  const text = items
    .map((i) => `${i.title} ${i.description} ${i.location}`)
    .join(' ')
    .toLowerCase()
  try {
    await updateDoc(doc(db, 'users', uid), { portfolioSearchText: text })
  } catch (err) {
    console.error('Failed to sync portfolio search text:', err)
  }
}

export const usePortfolioStore = defineStore('portfolio', {
  state: (): PortfolioState => ({
    items: [],
    loading: false,
  }),

  getters: {
    groupedByYear(state): { year: number; items: PortfolioItem[] }[] {
      const map = new Map<number, PortfolioItem[]>()
      for (const item of state.items) {
        if (!map.has(item.year)) map.set(item.year, [])
        map.get(item.year)!.push(item)
      }
      return Array.from(map.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([year, items]) => ({ year, items }))
    },
  },

  actions: {
    async fetchItems(uid: string) {
      this.loading = true
      try {
        const q = query(
          collection(db, 'users', uid, 'portfolio'),
          orderBy('createdAt', 'desc'),
        )
        const snap = await getDocs(q)
        this.items = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>
          return {
            id: d.id,
            title: normalizeTitle(data),
            images: normalizeImages(data),
            description: typeof data.description === 'string' ? data.description : '',
            year:
              typeof data.year === 'number'
                ? data.year
                : new Date((data.createdAt as number) ?? Date.now()).getFullYear(),
            location: typeof data.location === 'string' ? data.location : 'Unknown',
            source: 'manual' as const,
            createdAt: (data.createdAt as number) ?? Date.now(),
          } satisfies PortfolioItem
        })
      } finally {
        this.loading = false
      }
    },

    async addItem(
      uid: string,
      files: File[],
      title: string,
      description: string,
      year: number,
      location: string,
    ) {
      const images = await Promise.all(files.map((f, i) => uploadOneImage(uid, f, i)))

      const payload = {
        title,
        images,
        description,
        year,
        location,
        source: 'manual' as const,
        createdAt: Date.now(),
      }

      const docRef = await addDoc(collection(db, 'users', uid, 'portfolio'), payload)
      this.items.unshift({ id: docRef.id, ...payload })
      await syncSearchText(uid, this.items)
    },

    async removeItem(uid: string, item: PortfolioItem) {
      await deleteDoc(doc(db, 'users', uid, 'portfolio', item.id))
      const urls = new Set<string>()
      item.images.forEach((img) => {
        urls.add(img.thumb)
        urls.add(img.full)
      })
      for (const url of urls) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await deleteObject(ref(storage, url))
        } catch {
          // best-effort — file may already be gone
        }
      }
      this.items = this.items.filter((i) => i.id !== item.id)
      await syncSearchText(uid, this.items)
    },
  },
})