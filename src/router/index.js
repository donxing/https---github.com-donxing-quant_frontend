import { createRouter, createWebHistory } from 'vue-router'
import Login from '../components/Login.vue'
import { isAuthenticated } from '../services/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../components/Register.vue')
  },
  {
    path: '/stocks',
    name: 'Stocks',
    component: () => import('../views/Stocks.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/backtest',
    name: 'Backtest',
    component: () => import('../views/Backtest.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && isAuthenticated()) {
    next({ name: 'Stocks' })
  } else {
    next()
  }
})

export default router