import { BrowserRouter, Routes, Route } from 'react-router-dom'

import LandingPage from '@/pages/Landing/LandingPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import TrendsPage from '@/pages/Trends/TrendsPage'
import AnalyticsPage from '@/pages/Analytics/AnalyticsPage'
import FeedPage from '@/pages/Feed/FeedPage'
import SettingsPage from '@/pages/Settings/SettingsPage'
import LoginPage from '@/pages/Auth/LoginPage'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/trends' element={<TrendsPage />} />
        <Route path='/analytics' element={<AnalyticsPage />} />
        <Route path='/feed' element={<FeedPage />} />
        <Route path='/settings' element={<SettingsPage />} />
        <Route path='/login' element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter