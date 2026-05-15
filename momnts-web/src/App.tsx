import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./app.routes";
import { ThemeProvider } from "./components/theme-provider";

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
      <Toaster richColors />
    </ThemeProvider>
  )
}

export default App;