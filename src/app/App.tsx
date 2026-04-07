import { Outlet } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'

function App() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export default App
