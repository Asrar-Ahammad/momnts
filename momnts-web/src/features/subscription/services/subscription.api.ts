import { authHeaders } from "../../../lib/authHeaders"
import { apiFetch } from "../../../lib/apiFetch"

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export type PlanType = "FREE" | "PRO"

export interface PlanLimits {
  maxEvents: number | null
  maxAttendeesPerEvent: number
  maxOrganizerUploadsPerEvent: number
  maxAttendeeUploadsPerEvent: number
  maxSecureEvents: number | null
  canRegenerateInviteCode: boolean
}

export interface SubscriptionData {
  plan: PlanType
  limits: PlanLimits
  subscription: {
    id: string
    plan: PlanType
    started_at: string
    expires_at: string | null
    is_active: boolean
  } | null
}

export interface UsageData {
  plan: PlanType
  usage: {
    eventsCreated: number
    maxEvents: number | null
    secureEventsCreated: number
    maxSecureEvents: number | null
    maxAttendeesPerEvent: number
    maxOrganizerUploadsPerEvent: number
    maxAttendeeUploadsPerEvent: number
    canRegenerateInviteCode: boolean
  }
}

export const subscriptionApi = {
  async getSubscription(): Promise<SubscriptionData> {
    const response = await apiFetch(`${API_URL}/api/subscription`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch subscription")
    }

    return response.json()
  },

  async getUsage(): Promise<UsageData> {
    const response = await apiFetch(`${API_URL}/api/subscription/usage`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch usage")
    }

    return response.json()
  },
}
