import { defineStore } from 'pinia'

export const useOnboardingModalStore = defineStore('onboardingModal', {
  state: () => ({ isOpen: false }),
  actions: {
    open() {
      this.isOpen = true
    },
    complete() {
      this.isOpen = false
    },
  },
})