import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Shield,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import StatusBadge from '../components/StatusBadge';

const CATEGORY_COLORS = {
  'A+': '#8b5cf6',
  'A': '#2563eb',
  'B': '#0d9488',
  'C': '#64748b'
};

export default function DashboardPage({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stats/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load dashboard statistics');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Loading NFSU Placement Analytics...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="alert-banner alert-danger">
        <AlertTriangle size={18} />
        <div>Error loading metrics: {error}</div>
      </div>
    );
  }

  const { studentCounts, compensation, offerDistribution, courseStats, pendingAlerts, subsequentDriveEligibleCount } = stats;

  return (
    <div>
      {/* Pending Action Alerts Banner */}
      {(pendingAlerts.pendingOfferAcceptances > 0 || pendingAlerts.pendingPolicyReviews > 0 || pendingAlerts.disciplinaryCases > 0) && (
        <div className="alert-banner alert-warning" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} />
            <div>
              <strong>Action Items Pending Review:</strong>{' '}
              {pendingAlerts.pendingOfferAcceptances > 0 && `${pendingAlerts.pendingOfferAcceptances} offers pending 24-hr deadline. `}
              {pendingAlerts.pendingPolicyReviews > 0 && `${pendingAlerts.pendingPolicyReviews} policy review cases require decision. `}
              {pendingAlerts.disciplinaryCases > 0 && `${pendingAlerts.disciplinaryCases} student attendance flag(s) for review.`}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('reviews')}>
            Review Queue <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Registered Students</div>
          <div className="kpi-value">{studentCounts.registered}</div>
          <div className="kpi-subtext">Total pool: {studentCounts.total} ({studentCounts.eligible} eligible)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Placement Rate</div>
          <div className="kpi-value" style={{ color: 'var(--cyan-primary)' }}>
            {studentCounts.placementRate}%
          </div>
          <div className="kpi-subtext">{studentCounts.placed} placed / {studentCounts.unplaced} unplaced</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Highest FTE CTC</div>
          <div className="kpi-value" style={{ color: '#059669' }}>
            ₹{compensation.highestCtc} <span style={{ fontSize: '14px', fontWeight: 600 }}>LPA</span>
          </div>
          <div className="kpi-subtext">Tier A+ Dream Placement</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Average FTE CTC</div>
          <div className="kpi-value">
            ₹{compensation.avgCtc} <span style={{ fontSize: '14px', fontWeight: 600 }}>LPA</span>
          </div>
          <div className="kpi-subtext">Median: ₹{compensation.medianCtc} LPA</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Internship Stipend</div>
          <div className="kpi-value" style={{ color: 'var(--blue-vibrant)' }}>
            ₹{compensation.avgStipend ? (compensation.avgStipend / 1000).toFixed(0) + 'k' : '0'}/mo
          </div>
          <div className="kpi-subtext">Peak: ₹{(compensation.maxStipend / 1000).toFixed(0)}k/mo (Separate from CTC)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Subsequent Drive Pool</div>
          <div className="kpi-value">
            {subsequentDriveEligibleCount}
          </div>
          <div className="kpi-subtext">Students eligible for further drives</div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Programme Outcomes Bar Chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Users size={18} color="var(--cyan-primary)" />
                Programme-Wise Placement Status
              </div>
              <div className="card-subtitle">Placed vs unplaced breakdown across 5 NFSU postgraduate programmes</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={courseStats} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="programme"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  tickFormatter={(val) => {
                    if (val.includes('CS')) return 'M.Tech CS';
                    if (val.includes('AIDS')) return 'M.Tech AIDS';
                    if (val.includes('B.Tech')) return 'Int. B+M.Tech';
                    if (val.includes('DFIS')) return 'M.Sc DFIS';
                    return 'M.Sc CS';
                  }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="placed" name="Placed" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unplaced" name="Unplaced" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Company Category Donut Chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Shield size={18} color="var(--blue-vibrant)" />
                Hiring Partner Category Tiering
              </div>
              <div className="card-subtitle">Distribution of recruitment partner tiers (A+, A, B, C)</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={offerDistribution.byCategory}
                  dataKey="company_count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {offerDistribution.byCategory.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Offer Breakdown Table & Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Offer Types Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Award size={18} color="#059669" />
              Offer Type Distribution
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Offer Type</th>
                  <th>Total Issued</th>
                  <th>Accepted</th>
                  <th>Pending Confirmation</th>
                </tr>
              </thead>
              <tbody>
                {offerDistribution.byType.map((ot) => (
                  <tr key={ot.offer_type}>
                    <td>
                      <StatusBadge type="offer_type" value={ot.offer_type} />
                    </td>
                    <td><strong>{ot.count}</strong></td>
                    <td style={{ color: '#059669', fontWeight: 600 }}>{ot.accepted_count}</td>
                    <td style={{ color: '#d97706', fontWeight: 600 }}>{ot.pending_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Simulator Jump Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #090e1a 0%, #16244f 100%)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Shield size={24} color="var(--cyan-bright)" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>NFSU Policy Engine</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '18px', lineHeight: '1.6' }}>
            Simulate and verify student drive applications against university placement rules:
            Tier A+ Dream Lockout, Category B 1.5x Multiplier, Offer Type exclusivity, and attendance disciplinary checks.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setActiveTab('policy')}>
              Run Policy Simulator <ArrowRight size={14} />
            </button>
            <button
              className="btn btn-secondary"
              style={{ background: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
              onClick={() => setActiveTab('demo-guide')}
            >
              Judge Demo Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
