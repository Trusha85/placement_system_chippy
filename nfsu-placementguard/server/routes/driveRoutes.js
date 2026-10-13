import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// GET /api/drives - List recruitment drives
router.get('/', requireAuth, (req, res) => {
  try {
    const user = req.session.user;
    let sql = `
      SELECT rd.*, c.name as company_name, c.category as company_category, c.min_cgpa, c.allowed_programmes,
        (SELECT COUNT(*) FROM drive_attendance WHERE drive_id = rd.id) as attendance_records_count,
        (SELECT COUNT(*) FROM offers WHERE drive_id = rd.id) as offers_made_count
      FROM recruitment_drives rd
      JOIN companies c ON rd.company_id = c.id
    `;
    let params = [];

    if (user.role === 'Recruiter' && user.company_id) {
      sql += ' WHERE rd.company_id = ?';
      params.push(user.company_id);
    }

    sql += ' ORDER BY rd.drive_date DESC';
    const drives = db.prepare(sql).all(...params);

    const formatted = drives.map(d => ({
      ...d,
      allowed_programmes: d.allowed_programmes ? JSON.parse(d.allowed_programmes) : []
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drives - Create drive (Admin / Officer)
router.post('/', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const { company_id, title, drive_date, role_type, package_ctc = 0, stipend_monthly = 0, stipend_period = '6 Months' } = req.body;
    if (!company_id || !title || !drive_date || !role_type) {
      return res.status(400).json({ error: 'Missing mandatory fields (company_id, title, drive_date, role_type).' });
    }

    const stmt = db.prepare(`
      INSERT INTO recruitment_drives (company_id, title, drive_date, role_type, package_ctc, stipend_monthly, stipend_period, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const result = stmt.run(
      Number(company_id),
      title.trim(),
      drive_date,
      role_type,
      Number(package_ctc) || 0,
      Number(stipend_monthly) || 0,
      stipend_period
    );

    logAudit({
      req,
      action: 'CREATE_DRIVE',
      entity: 'RECRUITMENT_DRIVE',
      entityId: result.lastInsertRowid,
      details: { title, company_id, role_type, package_ctc }
    });

    res.status(201).json({ message: 'Recruitment drive created successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drives/:id/attendance
router.get('/:id/attendance', requireAuth, (req, res) => {
  try {
    const attendance = db.prepare(`
      SELECT da.*, s.full_name as student_name, s.placement_id, s.programme, s.email, s.mobile
      FROM drive_attendance da
      JOIN students s ON da.student_id = s.id
      WHERE da.drive_id = ?
      ORDER BY da.stage ASC, s.full_name ASC
    `).all(req.params.id);

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drives/:id/attendance - Record/update attendance
router.post('/:id/attendance', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const driveId = req.params.id;
    const { student_id, stage, status, emergency_exception_approved = 0, remarks = '' } = req.body;

    if (!student_id || !stage || !status) {
      return res.status(400).json({ error: 'Missing student_id, stage, or status' });
    }

    // Check consecutive unexcused absences for this student across drives
    const pastAbsences = db.prepare(`
      SELECT COUNT(*) as unexcused_count
      FROM drive_attendance
      WHERE student_id = ? AND status = 'absent' AND emergency_exception_approved = 0
    `).get(student_id).unexcused_count;

    const currentUnexcused = status === 'absent' && !emergency_exception_approved ? pastAbsences + 1 : pastAbsences;

    // Flag for manual review if >= 3 absences, but NEVER automatically exclude
    let manualReviewStatus = 'none';
    if (status === 'absent') {
      if (emergency_exception_approved) {
        manualReviewStatus = 'approved_exception';
      } else if (currentUnexcused >= 3) {
        manualReviewStatus = 'disciplinary_review'; // Flags review for Placement Officer
      } else {
        manualReviewStatus = 'flagged_absent';
      }
    }

    const stmt = db.prepare(`
      INSERT INTO drive_attendance (drive_id, student_id, stage, status, emergency_exception_approved, manual_review_status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      driveId,
      student_id,
      stage,
      status,
      emergency_exception_approved ? 1 : 0,
      manualReviewStatus,
      remarks
    );

    logAudit({
      req,
      action: 'RECORD_ATTENDANCE',
      entity: 'ATTENDANCE',
      entityId: result.lastInsertRowid,
      details: { driveId, student_id, stage, status, manualReviewStatus }
    });

    res.status(201).json({
      message: 'Attendance recorded successfully',
      manualReviewStatus,
      consecutiveUnexcused: currentUnexcused
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
