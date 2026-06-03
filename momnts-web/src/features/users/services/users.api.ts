import { authHeaders, jsonAuthHeaders } from "../../../lib/authHeaders"
import { apiFetch } from "../../../lib/apiFetch"

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export const usersApi = {
  async updateSelfie(file: File): Promise<{ message: string; selfie_url: string }> {
    const formData = new FormData()
    formData.append('selfie', file)

    const response = await apiFetch(`${API_URL}/api/users/selfie`, {
      method: "PUT",
      body: formData,
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update selfie")
    }

    return response.json()
  },

  async deleteSelfie(): Promise<{ message: string }> {
    const response = await apiFetch(`${API_URL}/api/users/selfie`, {
      method: "DELETE",
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to delete selfie")
    }

    return response.json()
  },

  async updateProfile(name: string): Promise<{ message: string; name: string }> {
    const response = await apiFetch(`${API_URL}/api/users/profile`, {
      method: "PUT",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update profile")
    }

    return response.json()
  }
}
