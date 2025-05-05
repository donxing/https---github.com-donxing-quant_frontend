import api from './api'

export async function login(credentials) {
  try {
    const response = await api.post('/login', credentials)
    const { access_token } = response.data
    localStorage.setItem('token', access_token)
    return access_token
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Login failed')
  }
}

export function logout() {
  localStorage.removeItem('token')
}

export function getToken() {
  return localStorage.getItem('token')
}

export function isAuthenticated() {
  return !!getToken()
}