import DashboardLayout from '@/app/layouts/DashboardLayout'
import TrendCard from '@/components/trends/TrendCard'

import { trends } from '@/data/mockData'

function DashboardPage() {
  return (
    <DashboardLayout>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-5 mb-6'>
        <div className='bg-[#111827] p-6 rounded-2xl border border-gray-800'>
          <p className='text-gray-400'>Detected Trends</p>

          <h2 className='text-4xl font-bold mt-3'>
            124
          </h2>
        </div>

        <div className='bg-[#111827] p-6 rounded-2xl border border-gray-800'>
          <p className='text-gray-400'>AI Confidence</p>

          <h2 className='text-4xl font-bold mt-3'>
            91%
          </h2>
        </div>

        <div className='bg-[#111827] p-6 rounded-2xl border border-gray-800'>
          <p className='text-gray-400'>Daily Activity</p>

          <h2 className='text-4xl font-bold mt-3'>
            8.2K
          </h2>
        </div>
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