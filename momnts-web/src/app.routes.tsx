import { createBrowserRouter, Outlet } from 'react-router'
import { AuthProvider } from './features/auth/auth.context'
import Protected from './features/auth/components/Protected'
import DashboardLayout from './layouts/DashboardLayout'
import Register from './features/auth/pages/register/Register'
import Login from './features/auth/pages/login/Login'
import Home from './pages/home/Home'
import Events from './pages/events/Events'
import EventDetails from './pages/events/EventDetails'
import Profile from './pages/profile/Profile'
import Onboarding from './features/auth/pages/onboarding/Onboarding'
import LandingPage from './pages/landing_page/LandingPage'

const AuthLayout = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
)

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/onboarding",
        element: <Onboarding />,
      },
      {
        element: (
          <Protected>
            <DashboardLayout />
          </Protected>
        ),
        children: [
          {
            path: "/dashboard",
            element: <Home />,
          },
          {
            path: "/events",
            element: <Events />,
          },
          {
            path: "/events/:eventId",
            element: <EventDetails />,
          },
          {
            path: "/profile",
            element: <Profile />,
          },
        ],
      },
    ],
  },
])