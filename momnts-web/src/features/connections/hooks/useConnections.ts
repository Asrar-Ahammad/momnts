import { useQuery } from "@tanstack/react-query"
import {
  fetchConnections,
  fetchSharedPhotos,
  fetchConnectionsSummary,
} from "../services/connections.api"

export function useConnections(eventId: string, enabled = true) {
  return useQuery({
    queryKey: ["connections", eventId],
    queryFn: () => fetchConnections(eventId),
    enabled: !!eventId && enabled,
    staleTime: 45 * 60 * 1000,
  })
}

export function useSharedPhotos(
  eventId: string,
  faceProfileId: string | null
) {
  return useQuery({
    queryKey: ["shared-photos", eventId, faceProfileId],
    queryFn: () => fetchSharedPhotos(eventId, faceProfileId!),
    enabled: !!eventId && !!faceProfileId,
    staleTime: 45 * 60 * 1000,
  })
}

export function useConnectionsSummary(eventId: string, enabled = true) {
  return useQuery({
    queryKey: ["connections-summary", eventId],
    queryFn: () => fetchConnectionsSummary(eventId),
    enabled: !!eventId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}
