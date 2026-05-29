import { useQuery } from "@tanstack/react-query"
import { eventsApi, EventData } from "../services/events.api"
import { photosApi, PhotoData } from "../services/photos.api"

export const useEvents = () => {
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const [myEvents, joinedEvents] = await Promise.all([
        eventsApi.getMyEvents(),
        eventsApi.getJoinedEvents(),
      ])
      
      const allEvents = [...myEvents, ...joinedEvents]
      
      // Remove duplicates
      return allEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      )
    },
  })

  return {
    events,
    isLoading,
    error,
  }
}

export const useEventDetails = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.getEventDetails(eventId!),
    enabled: !!eventId,
  })
}

export const useEventPhotos = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["photos", eventId],
    queryFn: () => photosApi.getEventPhotos(eventId!),
    enabled: !!eventId,
  })
}

export const useMyPhotos = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["my-photos", eventId],
    queryFn: () => photosApi.getMyPhotos(eventId!),
    enabled: !!eventId,
  })
}

export const useEventAttendees = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["attendees", eventId],
    queryFn: () => eventsApi.getEventAttendees(eventId!),
    enabled: !!eventId,
  })
}
