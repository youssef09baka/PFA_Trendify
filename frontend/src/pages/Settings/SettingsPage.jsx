import DashboardLayout from '@/app/layouts/DashboardLayout'

function SettingsPage() {
  return (
    <DashboardLayout>
      <h1 className='text-4xl font-bold mb-8'>
        Settings
      </h1>

      <div className='bg-[#111827] border border-gray-800 rounded-2xl p-6'>
        <p className='text-gray-400'>
          Application settings panel.
        </p>
      </div>
    </DashboardLayout>
  )
}

export default SettingsPage