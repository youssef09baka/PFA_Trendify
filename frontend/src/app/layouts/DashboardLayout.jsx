import Sidebar from '@/components/sidebar/Sidebar'
import Navbar from '@/components/navbar/Navbar'

function DashboardLayout({ children }) {
  return (
    <div className='flex bg-[#0B1120] min-h-screen text-white'>
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