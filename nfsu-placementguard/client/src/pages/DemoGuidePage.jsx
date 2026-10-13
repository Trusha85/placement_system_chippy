import React from 'react';
import {
  Compass,
  CheckCircle,
  Play,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Award,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DemoGuidePage({ setActiveTab }) {
  const { user, switchDemoRole } = useAuth();

  const handleRoleSwitch = async (username, password) => {
    try {
      await switchDemoRole(username, password);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ background: 'linear-gradient(135deg, #0b1329 0%, #1e326b 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Compass size={28} color="var(--cyan-bright)" />
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>NFSU PlacementGuard - 5-Minute Judge Demonstration Script</h2>
        </div>
        <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.6', maxWidth: '850px' }}>
          Welcome judges! This interactive guide highlights the core cybersecurity, policy-driven placement rules, and role-based access control (RBAC) implemented in <strong>NFSU PlacementGuard</strong>.
          Follow the 5 test scenarios below to see real-time enforcement directly in action.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
        {/* Scenario 1 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0284c7', color: 'white', fontWeight: 800, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                1
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Tier A+ Dream Offer Lockout Policy
              </h3>
            </div>
            <span className="badge badge-block">Expected: BLOCK</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
            <strong>Rule:</strong> Package ≥ ₹16 LPA is Tier A+. Once a student accepts a Tier A+ offer, no switching is permitted and they are strictly excluded from further placement drives.
          </p>

          <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', marginBottom: '14px' }}>
            Candidate: <strong>Aarav Mehta (NFSU26MTCS001)</strong> holds an accepted A+ offer (22.5 LPA from SentinelOne).
            Evaluating him against any new drive triggers <code>RULE_APLUS_LOCK</code>.
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('policy')}>
            Test in Policy Simulator <ArrowRight size={13} />
          </button>
        </div>

        {/* Scenario 2 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0284c7', color: 'white', fontWeight: 800, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                2
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Tier B Package 1.5× Multiplier Rule
              </h3>
            </div>
            <span className="badge badge-review">Threshold Test</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
            <strong>Rule:</strong> Students holding Tier B (6–10 LPA) offers are only permitted to participate in subsequent drives if the new compensation is <strong>at least 1.5 times</strong> their current package.
          </p>

          <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', marginBottom: '14px' }}>
            Candidate: <strong>Chetan Vora (NFSU26MTCS003)</strong> holds a 7.5 LPA offer from CyberArk.
            <ul style={{ marginLeft: '20px', marginTop: '6px' }}>
              <li>Proposed: <strong>10.0 LPA</strong> (below 1.5× threshold of 11.25 LPA) → <code>BLOCK (RULE_B_1_5X_UPGRADE_FAILED)</code></li>
              <li>Proposed: <strong>13.5 LPA</strong> (Tata Cyber Defense, ≥ 1.5×) → <code>ALLOW (RULE_B_1_5X_UPGRADE_PASSED)</code></li>
            </ul>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('policy')}>
            Test 1.5x Multiplier in Simulator <ArrowRight size={13} />
          </button>
        </div>

        {/* Scenario 3 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0284c7', color: 'white', fontWeight: 800, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                3
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Offer Type Exclusivity (I vs F vs I+F)
              </h3>
            </div>
            <span className="badge badge-offer-if">Offer Type Rules</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
            <strong>Rule:</strong> Internship-only (I) selection blocks another internship but allows full-time (F). Dual I+F selection locks the candidate from all further processes.
          </p>

          <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', marginBottom: '14px' }}>
            <div>• <strong>Divya Nair</strong> holds 'I' (Internship-only): applying for another 'I' role is <code>BLOCKED</code>, but applying for 'F' is <code>ALLOWED</code>.</div>
            <div style={{ marginTop: '4px' }}>• <strong>Eshan Bhatt</strong> holds 'I+F' (CloudStrike): applying for any subsequent role is <code>LOCKED (RULE_IF_COMPLETE_LOCK)</code>.</div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('offers')}>
            Inspect Offers Registry <ArrowRight size={13} />
          </button>
        </div>

        {/* Scenario 4 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0284c7', color: 'white', fontWeight: 800, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                4
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Attendance & Absenteeism Disciplinary Review
              </h3>
            </div>
            <span className="badge badge-review">Expected: MANUAL_REVIEW</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
            <strong>Rule:</strong> Students with 3 consecutive unexcused absences are flagged for potential suspension from the next 3 drives. <em>Crucially, university policy never imposes final disciplinary action automatically without human review!</em>
          </p>

          <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', marginBottom: '14px' }}>
            Candidate: <strong>Qasim Ali (NFSU26DFIS004)</strong> has 3 unexcused absences. Evaluating him triggers <code>MANUAL_REVIEW (RULE_ABSENTEEISM_DISCIPLINARY)</code> with an auditable officer override workflow.
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('reviews')}>
              View Review Queue <ArrowRight size={13} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('companies')}>
              Open Attendance Tracker <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Scenario 5 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0284c7', color: 'white', fontWeight: 800, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                5
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Server-Enforced RBAC & PII Redaction
              </h3>
            </div>
            <span className="badge badge-allow">Cybersecurity RBAC</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
            <strong>Rule:</strong> All security constraints are enforced strictly on the server:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ border: '1px solid var(--border-light)', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'white' }}>
              <strong>Recruiter Role:</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
                Student mobile & email are redacted. Scoped only to Tata Cyber Defense drive data.
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleRoleSwitch('recruiter_tata', 'Recruit@NFSU2026!')}
              >
                Switch to Recruiter
              </button>
            </div>

            <div style={{ border: '1px solid var(--border-light)', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'white' }}>
              <strong>Course Coordinator:</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
                Read-only view scoped strictly to M.Tech. Computer Science students.
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleRoleSwitch('coordinator_cs', 'Coord@NFSU2026!')}
              >
                Switch to Coordinator
              </button>
            </div>

            <div style={{ border: '1px solid var(--border-light)', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'white' }}>
              <strong>Placement Admin:</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
                Full privileges, audit trail view, policy overrides, and CSV reports.
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleRoleSwitch('admin', 'Admin@NFSU2026!')}
              >
                Switch to Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
