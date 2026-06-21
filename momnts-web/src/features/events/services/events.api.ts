import { authHeaders, jsonAuthHeaders } from "../../../lib/authHeaders"
import { apiFetch } from "../../../lib/apiFetch"

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export interface EventData {
  id: string
  user_id: string
  name: string
  location: string
  date: string
  invite_code: string
  is_active: boolean
  attendee_upload_limit: number
  created_at: string
  _count: {
    photos: number
    event_access: number
  }
  is_secure: boolean
  allow_downloads: boolean
  pending_request_count?: number
  user_role: string
  // E2EE fields
  encryption_mode?: 'AI' | 'E2EE'
  kdf_salt?: string
  kdf_params?: Record<string, unknown>
  wrapped_dek?: string
  wrapped_dek_iv?: string
  wrapped_dek_tag?: string
  recovery_kdf_salt?: string
  wrapped_recovery_dek?: string
  wrapped_recovery_iv?: string
  wrapped_recovery_tag?: string
  event_access?: {
    user: {
      id: string
      name: string
      selfie_url: string | null
    }
    role: string
  }[]
  photos?: {
    thumb_url: string
    display_url: string
  }[]
}

export interface EventsResponse {
  events: EventData[]
}

export const eventsApi = {
  async getMyEvents(): Promise<EventData[]> {
    const response = await apiFetch(`${API_URL}/api/events/my-events`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch events")
    }

    const data = await response.json()
    return data.events
  },

  async getJoinedEvents(): Promise<EventData[]> {
    const response = await apiFetch(`${API_URL}/api/events/joined`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch joined events")
    }

    const data = await response.json()
    // joined events returns { data: [{ event: {...}, role: "ATTENDEE" }, ...] }
    const joinedEvents = data.data || []
    return joinedEvents.map((item: { event: EventData; role: string }) => ({
      ...item.event,
      user_role: item.role
    }))
  },

  async createEvent(
    name: string,
    location: string,
    date: string,
    attendeeUploadLimit: number,
    isSecure?: boolean,
    e2eePayload?: {
      encryptionMode: 'E2EE'
      kdfSalt: string
      kdfParams: Record<string, unknown>
      wrappedDek: string
      wrappedDekIv: string
      wrappedDekTag: string
      recoveryKdfSalt: string
      wrappedRecoveryDek: string
      wrappedRecoveryIv: string
      wrappedRecoveryTag: string
    }
  ): Promise<EventData> {
    const response = await apiFetch(`${API_URL}/api/events/create`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        name, location, date, attendeeUploadLimit, isSecure,
        ...(e2eePayload || {}),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create event")
    }

    const data = await response.json()
    return { ...data.event, user_role: data.eventAccess?.role || 'ORGANIZER' }
  },

  async joinEvent(inviteCode: string): Promise<EventData | { status: "PENDING"; message: string }> {
    const response = await apiFetch(`${API_URL}/api/events/join`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ inviteCode }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to join event")
    }

    const data = await response.json()
    if (response.status === 202) {
      return { status: "PENDING", message: data.message }
    }
    return { ...data.data.event, user_role: data.data.role }
  },

  async getEventDetails(eventId: string): Promise<EventData> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch event details")
    }

    const data = await response.json()
    return data.event
  },

  async updateEvent(eventId: string, name: string, date: string, location: string, isActive: boolean, isSecure?: boolean, allowDownloads?: boolean, regenerateInviteCode?: boolean): Promise<EventData> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}`, {
      method: "PUT",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ name, date, location, isActive, isSecure, allowDownloads, regenerateInviteCode }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update event")
    }

    const data = await response.json()
    return data.event
  },

  async updateEventPassphrase(
    eventId: string,
    wrappedDek: string,
    wrappedDekIv: string,
    wrappedDekTag: string,
    kdfSalt: string
  ): Promise<EventData> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}`, {
      method: "PUT",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ wrappedDek, wrappedDekIv, wrappedDekTag, kdfSalt }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update event passphrase")
    }

    const data = await response.json()
    return data.event
  },

  async getEventAttendees(eventId: string, search?: string): Promise<any[]> {
    const url = new URL(`${API_URL}/api/events/${eventId}/attendees`)
    if (search) {
      url.searchParams.append('search', search)
    }
    const response = await apiFetch(url.toString(), {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch attendees")
    }

    const data = await response.json()
    return data.data
  },

  async updateAttendeeLimit(eventId: string, userId: string, limit: number | null): Promise<void> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}/attendees/${userId}/limit`, {
      method: "PUT",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ limit }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update attendee limit")
    }
  },

  async deleteEvent(eventId: string): Promise<void> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}`, {
      method: "DELETE",
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to delete event")
    }
  },

  async leaveEvent(eventId: string): Promise<void> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}/leave`, {
      method: "POST",
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to leave event")
    }
  },

  async removeAttendee(eventId: string, attendeeId: string): Promise<void> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}/attendees/${attendeeId}`, {
      method: "DELETE",
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to remove attendee")
    }
  },

  async getJoinRequests(eventId: string, status?: string): Promise<any[]> {
    const url = new URL(`${API_URL}/api/events/${eventId}/requests`)
    if (status) {
      url.searchParams.append('status', status)
    }
    const response = await apiFetch(url.toString(), {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch join requests")
    }

    const data = await response.json()
    return data.data
  },

  async handleJoinRequest(eventId: string, requestId: string, action: "approve" | "reject", reason?: string): Promise<void> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}/requests/${requestId}`, {
      method: "PUT",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ action, reason }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to handle join request")
    }
  },

  async getPendingRequestCount(eventId: string): Promise<number> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}/requests/count`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch pending requests count")
    }

    const data = await response.json()
    return data.count
  },
}
