import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function PolicyReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Override Modal
  const [selectedReviewForOverride, setSelectedReviewForOverride] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/policy/reviews', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch policy review cases');
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleOpenOverride = (review) => {
    setSelectedReviewForOverride(review);
    setOverrideReason('');
  };

  const handleConfirmOverride = async (e) => {
    e.preventDefault();
    if (!overrideReason || overrideReason.trim().length < 5) {
      alert('Please provide a substantive justification for the policy override.');
      return;
    }

    setSubmittingOverride(true);
    try {
      const res = await fetch(`/api/policy/reviews/${selectedReviewForOverride.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ override_reason: overrideReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to override policy');

      setSelectedReviewForOverride(null);
      fetchReviews();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingOverride(false);
    }
  };

  const canOverride = ['Administrator', 'Officer'].includes(user?.role);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <FileCheck size={18} color="var(--cyan-primary)" />
              Policy Reviews & Authorized Override Queue
            </div>
            <div className="card-subtitle">
              Audited exception workflow for blocked applications, attendance anomalies, and special policy considerations
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchReviews}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Student</th>
                <th>Company</th>
                <th>Rule Applied</th>
                <th>Initial Decision</th>
                <th>Reasons / Escalation Notes</th>
                <th>Override Status</th>
                {canOverride && <th style={{ textAlign: 'right' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading review cases...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No pending policy review escalations in queue.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{r.id}</td>
                    <td>
                      <strong>{r.student_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {r.placement_id} ({r.programme})
                      </div>
                    </td>
                    <td>
                      <div><strong>{r.company_name}</strong></div>
                      <StatusBadge type="category" value={r.company_category} />
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--navy-900)' }}>
                        {r.rule_applied}
                      </span>
                    </td>
                    <td><StatusBadge type="decision" value={r.decision} /></td>
                    <td style={{ fontSize: '12px', maxWidth: '300px' }}>{r.reasons}</td>
                    <td>
                      {r.is_overridden ? (
                        <div>
                          <span className="badge badge-allow">
                            <CheckCircle size={11} /> Overridden
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            By {r.override_by} on {r.override_timestamp?.slice(0, 10)}
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-review">Pending Decision</span>
                      )}
                    </td>
                    {canOverride && (
                      <td style={{ textAlign: 'right' }}>
                        {!r.is_overridden ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenOverride(r)}
                          >
                            <UserCheck size={13} /> Override
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                            Approved
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Justification Modal */}
      <Modal
        isOpen={Boolean(selectedReviewForOverride)}
        onClose={() => setSelectedReviewForOverride(null)}
        title="Authorize Placement Policy Exception"
        maxWidth="550px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setSelectedReviewForOverride(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleConfirmOverride} disabled={submittingOverride}>
              {submittingOverride ? 'Recording Override...' : 'Confirm Audited Override'}
            </button>
          </>
        }
      >
        {selectedReviewForOverride && (
          <form onSubmit={handleConfirmOverride}>
            <div style={{ marginBottom: '14px', background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div>Candidate: <strong>{selectedReviewForOverride.student_name}</strong> ({selectedReviewForOverride.placement_id})</div>
              <div>Hiring Partner: <strong>{selectedReviewForOverride.company_name}</strong></div>
              <div>Rule Flagged: <code style={{ color: '#e11d48' }}>{selectedReviewForOverride.rule_applied}</code></div>
            </div>

            <div className="alert-banner alert-warning" style={{ fontSize: '12.5px' }}>
              <AlertTriangle size={18} />
              <div>
                <strong>Audited Compliance Action:</strong> Your username (<code>{user?.username}</code>), role, timestamp, and justification will be logged permanently in the institutional audit log.
              </div>
            </div>

            <div className="form-group">
              <label>Formal Administrative Justification *</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Detail the exceptional academic, institutional, or placement committee grounds for authorizing this exception..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                required
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
