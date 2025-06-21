import { NavLink } from 'react-router-dom';
import { Users, Flag, ClipboardList, BarChart, MessageSquare } from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: BarChart, exact: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/moderation', label: 'Moderation', icon: Flag },
  { path: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { path: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
];

const Sidebar = () => {
  return (
    <div className="w-full md:w-64 bg-slate-900 text-white md:min-h-screen flex-shrink-0">
      <div className="p-4">
        <h2 className="text-lg font-medium text-slate-200 mb-6">Admin Panel</h2>
        
        <nav className="space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-md transition-colors
                ${isActive 
                  ? 'bg-indigo-700 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
              `}
              aria-label={item.label}
            >
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;