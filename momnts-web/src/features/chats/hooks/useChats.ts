import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatsApi, SendChatMessagePayload, ChatMessagesResponse, ChatMessageData } from "../services/chats.api";

export const useChatMessages = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["chats", eventId],
    queryFn: () => chatsApi.getChatMessages(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
};

export interface SendChatMessagePayloadWithUser extends SendChatMessagePayload {
  optimisticUser?: {
    id: string;
    name: string;
    selfie_url?: string | null;
  };
}

export const useSendChatMessage = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendChatMessagePayloadWithUser) => {
      const { optimisticUser, ...apiPayload } = payload;
      return chatsApi.sendChatMessage(eventId, apiPayload);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["chats", eventId] });
      const previousChats = queryClient.getQueryData<ChatMessagesResponse>(["chats", eventId]);

      queryClient.setQueryData<ChatMessagesResponse>(["chats", eventId], (oldData) => {
        const tempId = `temp-${Date.now()}`;
        const tempMessage: ChatMessageData = {
          id: tempId,
          event_id: eventId,
          user_id: variables.optimisticUser?.id || "",
          message_text: variables.message_text,
          encryption_iv: variables.encryption_iv,
          encryption_tag: variables.encryption_tag,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: {
            id: variables.optimisticUser?.id || "",
            name: variables.optimisticUser?.name || "Guest",
            selfie_url: variables.optimisticUser?.selfie_url || null,
          },
          photos: [],
          reactions: [],
          status: "sending"
        };

        if (!oldData) return { total: 1, data: [tempMessage] };
        return {
          ...oldData,
          total: oldData.total + 1,
          data: [...oldData.data, tempMessage],
        };
      });

      return { previousChats };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(["chats", eventId], context.previousChats);
      }
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData<ChatMessagesResponse>(["chats", eventId], (oldData) => {
        if (!oldData) return { total: 1, data: [newMessage] };
        const filtered = oldData.data.filter((m) => !m.id.startsWith("temp-"));
        if (filtered.some((m) => m.id === newMessage.id)) return { ...oldData, data: filtered };
        return {
          ...oldData,
          total: filtered.length + 1,
          data: [...filtered, newMessage],
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      chatsApi.toggleChatMessageReaction(eventId, messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", eventId] });
    },
  });
};
