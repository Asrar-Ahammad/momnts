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
  user_role: string
}

export interface EventsResponse {
  events: EventData[]
}

export const eventsApi = {
  async getMyEvents(): Promise<EventData[]> {
    const response = await fetch(`${API_URL}/api/events/my-events`, {
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch events")
    }

    const data = await response.json()
    return data.events
  },

  async getJoinedEvents(): Promise<EventData[]> {
    const response = await fetch(`${API_URL}/api/events/joined`, {
      credentials: "include",
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

  async createEvent(name: string, location: string, date: string, attendeeUploadLimit: number): Promise<EventData> {
    const response = await fetch(`${API_URL}/api/events/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location, date, attendeeUploadLimit }),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create event")
    }

    const data = await response.json()
    return { ...data.event, user_role: data.eventAccess?.role || 'ORGANIZER' }
  },

  async joinEvent(inviteCode: string): Promise<EventData> {
    const response = await fetch(`${API_URL}/api/events/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to join event")
    }

    const data = await response.json()
    return { ...data.data.event, user_role: data.data.role }
  },

  async getEventDetails(eventId: string): Promise<EventData> {
    const response = await fetch(`${API_URL}/api/events/${eventId}`, {
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch event details")
    }

    const data = await response.json()
    return data.event
  },

  async updateEvent(eventId: string, name: string, date: string, location: string, isActive: boolean): Promise<EventData> {
    const response = await fetch(`${API_URL}/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, location, isActive }),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update event")
    }

    const data = await response.json()
    return data.event
  },

  async getEventAttendees(eventId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/api/events/${eventId}/attendees`, {
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch attendees")
    }

    const data = await response.json()
    return data.data
  },

  async deleteEvent(eventId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/events/${eventId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to delete event")
    }
  },

  async leaveEvent(eventId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/events/${eventId}/leave`, {
      method: "POST",
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to leave event")
    }
  },
}
