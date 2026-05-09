import { motion } from 'framer-motion'

function TrendCard({ trend }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className='bg-[#111827] border border-gray-800 rounded-2xl p-5'
    >
      <div className='flex justify-between mb-4'>
        <span className='bg-purple-600/20 text-purple-400 px-3 py-1 rounded-full text-sm'>
          {trend.category}
        </span>

        <span className='text-white font-bold'>
          {trend.score}%
        </span>
      </div>

      <h2 className='text-xl font-semibold text-white mb-3'>
        {trend.title}
      </h2>

      <p className='text-gray-400'>
        Sentiment: {trend.sentiment}
      </p>
    </motion.div>
  )
}

export default TrendCard