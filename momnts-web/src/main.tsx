import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient()
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const AppWithProviders = () => (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)

createRoot(document.getElementById("root")!).render(
  clerkPubKey ? (
    <ClerkProvider publishableKey={clerkPubKey}>
      <AppWithProviders />
    </ClerkProvider>
  ) : (
    <AppWithProviders />
  ),
);
