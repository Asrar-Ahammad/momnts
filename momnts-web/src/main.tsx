// Polyfill requestIdleCallback for Safari and other unsupporting browsers
if (typeof requestIdleCallback === 'undefined') {
  (window as any).requestIdleCallback = (cb: IdleRequestCallback) => {
    const start = Date.now()
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      })
    }, 1)
  };
  (window as any).cancelIdleCallback = (id: number) => clearTimeout(id)
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — reuse cached data across navigations
      gcTime: 30 * 60 * 1000,   // 30 min — keep unused cache longer
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
