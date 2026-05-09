import { BrowserRouter, Routes, Route } from 'react-router-dom'

import LandingPage from '../../pages/Landing/LandingPage'
import DashboardPage from '../../pages/Dashboard/DashboardPage'
import TrendsPage from '../../pages/Trends/TrendsPage'
import AnalyticsPage from '../../pages/Analytics/AnalyticsPage'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/trends' element={<TrendsPage />} />
        <Route path='/analytics' element={<AnalyticsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter