import { Outlet, NavLink } from 'react-router-dom'
import { Scale, Plus, LayoutDashboard, Swords, BookOpen, BarChart3, Gavel } from 'lucide-react'
import Disclaimer from './Disclaimer.jsx'

const navItems = [
  { to: '/', icon: Scale, label: 'My Cases', end: true },
  { to: '/new-case', icon: Plus, label: 'New Case' },
  { to: '/case/1', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/case/1/debate', icon: Swords, label: 'Debate Arena' },
  { to: '/case/1/precedents', icon: BookOpen, label: 'Precedents' },
  { to: '/case/1/bail', icon: BarChart3, label: 'Bail Analyzer' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-amber-400" />
            <span className="font-bold text-lg">NyayaAI</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">AI Legal Co-Pilot</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-amber-400 font-medium'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          v0.1 - Hackathon Build
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <Disclaimer />
        <div className="flex-1 p-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
