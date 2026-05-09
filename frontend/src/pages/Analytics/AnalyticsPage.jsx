import DashboardLayout from '@/app/layouts/DashboardLayout'
import TrendChart from '@/components/analytics/TrendChart'

const chartData = [
  {
    name: 'Mon',
    value: 20,
  },
  {
    name: 'Tue',
    value: 35,
  },
  {
    name: 'Wed',
    value: 55,
  },
  {
    name: 'Thu',
    value: 48,
  },
  {
    name: 'Fri',
    value: 72,
  },
]

function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className='mb-8'>
        <h1 className='text-4xl font-bold mb-2'>
          Analytics
        </h1>

        <p className='text-gray-400'>
          AI insights and analytics.
        </p>
      </div>

      <TrendChart data={chartData} />
    </DashboardLayout>
  )
}

export default AnalyticsPage