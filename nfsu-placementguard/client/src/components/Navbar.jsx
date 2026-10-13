import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, onRefresh, onExportCsv }) {
  const { user, demoAccounts, switchDemoRole } = useAuth();
  const [switching, setSwitching] = useState(false);

  const tabLabels = {
    dashboard: 'Placement Analytics & Dashboard',
    students: 'Student Directory & Records',
    companies: 'Companies & Recruitment Drives',
    offers: 'Offer Lifecycle & Compensation',
    policy: 'Policy Engine Evaluation Simulator',
    reviews: 'Policy Exceptions & Overrides',
    audit: 'Security & Compliance Audit Logs',
    'demo-guide': '5-Minute Hackathon Judge Walkthrough'
  };

  const handleRoleChange = async (e) => {
    const username = e.target.value;
    if (!username) return;
    const account = demoAccounts.find((a) => a.username === username);
    if (account) {
      setSwitching(true);
      try {
        await switchDemoRole(account.username, account.password);
      } catch (err) {
        alert('Failed to switch demo role: ' + err.message);
      } finally {
        setSwitching(false);
      }
    }
  };

  return (
    <header className="app-navbar">
      {/* Breadcrumbs */}
      <div className="navbar-breadcrumbs">
        <span className="institution">
          <ShieldCheck size={18} color="var(--cyan-primary)" />
          NFSU Gandhinagar
        </span>
        <span className="separator">/</span>
        <span className="page-name">{tabLabels[activeTab] || 'Overview'}</span>
      </div>

      {/* Actions */}
      <div className="navbar-actions">
        {/* Quick Demo Role Switcher for Hackathon Judges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Switch Role:
          </label>
          <select
            className="filter-select"
            value={user?.username || ''}
            onChange={handleRoleChange}
            disabled={switching}
            style={{ fontSize: '12px', padding: '6px 10px', minWidth: '190px' }}
          >
            {demoAccounts.map((acc) => (
              <option key={acc.username} value={acc.username}>
                {acc.role} ({acc.username})
              </option>
            ))}
          </select>
        </div>

        {/* Export CSV button (if user has privileges) */}
        {['Administrator', 'Officer', 'Coordinator'].includes(user?.role) && onExportCsv && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onExportCsv}
            title="Download CSV Report with Formula Injection Protection"
          >
            <Download size={14} />
            Export CSV
          </button>
        )}

        {/* Refresh Data button */}
        {onRefresh && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            title="Refresh Live Metrics"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        )}
      </div>
    </header>
  );
}
