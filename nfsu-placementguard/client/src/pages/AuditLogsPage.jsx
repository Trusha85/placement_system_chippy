import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Terminal,
  Clock,
  User
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter]);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <ShieldAlert size={18} color="var(--cyan-primary)" />
              Security & Compliance Audit Trail (Append-Only)
            </div>
            <div className="card-subtitle">
              Tamper-evident system activity log capturing authentication events, policy overrides, and data access
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Filter Controls */}
        <div className="filter-bar">
          <div className="search-input-box">
            <Search size={16} className="search-icon-pos" />
            <input
              type="text"
              placeholder="Search by actor username or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Security Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
            <option value="CREATE_STUDENT">CREATE_STUDENT</option>
            <option value="CREATE_OFFER">CREATE_OFFER</option>
            <option value="OVERRIDE_POLICY">OVERRIDE_POLICY</option>
            <option value="RECORD_ATTENDANCE">RECORD_ATTENDANCE</option>
            <option value="EXPORT_CSV">EXPORT_CSV</option>
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Timestamp</th>
                <th>Actor & Role</th>
                <th>Action</th>
                <th>Entity Affected</th>
                <th>IP Address</th>
                <th>Payload / Event Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No audit logs matching current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>#{log.id}</td>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {log.timestamp}
                    </td>
                    <td>
                      <strong>{log.actor_username}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--cyan-primary)' }}>{log.actor_role}</div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: log.action.includes('FAILURE') ? '#fee2e2' : '#f0fdf4',
                          color: log.action.includes('FAILURE') ? '#dc2626' : '#166534',
                          border: `1px solid ${log.action.includes('FAILURE') ? '#fca5a5' : '#bbf7d0'}`
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <code>{log.entity} #{log.entity_id || '0'}</code>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{log.ip_address}</td>
                    <td style={{ maxWidth: '350px' }}>
                      <pre
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          background: '#f8fafc',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          margin: 0
                        }}
                      >
                        {log.details || '—'}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
