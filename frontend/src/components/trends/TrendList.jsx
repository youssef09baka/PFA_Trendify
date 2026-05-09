import TrendCard from './TrendCard'

function TrendList({ trends }) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
      {trends.map((trend) => (
        <TrendCard key={trend.id} trend={trend} />
      ))}
    </div>
  )
}

export default TrendList