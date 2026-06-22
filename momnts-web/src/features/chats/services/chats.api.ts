import { apiFetch } from "../../../lib/apiFetch";

export interface ChatMessageUser {
  id: string;
  name: string;
  selfie_url?: string | null;
}

export interface ChatMessagePhoto {
  id: string;
  thumb_url: string;
  display_url: string;
  encryption_iv?: string | null;
  encryption_tag?: string | null;
}

export interface ChatMessageParent {
  id: string;
  user_id: string;
  message_text: string;
  encryption_iv: string;
  encryption_tag: string;
  user: {
    id: string;
    name: string;
  };
}

export interface MessageReaction {
  id: string;
  chat_message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user: {
    id: string;
    name: string;
  };
}

export interface ChatMessageData {
  id: string;
  event_id: string;
  user_id: string;
  parent_id?: string | null;
  message_text: string;     // ciphertext (base64)
  encryption_iv: string;    // iv (base64)
  encryption_tag: string;   // tag (base64)
  created_at: string;
  updated_at: string;
  user: ChatMessageUser;
  photos?: ChatMessagePhoto[] | null;
  parent?: ChatMessageParent | null;
  reactions?: MessageReaction[];
  status?: "sending" | "delivered" | "seen";
}

export interface ChatMessagesResponse {
  total: number;
  data: ChatMessageData[];
  nextCursor?: string | null;
}

export interface SendChatMessagePayload {
  message_text: string;
  encryption_iv: string;
  encryption_tag: string;
  photo_ids?: string[];
  mentions?: string[];
  parent_id?: string;
}

const BASE = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const chatsApi = {
  async getChatMessages(eventId: string, cursor?: string | null): Promise<ChatMessagesResponse> {
    const url = cursor ? `${BASE}/api/events/${eventId}/chats?cursor=${cursor}` : `${BASE}/api/events/${eventId}/chats`;
    const res = await apiFetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch chat messages");
    }
    return res.json();
  },

  async sendChatMessage(eventId: string, payload: SendChatMessagePayload): Promise<ChatMessageData> {
    const res = await apiFetch(`${BASE}/api/events/${eventId}/chats`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to send chat message");
    }
    const json = await res.json();
    return json.data;
  },

  async updateChatMessage(eventId: string, messageId: string, payload: SendChatMessagePayload): Promise<ChatMessageData> {
    const res = await apiFetch(`${BASE}/api/events/${eventId}/chats/${messageId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update chat message");
    }
    const json = await res.json();
    return json.data;
  },

  async deleteChatMessage(eventId: string, messageId: string): Promise<void> {
    const res = await apiFetch(`${BASE}/api/events/${eventId}/chats/${messageId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete chat message");
    }
  },

  async toggleChatMessageReaction(eventId: string, messageId: string, emoji: string): Promise<{ message: string }> {
    const res = await apiFetch(`${BASE}/api/events/${eventId}/chats/${messageId}/reactions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to toggle reaction");
    }
    return res.json();
  }
};
