import { Bell, Search } from 'lucide-react'

function Navbar() {
  return (
    <header className='h-16 border-b border-gray-800 bg-[#0B1120] flex items-center justify-between px-6'>
      <div>
        <h2 className='text-2xl font-bold text-white'>
          AI Trend Intelligence
        </h2>
      </div>

      <div className='flex items-center gap-4'>
        <div className='bg-[#111827] px-4 py-2 rounded-xl flex items-center gap-3 border border-gray-800'>
          <Search size={18} className='text-gray-400' />

          <input
            type='text'
            placeholder='Search trends...'
            className='bg-transparent outline-none text-white'
          />
        </div>

        <button className='bg-[#111827] p-3 rounded-xl border border-gray-800'>
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}

export default Navbar