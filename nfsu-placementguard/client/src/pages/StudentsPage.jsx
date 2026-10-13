import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Archive,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const PROGRAMMES = [
  'M.Tech. Computer Science',
  'M.Tech. Artificial Intelligence and Data Science',
  'B.Tech.–M.Tech. Computer Science and Engineering',
  'M.Sc. Computer Science',
  'M.Sc. Digital Forensics and Information Security'
];

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [registrationFilter, setRegistrationFilter] = useState('');
  const [placementFilter, setPlacementFilter] = useState('');

  // Selected student for detail modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add/Edit Student modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    placement_id: '',
    full_name: '',
    mobile: '',
    email: '',
    programme: PROGRAMMES[0],
    academic_batch: '2024-2026',
    cgpa: 8.0,
    registration_status: 'registered',
    academic_eligibility: 'eligible',
    placement_status: 'unplaced'
  });

  // Archive Confirm Dialog
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (programmeFilter) params.append('programme', programmeFilter);
      if (batchFilter) params.append('batch', batchFilter);
      if (eligibilityFilter) params.append('academic_eligibility', eligibilityFilter);
      if (registrationFilter) params.append('registration_status', registrationFilter);
      if (placementFilter) params.append('placement_status', placementFilter);

      const res = await fetch(`/api/students?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setStudents(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, programmeFilter, batchFilter, eligibilityFilter, registrationFilter, placementFilter]);

  const openStudentDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/students/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load student details');
      const data = await res.json();
      setSelectedStudentDetail(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormError(null);
    setFormData({
      placement_id: '',
      full_name: '',
      mobile: '',
      email: '',
      programme: PROGRAMMES[0],
      academic_batch: '2024-2026',
      cgpa: 8.0,
      registration_status: 'registered',
      academic_eligibility: 'eligible',
      placement_status: 'unplaced'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setFormError(null);
    setFormData({
      placement_id: student.placement_id,
      full_name: student.full_name,
      mobile: student.mobile,
      email: student.email,
      programme: student.programme,
      academic_batch: student.academic_batch,
      cgpa: student.cgpa,
      registration_status: student.registration_status,
      academic_eligibility: student.academic_eligibility,
      placement_status: student.placement_status
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save student record');
      }

      setIsAddModalOpen(false);
      fetchStudents();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/students/${archiveTarget.id}/archive`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to archive student');
      setArchiveTarget(null);
      fetchStudents();
    } catch (err) {
      alert(err.message);
    } finally {
      setArchiveLoading(false);
    }
  };

  const canManage = ['Administrator', 'Officer'].includes(user?.role);

  return (
    <div>
      {/* Role Scoping Banner */}
      {user?.role === 'Coordinator' && user.assigned_programme && (
        <div className="alert-banner alert-info">
          <UserCheck size={18} />
          <div>
            <strong>Course Coordinator Scope Active:</strong> Viewing student records scoped to{' '}
            <strong>{user.assigned_programme}</strong>.
          </div>
        </div>
      )}

      {user?.role === 'Recruiter' && (
        <div className="alert-banner alert-warning">
          <ShieldAlert size={18} />
          <div>
            <strong>Recruiter Privacy Policy Active:</strong> Student contact information (mobile and email) is masked to comply with institutional confidentiality policies.
          </div>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="card" style={{ padding: '16px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input-box">
            <Search size={16} className="search-icon-pos" />
            <input
              type="text"
              placeholder="Search by student name or Placement ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {user?.role !== 'Coordinator' && (
            <select
              className="filter-select"
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
            >
              <option value="">All 5 Programmes</option>
              {PROGRAMMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          <select
            className="filter-select"
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value)}
          >
            <option value="">Eligibility Status</option>
            <option value="eligible">Eligible</option>
            <option value="ineligible">Ineligible</option>
            <option value="pending_verification">Pending Verification</option>
          </select>

          <select
            className="filter-select"
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
          >
            <option value="">Placement Status</option>
            <option value="unplaced">Unplaced</option>
            <option value="fte_only">FTE Only</option>
            <option value="internship_only">Internship Only</option>
            <option value="internship_ppo_fte">Internship + PPO/FTE</option>
          </select>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} /> Add Student
            </button>
          )}
        </div>
      </div>

      {/* Students Data Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            Student Records ({students.length})
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchStudents}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Placement ID</th>
                <th>Full Name</th>
                <th>Programme</th>
                <th>CGPA</th>
                <th>Registration</th>
                <th>Eligibility</th>
                <th>Placement Status</th>
                <th>Active Offers</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No student records matching current filters.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan-primary)' }}>
                        {s.placement_id}
                      </span>
                    </td>
                    <td>
                      <strong>{s.full_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {s.email} | {s.mobile}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{s.programme}</td>
                    <td><strong>{s.cgpa.toFixed(1)}</strong></td>
                    <td><StatusBadge value={s.registration_status} /></td>
                    <td><StatusBadge value={s.academic_eligibility} /></td>
                    <td><StatusBadge value={s.placement_status} /></td>
                    <td>
                      {s.accepted_offers_count > 0 ? (
                        <span style={{ fontWeight: 600, color: '#059669' }}>
                          {s.accepted_offers_count} offer(s) (Peak: ₹{s.highest_accepted_ctc}L)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0 offers</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openStudentDetail(s.id)}
                        title="View Full Profile & Offers"
                        style={{ marginRight: '6px' }}
                      >
                        <Eye size={13} />
                      </button>

                      {canManage && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(s)}
                            title="Edit Student Record"
                            style={{ marginRight: '6px' }}
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setArchiveTarget(s)}
                            title="Archive Record"
                            style={{ color: '#e11d48' }}
                          >
                            <Archive size={13} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Detail Modal */}
      <Modal
        isOpen={Boolean(selectedStudentDetail)}
        onClose={() => setSelectedStudentDetail(null)}
        title={`Student Profile: ${selectedStudentDetail?.student?.full_name || ''}`}
        maxWidth="750px"
      >
        {selectedStudentDetail && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Placement ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: 'var(--cyan-primary)' }}>
                  {selectedStudentDetail.student.placement_id}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Programme & Batch</div>
                <div style={{ fontWeight: 600 }}>
                  {selectedStudentDetail.student.programme} ({selectedStudentDetail.student.academic_batch})
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Contact Information</div>
                <div style={{ fontSize: '13px' }}>
                  {selectedStudentDetail.student.email} | {selectedStudentDetail.student.mobile}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Eligibility & Status</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <StatusBadge value={selectedStudentDetail.student.academic_eligibility} />
                  <StatusBadge value={selectedStudentDetail.student.registration_status} />
                </div>
              </div>
            </div>

            {/* Offers History */}
            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '16px 0 8px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>
              Offers History ({selectedStudentDetail.offers?.length || 0})
            </h4>
            {selectedStudentDetail.offers?.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '10px 0' }}>
                No offers recorded yet.
              </div>
            ) : (
              <div className="table-container" style={{ marginBottom: '16px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>FTE CTC</th>
                      <th>Stipend</th>
                      <th>Acceptance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudentDetail.offers.map((o) => (
                      <tr key={o.id}>
                        <td><strong>{o.company_name}</strong></td>
                        <td><StatusBadge type="category" value={o.company_category} /></td>
                        <td><StatusBadge type="offer_type" value={o.offer_type} /></td>
                        <td>{o.ctc_lpa > 0 ? `₹${o.ctc_lpa} LPA` : '—'}</td>
                        <td>{o.stipend_amount > 0 ? `₹${o.stipend_amount}/mo (${o.stipend_period})` : '—'}</td>
                        <td><StatusBadge value={o.acceptance_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Attendance History */}
            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '16px 0 8px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>
              Drive Attendance History ({selectedStudentDetail.attendance?.length || 0})
            </h4>
            {selectedStudentDetail.attendance?.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '10px 0' }}>
                No drive attendance records logged.
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Drive</th>
                      <th>Stage</th>
                      <th>Status</th>
                      <th>Review Flag</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudentDetail.attendance.map((a) => (
                      <tr key={a.id}>
                        <td>{a.drive_title}</td>
                        <td>{a.stage}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: a.status === 'present' ? '#059669' : '#e11d48' }}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          {a.manual_review_status !== 'none' ? (
                            <StatusBadge type="decision" value="MANUAL_REVIEW" />
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>None</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.placement_id}` : 'Register New Student'}
        maxWidth="600px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmitForm} disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : editingStudent ? 'Update Record' : 'Register Student'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm}>
          {formError && (
            <div className="alert-banner alert-danger">
              <AlertCircle size={16} />
              <div>{formError}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Placement ID *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. NFSU26MTCS099"
                value={formData.placement_id}
                disabled={Boolean(editingStudent)}
                onChange={(e) => setFormData({ ...formData, placement_id: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Student Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 98250 XXXXX"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Institutional Email *</label>
              <input
                type="email"
                className="form-control"
                placeholder="student@students.nfsu.ac.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Programme / Department *</label>
            <select
              className="form-control"
              value={formData.programme}
              onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
            >
              {PROGRAMMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Academic Batch *</label>
              <input
                type="text"
                className="form-control"
                placeholder="2024-2026"
                value={formData.academic_batch}
                onChange={(e) => setFormData({ ...formData, academic_batch: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Current CGPA (out of 10) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                className="form-control"
                value={formData.cgpa}
                onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Registration Status</label>
              <select
                className="form-control"
                value={formData.registration_status}
                onChange={(e) => setFormData({ ...formData, registration_status: e.target.value })}
              >
                <option value="registered">Registered</option>
                <option value="deregistered">Deregistered</option>
                <option value="not registered">Not Registered</option>
              </select>
            </div>

            <div className="form-group">
              <label>Academic Eligibility</label>
              <select
                className="form-control"
                value={formData.academic_eligibility}
                onChange={(e) => setFormData({ ...formData, academic_eligibility: e.target.value })}
              >
                <option value="eligible">Eligible</option>
                <option value="ineligible">Ineligible</option>
                <option value="pending_verification">Pending Verification</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Archive Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        loading={archiveLoading}
        title="Archive Student Record"
        message={`Are you sure you want to archive student ${archiveTarget?.full_name} (${archiveTarget?.placement_id})? Under institutional policy, records with offer history are preserved and soft-archived rather than deleted.`}
        confirmText="Archive Record"
      />
    </div>
  );
}
