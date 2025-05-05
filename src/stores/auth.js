import { defineStore } from 'pinia'
import { login, logout, isAuthenticated } from '../services/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: isAuthenticated()
  }),
  actions: {
    async login(credentials) {
      await login(credentials)
      this.isAuthenticated = true
    },
    logout() {
      logout()
      this.isAuthenticated = false
    }
  }
})