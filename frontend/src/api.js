import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export const AUTH_TOKEN_STORAGE_KEY = 'todo-app-auth-token'

const api = axios.create({
  baseURL: API_BASE_URL,
})

function setAuthHeader(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    return
  }

  delete api.defaults.headers.common.Authorization
}

export function restoreStoredToken() {
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)

  setAuthHeader(token)

  return token
}

export function persistToken(token) {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  setAuthHeader(token)
}

export function clearPersistedToken() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  setAuthHeader(null)
}

export function isUnauthorizedError(error) {
  return error?.response?.status === 401
}

export function getErrorMessage(error, fallbackMessage = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || fallbackMessage
}

export const authApi = {
  signup(payload) {
    return api.post('/api/auth/signup', payload)
  },
  login(payload) {
    return api.post('/api/auth/login', payload)
  },
  fetchMe() {
    return api.get('/api/auth/me')
  },
  updateMe(payload) {
    return api.put('/api/auth/me', payload)
  },
  updatePassword(payload) {
    return api.put('/api/auth/me/password', payload)
  },
}

export const todoApi = {
  list(params = {}) {
    // Accepts an optional params object with: view, start, end, includeCompleted
    // start/end may be Date objects or ISO strings — convert Dates to ISO
    const query = {}

    if (typeof params.view !== 'undefined') {
      query.view = params.view
    }

    if (typeof params.start !== 'undefined') {
      query.start = params.start instanceof Date ? params.start.toISOString() : params.start
    }

    if (typeof params.end !== 'undefined') {
      query.end = params.end instanceof Date ? params.end.toISOString() : params.end
    }

    if (typeof params.includeCompleted !== 'undefined') {
      query.includeCompleted = params.includeCompleted
    }

    return api.get('/api/todos', { params: query })
  },
  create(payload) {
    return api.post('/api/todos', payload)
  },
  update(id, payload) {
    return api.put(`/api/todos/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/api/todos/${id}`)
  },
}
