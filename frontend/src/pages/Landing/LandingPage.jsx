import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

function LandingPage() {
  return (
    <div className='min-h-screen bg-[#0B1120] text-white flex flex-col items-center justify-center px-6'>
      <motion.h1
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className='text-7xl font-bold text-center max-w-5xl'
      >
        AI Trend Intelligence Platform
      </motion.h1>

      <p className='text-gray-400 text-xl text-center max-w-2xl mt-6'>
        Detect and analyze internet trends using AI.
      </p>

      <Link
        to='/dashboard'
        className='mt-10 bg-purple-600 hover:bg-purple-700 transition-all px-8 py-4 rounded-2xl font-semibold'
      >
        Open Dashboard
      </Link>
    </div>
  )
}

export default LandingPage