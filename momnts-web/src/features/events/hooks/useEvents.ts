import { useQuery } from "@tanstack/react-query"
import { eventsApi, EventData } from "../services/events.api"

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
