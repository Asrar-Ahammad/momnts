import { authHeaders } from "../../../lib/authHeaders"

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export interface User {
  id: string
  username: string
  email: string
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
}
