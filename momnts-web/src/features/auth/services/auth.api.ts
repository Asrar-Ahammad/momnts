import { authHeaders } from "../../../lib/authHeaders"
import { apiFetch, clearLocalSessionData } from "../../../lib/apiFetch"

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
  async login(email: string, password: string, captchaToken?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, captchaToken }),
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

  async register(name: string, email: string, password: string, captchaToken?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, captchaToken }),
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

  async checkEmail(email: string): Promise<{ exists: boolean }> {
    const response = await fetch(`${API_URL}/api/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to check email")
    }

    return await response.json()
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      await apiFetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          ...authHeaders('application/json'),
        },
        body: JSON.stringify({ refreshToken }),
      })
    } finally {
      await clearLocalSessionData()
    }
  },

  async getMe(): Promise<User> {
    const response = await apiFetch(`${API_URL}/api/auth/me?_t=${Date.now()}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error("Not authenticated")
    }

    const data = await response.json()
    return data.user
  },

  async sendOtp(): Promise<{ message: string; retryAfter?: number }> {
    const response = await apiFetch(`${API_URL}/api/auth/send-otp`, {
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
    const response = await apiFetch(`${API_URL}/api/auth/verify-otp`, {
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.message || "Failed to send reset link") as Error & { retryAfter?: number }
      if (data.retryAfter) error.retryAfter = data.retryAfter
      throw error
    }

    return data
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Failed to reset password")
    }

    return data
  },

  async sendChangePasswordOtp(): Promise<{ message: string }> {
    const response = await apiFetch(`${API_URL}/api/auth/send-change-password-otp`, {
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

  async changePassword(otp: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiFetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      headers: authHeaders('application/json'),
      body: JSON.stringify({ otp, newPassword }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Failed to change password")
    }

    return data
  },

  async getSessions(): Promise<any[]> {
    const refreshToken = localStorage.getItem('refreshToken');
    const headers = { ...authHeaders('application/json') };
    if (refreshToken) headers['x-refresh-token'] = refreshToken;

    const response = await apiFetch(`${API_URL}/api/auth/sessions?_t=${Date.now()}`, {
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error("Failed to fetch sessions");
    }

    const data = await response.json();
    return data.sessions;
  },

  async revokeSession(sessionId: string): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    const headers = { ...authHeaders('application/json') };
    if (refreshToken) headers['x-refresh-token'] = refreshToken;

    const response = await apiFetch(`${API_URL}/api/auth/sessions/${sessionId}`, {
      method: "DELETE",
      headers
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to revoke session");
    }
  },
}
