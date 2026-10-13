import React from 'react';
import {
  Shield,
  LayoutDashboard,
  GraduationCap,
  Building2,
  Award,
  Scale,
  FileCheck,
  ShieldAlert,
  Compass,
  LogOut,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Metrics', icon: LayoutDashboard },
    { id: 'students', label: 'Student Directory', icon: GraduationCap },
    { id: 'companies', label: 'Companies & Drives', icon: Building2 },
    { id: 'offers', label: 'Offers & Compensation', icon: Award },
    { id: 'policy', label: 'Policy Engine Simulator', icon: Scale },
    { id: 'reviews', label: 'Policy Reviews & Overrides', icon: FileCheck },
    ...(user?.role === 'Administrator' ? [{ id: 'audit', label: 'Security Audit Trail', icon: ShieldAlert }] : []),
    { id: 'demo-guide', label: '5-Min Judge Walkthrough', icon: Compass, highlight: true }
  ];

  return (
    <aside className="app-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Shield size={22} />
        </div>
        <div className="sidebar-title-box">
          <h1>PlacementGuard</h1>
          <span>NFSU Enterprise</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">PLACEMENT MODULES</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              style={item.highlight ? { border: '1px solid rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.08)' } : {}}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="sidebar-footer">
        <div className="user-profile-widget">
          <div className="user-avatar">
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div className="user-info">
            <div className="name" title={user?.name}>{user?.name}</div>
            <div className="role-badge">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
