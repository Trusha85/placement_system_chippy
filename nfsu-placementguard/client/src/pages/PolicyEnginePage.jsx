import React, { useState, useEffect } from 'react';
import {
  Scale,
  Play,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function PolicyEnginePage() {
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Simulator Inputs
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [customCtc, setCustomCtc] = useState(12.0);
  const [customRoleType, setCustomRoleType] = useState('F');

  // Evaluation Result
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationHistory, setEvaluationHistory] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch('/api/students?limit=100', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/companies', { credentials: 'include' }).then((r) => r.json())
        ]);
        setStudents(sRes.data || []);
        setCompanies(cRes || []);

        if (sRes.data?.length > 0) setSelectedStudentId(sRes.data[0].id);
        if (cRes?.length > 0) setSelectedCompanyId(cRes[0].id);
      } finally {
        setLoadingData(false);
      }
    };
    init();
  }, []);

  const handleRunEvaluation = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStudentId) return;

    setEvaluating(true);
    try {
      const res = await fetch('/api/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          student_id: selectedStudentId,
          company_id: selectedCompanyId || null,
          target_ctc: Number(customCtc),
          target_role_type: customRoleType
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');

      setEvaluationResult(data);
      setEvaluationHistory((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          student: data.student.full_name,
          decision: data.evaluation.decision,
          rule: data.evaluation.ruleName,
          targetCtc: customCtc
        },
        ...prev.slice(0, 9)
      ]);
    } catch (err) {
      alert(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Simulator Control Card */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Scale size={18} color="var(--cyan-primary)" />
                Policy Rule Simulator
              </div>
              <div className="card-subtitle">
                Evaluate student placement eligibility against university placement policies in real-time
              </div>
            </div>
          </div>

          <form onSubmit={handleRunEvaluation}>
            <div className="form-group">
              <label>Select Student Candidate</label>
              <select
                className="form-control"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.placement_id} - {s.full_name} ({s.programme} | {s.placement_status})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Target Hiring Partner</label>
                <select
                  className="form-control"
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    const comp = companies.find((c) => String(c.id) === String(e.target.value));
                    if (comp) {
                      if (comp.category === 'A+') setCustomCtc(20.0);
                      else if (comp.category === 'A') setCustomCtc(13.0);
                      else if (comp.category === 'B') setCustomCtc(8.0);
                      else setCustomCtc(5.0);
                    }
                  }}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tier {c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Target Role Type</label>
                <select
                  className="form-control"
                  value={customRoleType}
                  onChange={(e) => setCustomRoleType(e.target.value)}
                >
                  <option value="F">Full-Time Only (F)</option>
                  <option value="I">Internship Only (I)</option>
                  <option value="I+F">Internship + FTE (I+F)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Proposed FTE Package (CTC in LPA)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control"
                value={customCtc}
                onChange={(e) => setCustomCtc(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={evaluating}>
              <Play size={16} />
              {evaluating ? 'Evaluating Policy Engine...' : 'Run Real-Time Policy Evaluation'}
            </button>
          </form>
        </div>

        {/* Live Evaluation Result Viewport */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">Policy Evaluation Output</div>
          </div>

          {!evaluationResult ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <Scale size={36} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Ready to evaluate</div>
              <div style={{ fontSize: '12px' }}>Choose a candidate and target drive, then click run.</div>
            </div>
          ) : (
            <div>
              {/* Decision Result Badge */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background:
                    evaluationResult.evaluation.decision === 'ALLOW'
                      ? 'var(--status-allow-bg)'
                      : evaluationResult.evaluation.decision === 'BLOCK'
                      ? 'var(--status-block-bg)'
                      : 'var(--status-review-bg)',
                  border: `1px solid ${
                    evaluationResult.evaluation.decision === 'ALLOW'
                      ? 'var(--status-allow-border)'
                      : evaluationResult.evaluation.decision === 'BLOCK'
                      ? 'var(--status-block-border)'
                      : 'var(--status-review-border)'
                  }`
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Policy Decision
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>
                    <StatusBadge type="decision" value={evaluationResult.evaluation.decision} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Triggered Rule ID</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                    {evaluationResult.evaluation.ruleId}
                  </div>
                </div>
              </div>

              {/* Rule Name & Detailed Reasons */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '8px' }}>
                  {evaluationResult.evaluation.ruleName}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {evaluationResult.evaluation.reasons.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '12.5px',
                        background: 'var(--surface-subtle)',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        lineHeight: '1.4',
                        borderLeft: `3px solid ${
                          evaluationResult.evaluation.decision === 'ALLOW' ? '#059669' : '#e11d48'
                        }`
                      }}
                    >
                      {r}
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Context Metadata */}
              <div style={{ fontSize: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', color: 'var(--text-muted)' }}>
                <div>Student: <strong>{evaluationResult.student.full_name}</strong> ({evaluationResult.student.placement_id})</div>
                <div>Status: <strong>{evaluationResult.student.placement_status}</strong> | Existing Offers: <strong>{evaluationResult.existingOffersCount}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Policy Rules Quick Reference Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Info size={18} color="var(--blue-vibrant)" />
            NFSU Institutional Placement Policy Reference
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', fontSize: '12.5px' }}>
          <div style={{ border: '1px solid #ddd6fe', background: '#f5f3ff', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ color: '#6d28d9', fontSize: '13px' }}>Tier A+ (Dream ≥ 16 LPA)</strong>
            <p style={{ marginTop: '4px', color: '#4c1d95', lineHeight: '1.4' }}>
              No switching allowed. Any student selected in Tier A+ is strictly locked and out of the placement process.
            </p>
          </div>

          <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ color: '#1d4ed8', fontSize: '13px' }}>Tier A (10 – 16 LPA)</strong>
            <p style={{ marginTop: '4px', color: '#1e3a8a', lineHeight: '1.4' }}>
              Switching is allowed <em>only</em> to Tier A+ category companies (≥ 16 LPA). Lateral or lower switching blocked.
            </p>
          </div>

          <div style={{ border: '1px solid #99f6e4', background: '#f0fdfa', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ color: '#0f766e', fontSize: '13px' }}>Tier B (6 – 10 LPA)</strong>
            <p style={{ marginTop: '4px', color: '#115e59', lineHeight: '1.4' }}>
              Further placement permitted only if target package is <strong>at least 1.5×</strong> the existing package.
            </p>
          </div>

          <div style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ color: '#334155', fontSize: '13px' }}>Offer Type Rules (I, F, I+F)</strong>
            <p style={{ marginTop: '4px', color: '#475569', lineHeight: '1.4' }}>
              'I' blocks another 'I', allows 'F'/'I+F'. 'F' blocks another 'F' (unless tier upgrade), allows 'I'. 'I+F' completely locks student.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
