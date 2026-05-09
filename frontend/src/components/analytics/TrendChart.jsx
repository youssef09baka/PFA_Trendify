import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
} from 'recharts'

function TrendChart({ data }) {
  return (
    <div className='bg-[#111827] border border-gray-800 rounded-2xl p-6 h-[350px]'>
      <h2 className='text-xl font-bold mb-6'>
        Trend Growth
      </h2>

      <ResponsiveContainer width='100%' height='100%'>
        <LineChart data={data}>
          <XAxis dataKey='name' />

          <Tooltip />

          <Line
            type='monotone'
            dataKey='value'
            stroke='#8b5cf6'
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TrendChart