import { useQuery } from "@tanstack/react-query"
import { subscriptionApi } from "../services/subscription.api"

export function useSubscription() {
  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionApi.getSubscription(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const plan = subscription?.plan || "FREE"
  const limits = subscription?.limits || null
  const isPro = plan === "PRO"

  return {
    plan,
    isPro,
    limits,
    subscription: subscription?.subscription || null,
    isLoading,
    error,
    refetch,
  }
}

export function useUsage() {
  const {
    data: usage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription-usage"],
    queryFn: () => subscriptionApi.getUsage(),
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  })

  return {
    usage: usage?.usage || null,
    plan: usage?.plan || "FREE",
    isLoading,
    error,
    refetch,
  }
}
