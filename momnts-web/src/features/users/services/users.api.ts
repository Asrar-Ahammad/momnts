const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export const usersApi = {
  async updateSelfie(file: File): Promise<{ message: string; selfie_url: string }> {
    const formData = new FormData()
    formData.append('selfie', file)

    const response = await fetch(`${API_URL}/api/users/selfie`, {
      method: "PUT",
      body: formData,
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update selfie")
    }

    return response.json()
  },

  async updateProfile(name: string): Promise<{ message: string; name: string }> {
    const response = await fetch(`${API_URL}/api/users/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update profile")
    }

    return response.json()
  }
}
