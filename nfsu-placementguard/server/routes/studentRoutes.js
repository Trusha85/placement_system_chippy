import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { maskSensitiveStudentData } from '../middleware/sanitize.js';

const router = express.Router();

const VALID_PROGRAMMES = [
  'M.Tech. Computer Science',
  'M.Tech. Artificial Intelligence and Data Science',
  'B.Tech.–M.Tech. Computer Science and Engineering',
  'M.Sc. Computer Science',
  'M.Sc. Digital Forensics and Information Security'
];

// GET /api/students - List students with search, filters, pagination, and role-based scoping
router.get('/', requireAuth, (req, res) => {
  try {
    const {
      search = '',
      programme = '',
      batch = '',
      registration_status = '',
      academic_eligibility = '',
      placement_status = '',
      include_archived = 'false',
      page = 1,
      limit = 50
    } = req.query;

    const user = req.session.user;
    let conditions = [];
    let params = [];

    // Filter archived unless explicitly requested
    if (include_archived !== 'true') {
      conditions.push('s.archived = 0');
    }

    // Role-based scoping: Course Coordinator restricted to their assigned programme
    if (user.role === 'Coordinator' && user.assigned_programme) {
      conditions.push('s.programme = ?');
      params.push(user.assigned_programme);
    } else if (programme) {
      conditions.push('s.programme = ?');
      params.push(programme);
    }

    // Recruiter scoping: only view students who applied or attended drives of recruiter's company, or non-archived eligible
    if (user.role === 'Recruiter' && user.company_id) {
      conditions.push(`(
        s.id IN (SELECT student_id FROM drive_attendance da JOIN recruitment_drives rd ON da.drive_id = rd.id WHERE rd.company_id = ?)
        OR s.id IN (SELECT student_id FROM offers WHERE company_id = ?)
        OR s.registration_status = 'registered'
      )`);
      params.push(user.company_id, user.company_id);
    }

    if (search) {
      conditions.push('(s.full_name LIKE ? OR s.placement_id LIKE ? OR s.email LIKE ?)');
      const sTerm = `%${search.trim()}%`;
      params.push(sTerm, sTerm, sTerm);
    }

    if (batch) {
      conditions.push('s.academic_batch = ?');
      params.push(batch);
    }

    if (registration_status) {
      conditions.push('s.registration_status = ?');
      params.push(registration_status);
    }

    if (academic_eligibility) {
      conditions.push('s.academic_eligibility = ?');
      params.push(academic_eligibility);
    }

    if (placement_status) {
      conditions.push('s.placement_status = ?');
      params.push(placement_status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Count total
    const countSql = `SELECT COUNT(*) as total FROM students s ${whereClause}`;
    const totalCount = db.prepare(countSql).get(...params).total;

    // Fetch paginated
    const offset = (Number(page) - 1) * Number(limit);
    const sql = `
      SELECT s.*,
        (SELECT COUNT(*) FROM offers WHERE student_id = s.id AND acceptance_status = 'accepted') as accepted_offers_count,
        (SELECT MAX(ctc_lpa) FROM offers WHERE student_id = s.id AND acceptance_status = 'accepted') as highest_accepted_ctc
      FROM students s
      ${whereClause}
      ORDER BY s.placement_id ASC
      LIMIT ? OFFSET ?
    `;

    const students = db.prepare(sql).all(...params, Number(limit), offset);

    // Apply role-based data redaction (PII masking for Recruiter)
    const sanitizedStudents = students.map(s => maskSensitiveStudentData(s, user.role));

    res.json({
      data: sanitizedStudents,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// GET /api/students/:id - Detail view
router.get('/:id', requireAuth, (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Role security check for Course Coordinator
    if (req.session.user.role === 'Coordinator' && req.session.user.assigned_programme) {
      if (student.programme !== req.session.user.assigned_programme) {
        return res.status(403).json({ error: 'Access Denied: Student is not in your authorized programme.' });
      }
    }

    // Fetch related offers
    const offers = db.prepare(`
      SELECT o.*, c.name as company_name, c.category as company_category, rd.title as drive_title
      FROM offers o
      JOIN companies c ON o.company_id = c.id
      LEFT JOIN recruitment_drives rd ON o.drive_id = rd.id
      WHERE o.student_id = ?
      ORDER BY o.offer_date DESC
    `).all(req.params.id);

    // Fetch attendance history
    const attendance = db.prepare(`
      SELECT da.*, rd.title as drive_title, rd.drive_date, c.name as company_name
      FROM drive_attendance da
      JOIN recruitment_drives rd ON da.drive_id = rd.id
      JOIN companies c ON rd.company_id = c.id
      WHERE da.student_id = ?
      ORDER BY rd.drive_date DESC
    `).all(req.params.id);

    // Recruiter redaction
    const sanitizedStudent = maskSensitiveStudentData(student, req.session.user.role);

    // If recruiter, only see offers from their company
    let filteredOffers = offers;
    if (req.session.user.role === 'Recruiter') {
      filteredOffers = offers.filter(o => o.company_id === req.session.user.company_id);
    }

    res.json({
      student: sanitizedStudent,
      offers: filteredOffers,
      attendance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students - Create Student (Administrator or Officer)
router.post('/', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const {
      placement_id,
      full_name,
      mobile,
      email,
      programme,
      academic_batch,
      cgpa = 8.0,
      registration_status = 'registered',
      academic_eligibility = 'eligible',
      placement_status = 'unplaced'
    } = req.body;

    if (!placement_id || !full_name || !mobile || !email || !programme || !academic_batch) {
      return res.status(400).json({ error: 'Missing mandatory fields (placement_id, full_name, mobile, email, programme, academic_batch).' });
    }

    // Check duplicate placement_id
    const existing = db.prepare('SELECT id FROM students WHERE placement_id = ?').get(placement_id.trim().toUpperCase());
    if (existing) {
      return res.status(409).json({ error: `Placement ID '${placement_id}' is already registered.` });
    }

    const stmt = db.prepare(`
      INSERT INTO students (placement_id, full_name, mobile, email, programme, academic_batch, cgpa, registration_status, academic_eligibility, placement_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      placement_id.trim().toUpperCase(),
      full_name.trim(),
      mobile.trim(),
      email.trim(),
      programme,
      academic_batch.trim(),
      Number(cgpa) || 8.0,
      registration_status,
      academic_eligibility,
      placement_status
    );

    logAudit({
      req,
      action: 'CREATE_STUDENT',
      entity: 'STUDENT',
      entityId: result.lastInsertRowid,
      details: { placement_id, full_name, programme, academic_batch }
    });

    res.status(201).json({
      message: 'Student record created successfully',
      id: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id - Update Student (Administrator or Officer)
router.put('/:id', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const {
      full_name,
      mobile,
      email,
      programme,
      academic_batch,
      cgpa,
      registration_status,
      academic_eligibility,
      placement_status
    } = req.body;

    const stmt = db.prepare(`
      UPDATE students
      SET full_name = ?, mobile = ?, email = ?, programme = ?, academic_batch = ?,
          cgpa = ?, registration_status = ?, academic_eligibility = ?, placement_status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      full_name || existing.full_name,
      mobile || existing.mobile,
      email || existing.email,
      programme || existing.programme,
      academic_batch || existing.academic_batch,
      cgpa !== undefined ? Number(cgpa) : existing.cgpa,
      registration_status || existing.registration_status,
      academic_eligibility || existing.academic_eligibility,
      placement_status || existing.placement_status,
      req.params.id
    );

    logAudit({
      req,
      action: 'UPDATE_STUDENT',
      entity: 'STUDENT',
      entityId: req.params.id,
      details: { before: existing, after: req.body }
    });

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/students/:id/archive - Archive / Soft Delete
router.patch('/:id/archive', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const newArchived = student.archived ? 0 : 1;
    db.prepare('UPDATE students SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newArchived, req.params.id);

    logAudit({
      req,
      action: newArchived ? 'ARCHIVE_STUDENT' : 'UNARCHIVE_STUDENT',
      entity: 'STUDENT',
      entityId: req.params.id,
      details: { student_id: student.id, placement_id: student.placement_id }
    });

    res.json({
      message: `Student ${newArchived ? 'archived' : 'unarchived'} successfully`,
      archived: Boolean(newArchived)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
