import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router'
import { AuthProvider } from './features/auth/auth.context'
import Protected from './features/auth/components/Protected'
import DashboardLayout from './layouts/DashboardLayout'
import Register from './features/auth/pages/register/Register'
import Login from './features/auth/pages/login/Login'
import VerifyEmail from './features/auth/pages/verify-email/VerifyEmail'
const Home = lazy(() => import('./pages/home/Home'))
const Events = lazy(() => import('./pages/events/Events'))
const EventDetails = lazy(() => import('./pages/events/EventDetails'))
const Profile = lazy(() => import('./pages/profile/Profile'))
import LandingPage from './pages/landing_page/LandingPage'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import TermsAndConditions from './pages/legal/TermsAndConditions'
import Pricing from './pages/pricing/Pricing'
import SSOCallback from './pages/sso-callback/SSOCallback'

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
        path: "/pricing",
        element: <Pricing />,
      },

      {
        path: "/sso-callback",
        element: <SSOCallback />,
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
            element: <Suspense fallback={null}><Home /></Suspense>,
          },
          {
            path: "/events",
            element: <Suspense fallback={null}><Events /></Suspense>,
          },
          {
            path: "/events/:eventId",
            element: <Suspense fallback={null}><EventDetails /></Suspense>,
          },
          {
            path: "/profile",
            element: <Suspense fallback={null}><Profile /></Suspense>,
          },
        ],
      },
    ],
  },
])