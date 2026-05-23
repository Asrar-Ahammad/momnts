import { authHeaders } from "../../../lib/authHeaders"

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export interface NotificationData {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  link?: string
  image_url?: string | null
  is_read: boolean
  created_at: string
}

async function handleError(response: Response, fallback: string) {
  let message: string;
  try {
    const error = await response.json();
    message = error.message || JSON.stringify(error);
  } catch {
    try {
      message = await response.text() || fallback;
    } catch {
      message = fallback;
    }
  }
  throw new Error(message);
}

export const notificationsApi = {
  async getNotifications(): Promise<NotificationData[]> {
    const response = await fetch(`${API_URL}/api/notifications`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      await handleError(response, "Failed to fetch notifications");
    }

    const data = await response.json()
    return data.notifications
  },

  async markAsRead(notificationId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: authHeaders(),
    })

    if (!response.ok) {
      await handleError(response, "Failed to mark as read");
    }
  },

  async clearNotifications(): Promise<void> {
    const response = await fetch(`${API_URL}/api/notifications/all`, {
      method: "DELETE",
      headers: authHeaders(),
    })

    if (!response.ok) {
      await handleError(response, "Failed to clear notifications");
    }
  },
}
