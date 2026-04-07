import { createBrowserRouter, Navigate } from 'react-router'
import App from './App'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { DriverPanelPage } from '../pages/DriverPanelPage'
import { DriverLoginPage } from '../pages/DriverLoginPage'
import { HomePage } from '../pages/HomePage'
import { PassengerMapPage } from '../pages/PassengerMapPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <Navigate to="/driver/login" replace />,
      },
      {
        path: 'passenger-map',
        element: <PassengerMapPage />,
      },
      {
        path: 'driver/login',
        element: <DriverLoginPage />,
      },
      {
        path: 'driver',
        element: <DriverPanelPage />,
      },
      {
        path: 'admin/login',
        element: <AdminLoginPage />,
      },
      {
        path: 'admin',
        element: <AdminDashboardPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
