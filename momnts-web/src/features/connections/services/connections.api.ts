export interface ConnectionPerson {
  face_profile_id: string
  shared_photo_count: number
  is_claimed: boolean
  person: {
    user_id: string | null
    name: string
    selfie_url: string | null
    is_you: boolean
  }
}

export interface SharedPhoto {
  id: string
  thumb_url: string
  display_url: string
  original_url: string
  uploaded_at: string
  uploader_name: string
  width: number | null
  height: number | null
  is_favourited: boolean
}

export interface ConnectionsResponse {
  total_people: number
  data: ConnectionPerson[]
  your_face_profile_ids: string[]
  message?: string
  prompt?: string
}

export interface SharedPhotosResponse {
  shared_with: {
    face_profile_id: string
    name: string
    is_claimed: boolean
    user_id: string | null
    selfie_url: string | null
  }
  total_shared: number
  photos: SharedPhoto[]
}

export interface SummaryResponse {
  total_people: number
  total_shared_photos: number
}

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export async function fetchConnections(
  eventId: string
): Promise<ConnectionsResponse> {
  const res = await fetch(
    `${API_URL}/api/events/${eventId}/connections`,
    { credentials: "include" }
  )
  if (!res.ok) throw new Error("Failed to fetch connections")
  return res.json()
}

export async function fetchSharedPhotos(
  eventId: string,
  faceProfileId: string
): Promise<SharedPhotosResponse> {
  const res = await fetch(
    `${API_URL}/api/events/${eventId}/connections/${faceProfileId}/photos`,
    { credentials: "include" }
  )
  if (!res.ok) throw new Error("Failed to fetch shared photos")
  return res.json()
}

export async function fetchConnectionsSummary(
  eventId: string
): Promise<SummaryResponse> {
  const res = await fetch(
    `${API_URL}/api/events/${eventId}/connections/summary`,
    { credentials: "include" }
  )
  if (!res.ok) throw new Error("Failed to fetch summary")
  return res.json()
}
