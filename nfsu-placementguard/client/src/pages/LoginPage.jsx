import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, demoAccounts } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@NFSU2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (acc) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setLoading(true);
    setError(null);
    try {
      await login(acc.username, acc.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #101c3d 0%, #070c18 100%)',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '960px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', background: 'white', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)' }}>
        
        {/* Left Hero Branding Pane */}
        <div style={{ background: 'linear-gradient(135deg, #090e1a 0%, #16244f 100%)', padding: '44px 38px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div className="sidebar-logo-icon">
                <Shield size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>NFSU PlacementGuard</h1>
                <span style={{ fontSize: '11px', color: 'var(--cyan-bright)', fontWeight: 600, letterSpacing: '0.8px' }}>
                  CENTRAL PLACEMENT PORTAL
                </span>
              </div>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, lineHeight: '1.3', marginBottom: '14px', color: '#ffffff' }}>
              Secure, Policy-Driven Student Placement Management System
            </h2>

            <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', marginBottom: '24px' }}>
              Engineered for the National Forensic Sciences University (NFSU). Enforces strict multi-tier switching policies, automated 24-hr offer expiration, separate stipend vs CTC calculations, and server-side RBAC.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.85)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="var(--cyan-bright)" />
                <span>Bcrypt-hashed credentials & server-side session control</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="var(--cyan-bright)" />
                <span>Tier A+ Dream Lockout & 1.5× Package Multiplier Engine</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="var(--cyan-bright)" />
                <span>Role-based PII masking for recruiters & CSV injection defense</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px', marginTop: '24px' }}>
            National Forensic Sciences University • Ministry of Home Affairs, Govt. of India
          </div>
        </div>

        {/* Right Login Pane */}
        <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--navy-900)', marginBottom: '4px' }}>
            Sign In to PlacementGuard
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Select an account or enter credentials below.
          </p>

          {error && (
            <div className="alert-banner alert-danger" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label>Institutional Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', fontSize: '14px' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In Securely'} <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Judge Logins */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              One-Click Judge Demo Accounts
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => handleQuickDemoLogin(acc)}
                  disabled={loading}
                >
                  <KeyRound size={12} color="var(--cyan-primary)" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.roleKey} ({acc.username})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
