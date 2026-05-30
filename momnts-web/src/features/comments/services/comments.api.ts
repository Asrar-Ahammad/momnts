import { apiFetch } from "../../../lib/apiFetch";

export interface CommentUser {
  id: string;
  name: string;
  selfie_url?: string | null;
}

export interface CommentData {
  id: string;
  photo_id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  user: CommentUser;
  replies: CommentData[];
}

export interface CommentsResponse {
  total: number;
  data: CommentData[];
}

export interface AddCommentPayload {
  text: string;
  parent_id?: string;
}

const BASE = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchComments(photoId: string): Promise<CommentsResponse> {
  const res = await apiFetch(`${BASE}/api/photos/${photoId}/comments`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch comments");
  }
  return res.json();
}

export async function addComment(photoId: string, payload: AddCommentPayload): Promise<CommentData> {
  const res = await apiFetch(`${BASE}/api/photos/${photoId}/comments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to add comment");
  }
  const json = await res.json();
  return json.data;
}

export async function deleteComment(photoId: string, commentId: string): Promise<void> {
  const res = await apiFetch(`${BASE}/api/photos/${photoId}/comments/${commentId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to delete comment");
  }
}
