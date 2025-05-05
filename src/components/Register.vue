<template>
    <div class="register-container">
      <h2>Register</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">Username:</label>
          <input
            type="text"
            id="username"
            v-model="username"
            required
            placeholder="Enter username"
          />
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input
            type="password"
            id="password"
            v-model="password"
            required
            placeholder="Enter password"
          />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
      <p>
        Already have an account? <router-link to="/login">Login</router-link>
      </p>
    </div>
  </template>
  
  <script>
  import api from '../services/api'
  
  export default {
    name: 'Register',
    data() {
      return {
        username: '',
        password: '',
        loading: false,
        error: ''
      }
    },
    methods: {
      async handleRegister() {
        this.loading = true
        this.error = ''
        try {
          await api.post('/register', {
            username: this.username,
            password: this.password
          })
          this.$router.push('/login') // Redirect to login after registration
        } catch (err) {
          this.error = err.response?.data?.detail || 'Registration failed'
        } finally {
          this.loading = false
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .register-container {
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
  }
  
  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  button {
    width: 100%;
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  
  .error {
    color: red;
    margin-top: 10px;
  }
  
  a {
    color: #007bff;
    text-decoration: none;
  }
  
  a:hover {
    text-decoration: underline;
  }
  </style>