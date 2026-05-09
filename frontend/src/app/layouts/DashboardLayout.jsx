import Sidebar from '@/components/sidebar/Sidebar'
import Navbar from '@/components/navbar/Navbar'

function DashboardLayout({ children }) {
  return (
    <div className='flex min-h-screen bg-[#0B1120] text-white'>
      <Sidebar />

      <div className='flex-1'>
        <Navbar />

        <main className='p-6'>
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout