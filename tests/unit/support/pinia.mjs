import { createPinia, setActivePinia } from 'pinia'

export let pinia
export function freshPinia() {
  pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}
