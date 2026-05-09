import DashboardLayout from '@/app/layouts/DashboardLayout'
import KPIcard from '@/components/dashboard/KPIcard'
import TrendCard from '@/components/trends/TrendCard'

import { trends } from '@/data/mockData'

function DashboardPage() {
  return (
    <DashboardLayout>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-5 mb-8'>
        <KPIcard title='Detected Trends' value='124' />
        <KPIcard title='AI Confidence' value='91%' />
        <KPIcard title='Daily Activity' value='8.2K' />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
        {trends.map((trend) => (
          <TrendCard key={trend.id} trend={trend} />
        ))}
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage