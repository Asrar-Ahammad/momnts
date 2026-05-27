import { authHeaders } from "../../../lib/authHeaders"

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export interface User {
  id: string
  username: string
  email: string
  email_verified: boolean
  selfie_url?: string
  created_at?: string
}

export interface AuthResponse {
  message: string
  accessToken: string
  refreshToken: string
  user: User
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Login failed")
    }

    const data = await response.json()
    localStorage.setItem('token', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    return data
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Registration failed")
    }

    const data = await response.json()
    localStorage.setItem('token', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    return data
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          ...authHeaders('application/json'),
        },
        body: JSON.stringify({ refreshToken }),
      })
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await caches.keys()
          await Promise.all(
            keys
              .filter(key => key.startsWith('momnts-') && !key.includes('fonts'))
              .map(key => caches.delete(key))
          )
        } catch (error) {
          console.error('Failed to clear caches on logout:', error)
        }
      }
    }
  },

  async getMe(): Promise<User> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      throw new Error("Not authenticated")
    }

    const data = await response.json()
    return data.user
  },

  async sendOtp(): Promise<{ message: string; retryAfter?: number }> {
    const response = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: authHeaders('application/json'),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.message || "Failed to send verification code") as Error & { retryAfter?: number }
      if (data.retryAfter) error.retryAfter = data.retryAfter
      throw error
    }

    return data
  },

  async verifyOtp(otp: string): Promise<{ message: string; user: User }> {
    const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: authHeaders('application/json'),
      body: JSON.stringify({ otp }),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.message || "Verification failed") as Error & { retryAfter?: number }
      if (data.retryAfter) error.retryAfter = data.retryAfter
      throw error
    }

    return data
  },
}
