import DashboardLayout from '@/app/layouts/DashboardLayout'
import TrendCard from '@/components/trends/TrendCard'

import { trends } from '@/data/mockData'

function TrendsPage() {
  return (
    <DashboardLayout>
      <div className='mb-8'>
        <h1 className='text-4xl font-bold mb-2'>
          AI Trend Feed
        </h1>

        <p className='text-gray-400'>
          Real-time AI analyzed trends.
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
        {trends.map((trend) => (
          <TrendCard key={trend.id} trend={trend} />
        ))}
      </div>
    </DashboardLayout>
  )
}

export default TrendsPage