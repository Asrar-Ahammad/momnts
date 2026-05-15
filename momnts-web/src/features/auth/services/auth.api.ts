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
  user: User
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Login failed")
    }

    return response.json()
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Registration failed")
    }

    return response.json()
  },

  async logout(): Promise<void> {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Logout failed")
    }
  },

  async getMe(): Promise<User> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Not authenticated")
    }

    const data = await response.json()
    return data.user
  },
}
