import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./app.routes";
import { ThemeProvider } from "./components/theme-provider";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdateNotification from "./components/PWAUpdateNotification";

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
      <Toaster richColors />
      <PWAInstallPrompt />
      <PWAUpdateNotification />
    </ThemeProvider>
  )
}

export default App;