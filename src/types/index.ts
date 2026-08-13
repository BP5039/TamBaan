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
  createdAt: number
  updatedAt: number
}

// Fields collected on the profile creation / edit form.
export type ProfileFormData = Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'photoURL'>

export interface PortfolioImage {
  thumb: string
  full: string
}

export interface PortfolioItem {
  id: string
  images: PortfolioImage[]
  description: string
  year: number
  location: string
  source: 'manual'
  createdAt: number
}
