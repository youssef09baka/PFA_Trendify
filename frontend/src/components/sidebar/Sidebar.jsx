import { Link, useLocation } from 'react-router-dom'

import {
  LayoutDashboard,
  Flame,
  BarChart3,
  Settings,
} from 'lucide-react'

function Sidebar() {
  const location = useLocation()

  const links = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Trends',
      path: '/trends',
      icon: Flame,
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ]

  return (
    <aside className='w-72 bg-[#111827] border-r border-gray-800 p-5'>
      <h1 className='text-3xl font-bold mb-10'>
        PFA AI
      </h1>

      <div className='flex flex-col gap-3'>
        {links.map((link) => {
          const Icon = link.icon

          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === link.path
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              {link.name}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}

export default Sidebar