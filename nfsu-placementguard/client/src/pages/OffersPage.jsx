import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Building
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function OffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Issue Offer Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    student_id: '',
    company_id: '',
    offer_type: 'F',
    ctc_lpa: 12.0,
    stipend_amount: 35000,
    stipend_period: '6 Months',
    ppo_status: 'not applicable',
    remarks: ''
  });

  const [policyPreCheck, setPolicyPreCheck] = useState(null);
  const [checkingPolicy, setCheckingPolicy] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [bypassPolicy, setBypassPolicy] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const fetchOffersData = async () => {
    try {
      setLoading(true);
      const [offRes, studRes, compRes] = await Promise.all([
        fetch('/api/offers', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/students?limit=100', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/companies', { credentials: 'include' }).then((r) => r.json())
      ]);
      setOffers(offRes);
      setStudents(studRes.data || []);
      setCompanies(compRes);

      if (studRes.data?.length > 0 && !issueForm.student_id) {
        setIssueForm((prev) => ({ ...prev, student_id: studRes.data[0].id }));
      }
      if (compRes?.length > 0 && !issueForm.company_id) {
        setIssueForm((prev) => ({ ...prev, company_id: compRes[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffersData();
  }, []);

  // Pre-check policy whenever student or company or ctc changes in modal
  useEffect(() => {
    if (isIssueModalOpen && issueForm.student_id && issueForm.company_id) {
      const runPreCheck = async () => {
        setCheckingPolicy(true);
        try {
          const res = await fetch('/api/policy/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              student_id: issueForm.student_id,
              company_id: issueForm.company_id,
              target_ctc: issueForm.ctc_lpa,
              target_role_type: issueForm.offer_type
            })
          });
          const data = await res.json();
          setPolicyPreCheck(data.evaluation);
        } catch {
          setPolicyPreCheck(null);
        } finally {
          setCheckingPolicy(false);
        }
      };
      runPreCheck();
    }
  }, [isIssueModalOpen, issueForm.student_id, issueForm.company_id, issueForm.ctc_lpa, issueForm.offer_type]);

  const handleIssueOffer = async (e) => {
    e.preventDefault();
    setSubmittingOffer(true);
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...issueForm,
          bypass_policy: bypassPolicy,
          override_reason: overrideReason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to issue offer');
      }

      setIsIssueModalOpen(false);
      setBypassPolicy(false);
      setOverrideReason('');
      fetchOffersData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleUpdateStatus = async (offerId, newStatus) => {
    try {
      const res = await fetch(`/api/offers/${offerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ acceptance_status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchOffersData();
    } catch (err) {
      alert(err.message);
    }
  };

  const canManage = ['Administrator', 'Officer'].includes(user?.role);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Award size={18} color="var(--cyan-primary)" />
              Placement Offers & Compensation Registry
            </div>
            <div className="card-subtitle">
              Strict 24-hr acceptance deadline enforcement, distinct stipend vs FTE CTC tracking, and preserved audit history
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchOffersData}>
              <RefreshCw size={13} /> Refresh
            </button>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsIssueModalOpen(true)}>
                <Plus size={14} /> Record Placement Offer
              </button>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Offer ID</th>
                <th>Student</th>
                <th>Company & Tier</th>
                <th>Offer Type</th>
                <th>FTE Package (LPA)</th>
                <th>Monthly Stipend</th>
                <th>Acceptance Status</th>
                <th>24-Hr Deadline</th>
                {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading offer records...
                  </td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No placement offers recorded.
                  </td>
                </tr>
              ) : (
                offers.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{o.id}</td>
                    <td>
                      <strong>{o.student_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {o.placement_id} ({o.programme})
                      </div>
                    </td>
                    <td>
                      <div><strong>{o.company_name}</strong></div>
                      <StatusBadge type="category" value={o.company_category} />
                    </td>
                    <td><StatusBadge type="offer_type" value={o.offer_type} /></td>
                    <td>
                      {o.ctc_lpa > 0 ? (
                        <strong style={{ color: '#059669', fontSize: '14px' }}>
                          ₹{o.ctc_lpa} LPA
                        </strong>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>— (Internship Only)</span>
                      )}
                    </td>
                    <td>
                      {o.stipend_amount > 0 ? (
                        <div>
                          <strong style={{ color: 'var(--blue-vibrant)' }}>
                            ₹{o.stipend_amount.toLocaleString()}/mo
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.stipend_period}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>— (Direct FTE)</span>
                      )}
                    </td>
                    <td><StatusBadge value={o.acceptance_status} /></td>
                    <td>
                      <div style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {o.acceptance_deadline}
                      </div>
                      {o.computed_expired && o.acceptance_status === 'pending' && (
                        <span className="badge badge-block" style={{ marginTop: '2px' }}>
                          Expired Window
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {o.acceptance_status === 'pending' && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateStatus(o.id, 'accepted')}
                              style={{ color: '#059669', marginRight: '4px' }}
                              title="Mark Offer Accepted"
                            >
                              <CheckCircle size={13} /> Accept
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateStatus(o.id, 'declined')}
                              style={{ color: '#e11d48' }}
                              title="Mark Declined"
                            >
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                        {o.acceptance_status === 'accepted' && (
                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                            Confirmed ✓
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

      {/* Record Offer Modal with Real-Time Policy Pre-Check */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Record Student Placement Offer"
        maxWidth="650px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleIssueOffer}
              disabled={submittingOffer || (policyPreCheck?.decision === 'BLOCK' && !bypassPolicy)}
            >
              {submittingOffer ? 'Processing...' : 'Confirm & Dispatch Offer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleIssueOffer}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Target Candidate *</label>
              <select
                className="form-control"
                value={issueForm.student_id}
                onChange={(e) => setIssueForm({ ...issueForm, student_id: e.target.value })}
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.placement_id} - {s.full_name} ({s.programme})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Hiring Organization *</label>
              <select
                className="form-control"
                value={issueForm.company_id}
                onChange={(e) => setIssueForm({ ...issueForm, company_id: e.target.value })}
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Tier {c.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Offer Type *</label>
              <select
                className="form-control"
                value={issueForm.offer_type}
                onChange={(e) => setIssueForm({ ...issueForm, offer_type: e.target.value })}
              >
                <option value="F">Full-Time Employment Only (F)</option>
                <option value="I">Internship Only (I)</option>
                <option value="I+F">Internship + FTE / PPO (I+F)</option>
              </select>
            </div>

            <div className="form-group">
              <label>PPO Conversion Status</label>
              <select
                className="form-control"
                value={issueForm.ppo_status}
                onChange={(e) => setIssueForm({ ...issueForm, ppo_status: e.target.value })}
              >
                <option value="not applicable">Not Applicable</option>
                <option value="pending">Pending Review</option>
                <option value="offered">PPO Offered</option>
                <option value="accepted">PPO Accepted</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Annual FTE Package (LPA)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control"
                value={issueForm.ctc_lpa}
                onChange={(e) => setIssueForm({ ...issueForm, ctc_lpa: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Monthly Internship Stipend (INR)</label>
              <input
                type="number"
                step="1000"
                min="0"
                className="form-control"
                value={issueForm.stipend_amount}
                onChange={(e) => setIssueForm({ ...issueForm, stipend_amount: e.target.value })}
              />
            </div>
          </div>

          {/* REAL-TIME POLICY EVALUATION RESULT BANNER */}
          <div style={{ marginTop: '10px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '4px' }}>
              NFSU Policy Engine Live Pre-Check:
            </div>
            {checkingPolicy ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Evaluating policy rules...</div>
            ) : policyPreCheck ? (
              <div
                className={`alert-banner ${
                  policyPreCheck.decision === 'ALLOW'
                    ? 'alert-success'
                    : policyPreCheck.decision === 'BLOCK'
                    ? 'alert-danger'
                    : 'alert-warning'
                }`}
                style={{ marginBottom: 0, flexDirection: 'column', gap: '6px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge type="decision" value={policyPreCheck.decision} />
                  <strong>{policyPreCheck.ruleName}</strong>
                </div>
                <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                  {policyPreCheck.reasons.join(' ')}
                </div>
              </div>
            ) : null}
          </div>

          {/* Override Workflow if Blocked */}
          {policyPreCheck?.decision === 'BLOCK' && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  id="bypass_box"
                  checked={bypassPolicy}
                  onChange={(e) => setBypassPolicy(e.target.checked)}
                />
                <label htmlFor="bypass_box" style={{ fontSize: '12.5px', fontWeight: 700, color: '#9f1239' }}>
                  Authorize Placement Officer Override for this candidate
                </label>
              </div>

              {bypassPolicy && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11.5px', color: '#9f1239' }}>
                    Documented Administrative Justification (Audited) *
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Enter formal justification for policy exception..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Offer Remarks</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Dual semester internship + FTE joining post-graduation"
              value={issueForm.remarks}
              onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
