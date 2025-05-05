<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/stocks" v-if="isAuthenticated">Stocks</router-link> |
      <router-link to="/backtest" v-if="isAuthenticated">Backtest</router-link> |
      <router-link to="/login" v-if="!isAuthenticated">Login</router-link> |
      <router-link to="/register" v-if="!isAuthenticated">Register</router-link> |
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
      return useAuthStore().isAuthenticated
    }
  },
  methods: {
    logout() {
      const authStore = useAuthStore()
      authStore.logout()
      this.$router.push('/login')
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  margin: 0 10px;
}

nav a.router-link-exact-active {
  color: #007bff;
}

button {
  background: none;
  border: none;
  color: #007bff;
  font-weight: bold;
  cursor: pointer;
}

button:hover {
  text-decoration: underline;
}
</style>