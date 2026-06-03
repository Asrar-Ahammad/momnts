import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router'
import { AuthProvider } from './features/auth/auth.context'
import Protected from './features/auth/components/Protected'
import DashboardLayout from './layouts/DashboardLayout'
import Register from './features/auth/pages/register/Register'
import Login from './features/auth/pages/login/Login'
import VerifyEmail from './features/auth/pages/verify-email/VerifyEmail'
import Home from './pages/home/Home'
import Events from './pages/events/Events'
import EventDetails from './pages/events/EventDetails'
import Profile from './pages/profile/Profile'
import LandingPage from './pages/landing_page/LandingPage'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import TermsAndConditions from './pages/legal/TermsAndConditions'

const AuthLayout = () => (
  <AuthProvider>
    <Outlet />
    <ScrollRestoration />
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
        path: "/privacy",
        element: <PrivacyPolicy />,
      },
      {
        path: "/terms",
        element: <TermsAndConditions />,
      },

      {
        path: "/verify-email",
        element: <VerifyEmail />,
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