import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatsApi, SendChatMessagePayload, ChatMessagesResponse } from "../services/chats.api";

export const useChatMessages = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["chats", eventId],
    queryFn: () => chatsApi.getChatMessages(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
};

export const useSendChatMessage = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendChatMessagePayload) => chatsApi.sendChatMessage(eventId, payload),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<ChatMessagesResponse>(["chats", eventId], (oldData) => {
        if (!oldData) return { total: 1, data: [newMessage] };
        if (oldData.data.some((m) => m.id === newMessage.id)) return oldData;
        return {
          total: oldData.total + 1,
          data: [...oldData.data, newMessage],
        };
      });
    },
  });
};

export const useUpdateChatMessage = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, payload }: { messageId: string; payload: SendChatMessagePayload }) =>
      chatsApi.updateChatMessage(eventId, messageId, payload),
    onSuccess: (updatedMessage) => {
      queryClient.setQueryData<ChatMessagesResponse>(["chats", eventId], (oldData) => {
        if (!oldData) return undefined;
        return {
          total: oldData.total,
          data: oldData.data.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)),
        };
      });
    },
  });
};

export const useDeleteChatMessage = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => chatsApi.deleteChatMessage(eventId, messageId),
    onSuccess: (_, messageId) => {
      queryClient.setQueryData<ChatMessagesResponse>(["chats", eventId], (oldData) => {
        if (!oldData) return undefined;
        const filtered = oldData.data.filter((m) => m.id !== messageId);
        return {
          total: filtered.length,
          data: filtered,
        };
      });
    },
  });
};

export const useToggleChatMessageReaction = (eventId: string) => {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      chatsApi.toggleChatMessageReaction(eventId, messageId, emoji),
  });
};
