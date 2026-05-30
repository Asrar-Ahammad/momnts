import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchComments,
  addComment,
  deleteComment,
  AddCommentPayload,
} from "../services/comments.api";

export function useComments(photoId: string) {
  return useQuery({
    queryKey: ["comments", photoId],
    queryFn: () => fetchComments(photoId),
    enabled: !!photoId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAddComment(photoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddCommentPayload) => addComment(photoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", photoId] });
    },
  });
}

export function useDeleteComment(photoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(photoId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", photoId] });
    },
  });
}
