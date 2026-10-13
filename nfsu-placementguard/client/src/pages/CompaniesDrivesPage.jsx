import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  Award
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const PROGRAMMES = [
  'M.Tech. Computer Science',
  'M.Tech. Artificial Intelligence and Data Science',
  'B.Tech.–M.Tech. Computer Science and Engineering',
  'M.Sc. Computer Science',
  'M.Sc. Digital Forensics and Information Security'
];

export default function CompaniesDrivesPage() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('drives'); // 'drives' or 'companies'
  const [companies, setCompanies] = useState([]);
  const [drives, setDrives] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Company Modal
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    category: 'A',
    industry: 'Cybersecurity & Defense',
    job_description: '',
    contact_email: '',
    min_cgpa: 7.0,
    allowed_programmes: [...PROGRAMMES]
  });

  // Add Drive Modal
  const [isAddDriveOpen, setIsAddDriveOpen] = useState(false);
  const [driveForm, setDriveForm] = useState({
    company_id: '',
    title: '',
    drive_date: new Date().toISOString().slice(0, 10),
    role_type: 'F',
    package_ctc: 12.0,
    stipend_monthly: 35000,
    stipend_period: '6 Months'
  });

  // Attendance Tracker Modal
  const [selectedDriveForAttendance, setSelectedDriveForAttendance] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [recordAttendanceForm, setRecordAttendanceForm] = useState({
    student_id: '',
    stage: 'PPT',
    status: 'present',
    emergency_exception_approved: false,
    remarks: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, driveRes, studRes] = await fetchAllData();
      setCompanies(compRes);
      setDrives(driveRes);
      setStudents(studRes.data || []);
      if (compRes.length > 0 && !driveForm.company_id) {
        setDriveForm((prev) => ({ ...prev, company_id: compRes[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    const [c, d, s] = await Promise.all([
      fetch('/api/companies', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/drives', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/students?limit=100', { credentials: 'include' }).then((r) => r.json())
    ]);
    return [c, d, s];
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(companyForm)
      });
      if (!res.ok) throw new Error('Failed to create company');
      setIsAddCompanyOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(driveForm)
      });
      if (!res.ok) throw new Error('Failed to create drive');
      setIsAddDriveOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openAttendanceModal = async (drive) => {
    setSelectedDriveForAttendance(drive);
    setAttendanceLoading(true);
    try {
      const res = await fetch(`/api/drives/${drive.id}/attendance`, { credentials: 'include' });
      const data = await res.json();
      setAttendanceRecords(data);
      if (students.length > 0) {
        setRecordAttendanceForm((prev) => ({ ...prev, student_id: students[0].id }));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleRecordAttendance = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/drives/${selectedDriveForAttendance.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(recordAttendanceForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record attendance');

      // Refresh attendance list
      const updatedRes = await fetch(`/api/drives/${selectedDriveForAttendance.id}/attendance`, { credentials: 'include' });
      setAttendanceRecords(await updatedRes.json());
      setRecordAttendanceForm((prev) => ({ ...prev, remarks: '' }));
    } catch (err) {
      alert(err.message);
    }
  };

  const canManage = ['Administrator', 'Officer'].includes(user?.role);

  return (
    <div>
      {/* Subtab Switcher */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
        <button
          className={`btn ${activeSubTab === 'drives' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('drives')}
        >
          <Calendar size={15} /> Active Recruitment Drives ({drives.length})
        </button>
        <button
          className={`btn ${activeSubTab === 'companies' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('companies')}
        >
          <Building2 size={15} /> Hiring Partners & Tiers ({companies.length})
        </button>
      </div>

      {/* DRIVES SUBTAB */}
      {activeSubTab === 'drives' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Campus Recruitment Drives</div>
              <div className="card-subtitle">Manage campus interviews, CTC packages, stipend periods, and attendance</div>
            </div>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddDriveOpen(true)}>
                <Plus size={14} /> Schedule Drive
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drive Title</th>
                  <th>Hiring Organization</th>
                  <th>Tier Category</th>
                  <th>Role Type</th>
                  <th>FTE Package (LPA)</th>
                  <th>Monthly Stipend</th>
                  <th>Drive Date</th>
                  <th style={{ textAlign: 'right' }}>Attendance Tracking</th>
                </tr>
              </thead>
              <tbody>
                {drives.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No recruitment drives scheduled.
                    </td>
                  </tr>
                ) : (
                  drives.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.title}</strong></td>
                      <td>{d.company_name}</td>
                      <td><StatusBadge type="category" value={d.company_category} /></td>
                      <td><StatusBadge type="offer_type" value={d.role_type} /></td>
                      <td>
                        {d.package_ctc > 0 ? (
                          <strong style={{ color: '#059669' }}>₹{d.package_ctc} LPA</strong>
                        ) : 'N/A (Internship)'}
                      </td>
                      <td>
                        {d.stipend_monthly > 0 ? (
                          <span>₹{d.stipend_monthly.toLocaleString()}/mo ({d.stipend_period})</span>
                        ) : '—'}
                      </td>
                      <td>{d.drive_date}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openAttendanceModal(d)}
                        >
                          <Users size={13} />
                          Tracker ({d.attendance_records_count || 0})
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPANIES SUBTAB */}
      {activeSubTab === 'companies' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Institutional Hiring Partners</div>
              <div className="card-subtitle">Partner organizations categorized by NFSU Compensation Tiers</div>
            </div>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddCompanyOpen(true)}>
                <Plus size={14} /> Add Partner
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {companies.map((c) => (
              <div
                key={c.id}
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  background: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy-900)' }}>{c.name}</h4>
                  <StatusBadge type="category" value={c.category} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--cyan-primary)', fontWeight: 600, marginBottom: '6px' }}>
                  {c.industry}
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px', minHeight: '38px', lineHeight: '1.4' }}>
                  {c.job_description || 'Cybersecurity engineering and incident response operations.'}
                </p>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                  <div>Min CGPA: <strong>{c.min_cgpa}</strong></div>
                  <div>Eligible Programmes: <strong>{c.allowed_programmes?.length || 0} of 5</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Drive Modal */}
      <Modal
        isOpen={isAddDriveOpen}
        onClose={() => setIsAddDriveOpen(false)}
        title="Schedule Campus Recruitment Drive"
        maxWidth="550px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddDriveOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateDrive}>
              Schedule Drive
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateDrive}>
          <div className="form-group">
            <label>Hiring Organization *</label>
            <select
              className="form-control"
              value={driveForm.company_id}
              onChange={(e) => setDriveForm({ ...driveForm, company_id: e.target.value })}
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Tier {c.category})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Drive Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. SentinelOne Autonomous Threat Hunting Drive 2026"
              value={driveForm.title}
              onChange={(e) => setDriveForm({ ...driveForm, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Role Type *</label>
              <select
                className="form-control"
                value={driveForm.role_type}
                onChange={(e) => setDriveForm({ ...driveForm, role_type: e.target.value })}
              >
                <option value="F">Full-Time Only (F)</option>
                <option value="I">Internship Only (I)</option>
                <option value="I+F">Internship + FTE (I+F)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Drive Date *</label>
              <input
                type="date"
                className="form-control"
                value={driveForm.drive_date}
                onChange={(e) => setDriveForm({ ...driveForm, drive_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>FTE Annual Package (LPA)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control"
                value={driveForm.package_ctc}
                onChange={(e) => setDriveForm({ ...driveForm, package_ctc: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Monthly Stipend (INR)</label>
              <input
                type="number"
                step="1000"
                min="0"
                className="form-control"
                value={driveForm.stipend_monthly}
                onChange={(e) => setDriveForm({ ...driveForm, stipend_monthly: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Company Modal */}
      <Modal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
        title="Register Hiring Partner Organization"
        maxWidth="550px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddCompanyOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateCompany}>
              Register Partner
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateCompany}>
          <div className="form-group">
            <label>Organization Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. SentinelOne Labs"
              value={companyForm.name}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Compensation Tier Category *</label>
              <select
                className="form-control"
                value={companyForm.category}
                onChange={(e) => setCompanyForm({ ...companyForm, category: e.target.value })}
              >
                <option value="A+">Tier A+ (Dream ≥16 LPA)</option>
                <option value="A">Tier A (10–16 LPA)</option>
                <option value="B">Tier B (6–10 LPA)</option>
                <option value="C">Tier C (&lt;6 LPA)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Minimum Required CGPA</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                className="form-control"
                value={companyForm.min_cgpa}
                onChange={(e) => setCompanyForm({ ...companyForm, min_cgpa: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Industry Domain</label>
            <input
              type="text"
              className="form-control"
              value={companyForm.industry}
              onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Job Profile Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={companyForm.job_description}
              onChange={(e) => setCompanyForm({ ...companyForm, job_description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Drive Attendance Tracker Modal */}
      <Modal
        isOpen={Boolean(selectedDriveForAttendance)}
        onClose={() => setSelectedDriveForAttendance(null)}
        title={`Drive Attendance Tracker: ${selectedDriveForAttendance?.title || ''}`}
        maxWidth="800px"
      >
        <div>
          {/* Record Attendance Sub-Form (Only for Admin/Officer) */}
          {canManage && (
            <div style={{ background: 'var(--surface-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--navy-900)' }}>
                Record Stage Attendance / Absence
              </div>
              <form onSubmit={handleRecordAttendance} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Select Student</label>
                  <select
                    className="form-control"
                    style={{ fontSize: '12px' }}
                    value={recordAttendanceForm.student_id}
                    onChange={(e) => setRecordAttendanceForm({ ...recordAttendanceForm, student_id: e.target.value })}
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.placement_id} - {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Selection Stage</label>
                  <select
                    className="form-control"
                    style={{ fontSize: '12px' }}
                    value={recordAttendanceForm.stage}
                    onChange={(e) => setRecordAttendanceForm({ ...recordAttendanceForm, stage: e.target.value })}
                  >
                    <option value="PPT">Pre-Placement Talk (PPT)</option>
                    <option value="Assessment">Technical Assessment</option>
                    <option value="Technical Interview">Technical Interview</option>
                    <option value="HR Interview">HR Interview</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Status</label>
                  <select
                    className="form-control"
                    style={{ fontSize: '12px' }}
                    value={recordAttendanceForm.status}
                    onChange={(e) => setRecordAttendanceForm({ ...recordAttendanceForm, status: e.target.value })}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent (Unexcused)</option>
                    <option value="excused">Excused Medical</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary btn-sm" style={{ height: '38px' }}>
                  Log Record
                </button>
              </form>

              {recordAttendanceForm.status === 'absent' && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="emergency_check"
                    checked={recordAttendanceForm.emergency_exception_approved}
                    onChange={(e) => setRecordAttendanceForm({ ...recordAttendanceForm, emergency_exception_approved: e.target.checked })}
                  />
                  <label htmlFor="emergency_check" style={{ fontSize: '12px', color: '#92400e' }}>
                    Approve verified medical / emergency exception (prevents absenteeism escalation)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Attendance Log Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Placement ID</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Policy Review Flag</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No attendance events recorded for this drive yet.
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.student_name}</strong></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{r.placement_id}</td>
                      <td>{r.stage}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: r.status === 'present' ? '#059669' : '#e11d48' }}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.manual_review_status === 'disciplinary_review' ? (
                          <span className="badge badge-block" title="Flagged for 3-drive review; requires Officer review">
                            <AlertTriangle size={12} /> Disciplinary Flag (3 Absences)
                          </span>
                        ) : r.manual_review_status === 'approved_exception' ? (
                          <span className="badge badge-allow">Exception Approved</span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>Normal</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
