<template>
  <div id="app">
    <nav class="navbar">
      <router-link to="/">Home</router-link>
      <router-link to="/stocks" v-if="isAuthenticated">Stocks</router-link>
      <router-link to="/backtest" v-if="isAuthenticated">Backtest</router-link>
      <router-link to="/backtest2000" v-if="isAuthenticated">CSI2000 Backtest</router-link>
      <router-link to="/login" v-if="!isAuthenticated">Login</router-link>
      <router-link to="/register" v-if="!isAuthenticated">Register</router-link>
      <button v-if="isAuthenticated" @click="logout">Logout</button>
    </nav>
    <router-view />
  </div>
</template>

<script>
import { useAuthStore } from './stores/auth'

export default {
  name: 'App',
  computed: {
    isAuthenticated() {
      const authStore = useAuthStore()
      return authStore.isAuthenticated
    }
  },
  methods: {
    async logout() {
      const authStore = useAuthStore()
      try {
        await authStore.logout()
        this.$router.push('/login')
      } catch (err) {
        console.error('Logout failed:', err)
      }
    }
  }
}
</script>

<style scoped>
.navbar {
  background-color: #f8f9fa;
  padding: 10px;
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
}

.navbar a {
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
}

.navbar a:hover {
  text-decoration: underline;
}

.navbar button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.navbar button:hover {
  background-color: #c82333;
}
</style>