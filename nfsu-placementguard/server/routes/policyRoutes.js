import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { evaluatePlacementPolicy } from '../policy/policyEngine.js';

const router = express.Router();

// POST /api/policy/evaluate - Interactive Policy Simulation
router.post('/evaluate', requireAuth, (req, res) => {
  try {
    const { student_id, company_id, target_ctc, target_role_type = 'F', target_category } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let company = null;
    if (company_id) {
      company = db.prepare('SELECT * FROM companies WHERE id = ?').get(company_id);
    }

    const existingOffers = db.prepare('SELECT * FROM offers WHERE student_id = ?').all(student_id);

    // Compute attendance statistics for student
    const unexcusedAbsences = db.prepare(`
      SELECT COUNT(*) as count
      FROM drive_attendance
      WHERE student_id = ? AND status = 'absent' AND emergency_exception_approved = 0
    `).get(student_id).count;

    const hasDisciplinaryFlag = db.prepare(`
      SELECT COUNT(*) as count
      FROM drive_attendance
      WHERE student_id = ? AND manual_review_status = 'disciplinary_review'
    `).get(student_id).count > 0;

    const targetDrive = {
      company_category: target_category || company?.category,
      package_ctc: target_ctc !== undefined ? Number(target_ctc) : (company ? 12.0 : 0),
      role_type: target_role_type,
      min_cgpa: company?.min_cgpa,
      allowed_programmes: company?.allowed_programmes ? JSON.parse(company.allowed_programmes) : []
    };

    const result = evaluatePlacementPolicy(
      student,
      existingOffers,
      targetDrive,
      {
        consecutive_unexcused_absences: unexcusedAbsences,
        has_pending_disciplinary_flag: hasDisciplinaryFlag
      }
    );

    // If decision is BLOCK or MANUAL_REVIEW, log candidate review record if requested
    if (req.body.record_review && company_id) {
      db.prepare(`
        INSERT INTO policy_reviews (student_id, company_id, proposed_drive_id, rule_applied, decision, reasons)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        student_id,
        company_id,
        req.body.drive_id || null,
        result.ruleId,
        result.decision,
        result.reasons.join('; ')
      );
    }

    res.json({
      evaluation: result,
      student: {
        id: student.id,
        placement_id: student.placement_id,
        full_name: student.full_name,
        programme: student.programme,
        cgpa: student.cgpa,
        registration_status: student.registration_status,
        academic_eligibility: student.academic_eligibility,
        placement_status: student.placement_status
      },
      targetCompany: company ? { id: company.id, name: company.name, category: company.category } : null,
      existingOffersCount: existingOffers.length,
      unexcusedAbsences
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/policy/reviews - List policy reviews and escalated cases
router.get('/reviews', requireAuth, (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT pr.*,
        s.full_name as student_name, s.placement_id, s.programme, s.academic_batch,
        c.name as company_name, c.category as company_category,
        rd.title as drive_title
      FROM policy_reviews pr
      JOIN students s ON pr.student_id = s.id
      JOIN companies c ON pr.company_id = c.id
      LEFT JOIN recruitment_drives rd ON pr.proposed_drive_id = rd.id
      ORDER BY pr.created_at DESC
    `).all();

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/policy/reviews/:id/override - Authorized Override Workflow
router.post('/reviews/:id/override', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const { override_reason } = req.body;
    if (!override_reason || override_reason.trim().length < 5) {
      return res.status(400).json({ error: 'A valid, detailed justification for the policy override is required.' });
    }

    const review = db.prepare('SELECT * FROM policy_reviews WHERE id = ?').get(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Policy review record not found' });
    }

    const actor = req.session.user.username;

    db.prepare(`
      UPDATE policy_reviews
      SET is_overridden = 1, override_by = ?, override_reason = ?, override_timestamp = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(actor, override_reason.trim(), req.params.id);

    logAudit({
      req,
      action: 'OVERRIDE_POLICY',
      entity: 'POLICY_REVIEW',
      entityId: req.params.id,
      details: {
        review_id: review.id,
        student_id: review.student_id,
        rule_applied: review.rule_applied,
        decision: review.decision,
        override_reason: override_reason.trim()
      }
    });

    res.json({
      message: 'Policy review decision successfully overridden by authorized placement officer.',
      override_by: actor,
      override_reason: override_reason.trim()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
