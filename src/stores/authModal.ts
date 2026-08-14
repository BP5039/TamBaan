import { defineStore } from 'pinia'

type AuthModalMode = 'login' | 'register'

interface AuthModalState {
  isOpen: boolean
  mode: AuthModalMode
}

export const useAuthModalStore = defineStore('authModal', {
  state: (): AuthModalState => ({
    isOpen: false,
    mode: 'login',
  }),
  actions: {
    openLogin() {
      this.mode = 'login'
      this.isOpen = true
    },
    openRegister() {
      this.mode = 'register'
      this.isOpen = true
    },
    switchTo(mode: AuthModalMode) {
      this.mode = mode
    },
    close() {
      this.isOpen = false
    },
  },
})