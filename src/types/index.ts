export type UserRole = 'homeowner' | 'professional'

export type WorkCategoryValue =
  | 'contractor'
  | 'electrician'
  | 'plumber'
  | 'roofer'
  | 'tiler'
  | 'painter'
  | 'carpenter'
  | 'mason'
  | 'ac_technician'
  | 'welder'
  | 'landscaper'
  | 'interior_designer'

export interface PortfolioPreviewItem {
  id: string
  title: string
  thumbUrl: string
  description: string
  location: string
}

export interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  phone: string
  username: string
  lineId: string
  facebookId: string
  province: string
  role: UserRole
  workCategories: WorkCategoryValue[]
  photoURL: string | null
  rating?: number | null
  ratingCount?: number
  portfolioPreview?: PortfolioPreviewItem[]
  portfolioCount?: number
  lastActiveAt?: number
  createdAt: number
  updatedAt: number
}

export type ProfileFormData = Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'photoURL'>

export interface PortfolioImage {
  thumb: string
  full: string
}

export interface PortfolioItem {
  id: string
  title: string
  images: PortfolioImage[]
  description: string
  year: number
  location: string
  source: 'manual' | 'collaboration'
  projectId: string | null
  createdAt: number
}