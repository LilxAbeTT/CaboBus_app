import { createBrowserRouter, Navigate } from 'react-router'
import App from './App'
import { loadPassengerMapPage } from '../pages/pageLoaders'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await import('../pages/HomePage')
          return { Component: HomePage }
        },
      },
      {
        path: 'login',
        element: <Navigate to="/driver/login" replace />,
      },
      {
        path: 'passenger-map',
        lazy: async () => {
          const { PassengerMapPage } = await loadPassengerMapPage()
          return { Component: PassengerMapPage }
        },
      },
      {
        path: 'driver/login',
        lazy: async () => {
          const { DriverLoginPage } = await import('../pages/DriverLoginPage')
          return { Component: DriverLoginPage }
        },
      },
      {
        path: 'driver',
        lazy: async () => {
          const { DriverPanelPage } = await import('../pages/DriverPanelPage')
          return { Component: DriverPanelPage }
        },
      },
      {
        path: 'admin/login',
        lazy: async () => {
          const { AdminLoginPage } = await import('../pages/AdminLoginPage')
          return { Component: AdminLoginPage }
        },
      },
      {
        path: 'admin',
        lazy: async () => {
          const { AdminDashboardPage } = await import('../pages/AdminDashboardPage')
          return { Component: AdminDashboardPage }
        },
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
